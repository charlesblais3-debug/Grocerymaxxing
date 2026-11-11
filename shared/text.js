// Text normalisation + quantity parsing shared by the build scripts and the web app.
// Handles French (Québec) and English ingredient lines.

const STOP = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'au', 'aux', 'en', 'et', 'ou', 'a',
  'of', 'the', 'an', 'and', 'or', 'in', 'with', 'avec', 'pour', 'for', 'd', 'l',
]);

export function deaccent(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Light FR/EN singulariser so "oeufs", "poireaux", "tomatoes", "radishes" line up. */
export function stem(tok) {
  if (tok.length <= 3) return tok;
  let t = tok;
  if (t.endsWith('ies') && t.length > 4) t = t.slice(0, -3) + 'y';
  else if (t.endsWith('eaux')) t = t.slice(0, -1);
  else if (t.endsWith('ss')) return t;
  else if (t.endsWith('s') || (t.endsWith('x') && t.length > 4)) t = t.slice(0, -1);
  // "tranche(s)" / "radish(es)" / "tomato(es)": drop the mute final e on longer words.
  if (t.length > 4 && t.endsWith('e')) t = t.slice(0, -1);
  return t;
}

/** Tokens used for matching: de-accented, stop words removed, singularised. */
export function tokens(s) {
  return deaccent(s)
    .replace(/\ben des\b/g, 'endes') // "tomates en dés": "dés" would otherwise read as the stop word "des"
    .replace(/[^a-z0-9%]+/g, ' ')
    .split(' ')
    .filter((t) => t && !STOP.has(t))
    .map(stem);
}

const FRACTIONS = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6' };

// Unit table: [regex source, kind, factor]. kind g = grams, ml = millilitres, n = count.
// Order matters: longer / more specific first.
const UNITS = [
  ['kilogrammes?|kilograms?|kilos?|kg', 'g', 1000],
  ['milligrammes?|mg', 'g', 0.001],
  ['grammes?|grams?|gr|g', 'g', 1],
  ['livres?|pounds?|lbs?', 'g', 453.6],
  ['fl\\.?\\s*oz\\.?|fluid\\s+ounces?|onces?\\s+liquides?', 'ml', 29.57],
  ['onces?|ounces?|oz', 'g', 28.35],
  ['millilitres?|milliliters?|ml', 'ml', 1],
  ['centilitres?|cl', 'ml', 10],
  ['litres?|liters?|l', 'ml', 1000],
  ['tasses?|t\\.', 'ml', 250],
  ['cups?', 'ml', 237],
  ['pintes?|quarts?|qt', 'ml', 946],
  ['c\\.?\\s*a\\s*(?:soupe|table|s\\.?)(?![a-z])|cuill?eres?\\s*a\\s*(?:soupe|table)|cuil\\.?\\s*a\\s*(?:soupe|table)|tablespoons?|tbsps?\\.?|tbs\\.?', 'ml', 15],
  ['c\\.?\\s*a\\s*(?:the|cafe|t\\.?|c\\.?)(?![a-z])|cuill?eres?\\s*a\\s*(?:the|cafe)|cuil\\.?\\s*a\\s*(?:the|cafe)|teaspoons?|tsps?\\.?', 'ml', 5],
  ['pincees?|pinch(?:es)?|dash(?:es)?|soupcons?', 'g', 0.3],
  ['gousses?|cloves?', 'n', 'gousse'],
  ['tranches?|slices?|rashers?|strips?|lanieres?', 'n', 'tranche'],
  ['branches?|tiges?|stalks?|ribs?|sprigs?|brins?', 'n', 'branche'],
  ['douzaines?|dozens?', 'n', 'douzaine'],
  ['feuilles?|leaf|leaves', 'n', 'feuille'],
  ['tetes?|heads?|pieds?|pommes? de', 'n', 'tete'],
  ['bottes?|bouquets?|bunch(?:es)?', 'n', 'botte'],
  ['poignees?|handfuls?', 'n', 'poignee'],
  ['filets?|fillets?|paves?', 'n', 'filet'],
];
const UNIT_RE = UNITS.map(([src, kind, f]) => ({ re: new RegExp('^(?:' + src + ')(?![a-z])'), kind, f }));
// Count units may sit a word or two after the number: "6 thick slices", "3 grosses gousses".
const LOOSE_RE = UNITS.filter((u) => u[1] === 'n').map(([src, kind, f]) => ({ re: new RegExp('^(?:[a-z]+\\s+){1,2}(?:' + src + ')(?![a-z])'), kind, f }));
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: '1/2', un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, demi: '1/2', demie: '1/2' };
const NUM_RE = /(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)/g;
const CONTAINER_RE = /\b(boites?|conserves?|cans?|tins?|paquets?|packages?|pkgs?|packs?|sacs?|sachets?|bags?|bouteilles?|bottles?|pots?|jars?|contenants?|containers?|briques?|cartons?|barquettes?)\b/;

function toNumber(str) {
  const s = str.trim().replace(',', '.');
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return +frac[1] / +frac[2];
  return parseFloat(s);
}

/**
 * Parse every "number [unit]" in an ingredient line or product label.
 * Returns { g, ml, count, countUnit } using the most reliable measure found
 * (metric weight > metric volume > imperial weight > cups/spoons > bare count).
 */
export function parseQuantity(raw) {
  let s = deaccent(raw).replace(/\(\s*\$\s*[\d.,]+\s*\*?\s*\)/g, ' '); // source cost notes like "($0.75)"
  for (const [k, v] of Object.entries(FRACTIONS)) s = s.replaceAll(k, ' ' + v);
  s = s.replace(/^\s*([a-z]+)\b(?!\s+peu\b)/, (m, w) => (WORDS[w] != null ? String(WORDS[w]) : m)); // "one 14-ounce can", "une gousse"
  s = s.replace(/(\d)\s*(?:-|–|—|\ba\b|\bto\b|\bou\b|\bor\b)\s*(\d)/g, '$1 ~ $2'); // ranges: keep the first bound
  s = s.replace(/(\d)\s+(?:scant|heaping|heaped|generous|level|rounded|packed|large|small|medium|big|bonnes?|gross?e?s?|petite?s?|healthy)\s+/g, '$1 ');
  const found = [];
  let m;
  NUM_RE.lastIndex = 0;
  while ((m = NUM_RE.exec(s))) {
    const upper = s.slice(Math.max(0, m.index - 2), m.index).includes('~');
    const qty = toNumber(m[1]);
    if (!isFinite(qty) || qty <= 0) continue;
    const rest = s.slice(m.index + m[1].length).replace(/^[\s-]+/, '');
    let unit = null;
    for (const u of UNIT_RE) {
      if (u.re.test(rest)) { unit = u; break; }
    }
    if (!unit) for (const u of LOOSE_RE) if (u.re.test(rest)) { unit = u; break; }
    if (upper) { // "3/4 to 1 cup": the unit belongs to the lower bound too
      const prev = found[found.length - 1];
      if (prev && !prev.unit && unit) prev.unit = unit;
      continue;
    }
    found.push({ qty, unit, pos: m.index, rest });
  }
  if (!found.length) return { g: null, ml: null, count: null, countUnit: null, none: true };

  const rank = (f) => {
    if (!f.unit) return 0;
    if (f.unit.kind === 'n') return 1;
    if (f.unit.kind === 'ml' && [250, 237, 15, 5, 946].includes(f.unit.f)) return 2;
    if (f.unit.kind === 'g' && [453.6, 28.35].includes(f.unit.f)) return 3;
    if (f.unit.kind === 'ml') return 4;
    return 5;
  };
  const best = found.reduce((a, b) => (rank(b) > rank(a) ? b : a));
  const first = found[0];
  // "2 boîtes de 398 ml", "2 (15 oz) cans": leading bare count multiplies the package size.
  let mult = 1;
  if (best !== first && !first.unit && rank(best) >= 3 && CONTAINER_RE.test(s) && first.qty <= 24) mult = first.qty;
  // "4 x 100 g" / "900 g (2x450 g)": a multipack; never multiply a total that is already printed.
  const times = s.match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/);
  let pack = null;
  if (times) {
    const f = { kg: 1000, g: 1, ml: 1, l: 1000 }[times[3]];
    pack = { kind: times[3] === 'ml' || times[3] === 'l' ? 'ml' : 'g', v: +times[1] * parseFloat(times[2].replace(',', '.')) * f };
  }

  const out = { g: null, ml: null, count: null, countUnit: null };
  if (!best.unit) { out.count = best.qty; return out; }
  if (best.unit.kind === 'g') out.g = best.qty * best.unit.f * mult;
  else if (best.unit.kind === 'ml') out.ml = best.qty * best.unit.f * mult;
  else { out.count = best.qty; out.countUnit = best.unit.f; }
  if (pack && rank(best) >= 4) {
    if (pack.kind === 'g') { out.g = Math.max(out.g ?? 0, pack.v); out.ml = null; } else if (out.g == null) out.ml = Math.max(out.ml ?? 0, pack.v);
  }
  return out;
}
