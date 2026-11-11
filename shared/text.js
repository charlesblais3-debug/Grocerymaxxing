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

/** Light FR/EN singulariser so "oeufs", "poireaux", "tomatoes", "berries" line up. */
export function stem(tok) {
  if (tok.length <= 3) return tok;
  if (tok.endsWith('ies') && tok.length > 4) return tok.slice(0, -3) + 'y';
  if (tok.endsWith('oes')) return tok.slice(0, -2);
  if (tok.endsWith('ves') && tok.length > 5) return tok.slice(0, -3) + 'f';
  if (tok.endsWith('eaux')) return tok.slice(0, -1);
  if (tok.endsWith('ss')) return tok;
  if (tok.endsWith('s') || tok.endsWith('x')) return tok.slice(0, -1);
  return tok;
}

/** Tokens used for matching: de-accented, stop words removed, singularised. */
export function tokens(s) {
  return deaccent(s)
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
  ['tranches?|slices?', 'n', 'tranche'],
  ['branches?|tiges?|stalks?|ribs?|sprigs?|brins?', 'n', 'branche'],
  ['douzaines?|dozens?', 'n', 'douzaine'],
];
const UNIT_RE = UNITS.map(([src, kind, f]) => ({ re: new RegExp('^(?:' + src + ')(?![a-z])'), kind, f }));
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
  let s = deaccent(raw);
  for (const [k, v] of Object.entries(FRACTIONS)) s = s.replaceAll(k, ' ' + v);
  s = s.replace(/(\d)\s*(?:-|–|—|\ba\b|\bto\b)\s*(\d)/g, '$1 ~ $2'); // ranges: keep the first bound
  const found = [];
  let m;
  NUM_RE.lastIndex = 0;
  while ((m = NUM_RE.exec(s))) {
    if (s[m.index - 1] === '~' || s.slice(Math.max(0, m.index - 2), m.index) === '~ ') continue;
    const qty = toNumber(m[1]);
    if (!isFinite(qty) || qty <= 0) continue;
    const rest = s.slice(m.index + m[1].length).replace(/^\s+/, '');
    let unit = null;
    for (const u of UNIT_RE) {
      if (u.re.test(rest)) { unit = u; break; }
    }
    found.push({ qty, unit, pos: m.index, rest });
  }
  if (!found.length) return { g: null, ml: null, count: null, countUnit: null };

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
  // "4 x 100 g"
  const times = s.match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(g|ml|l|kg)\b/);
  if (times && rank(best) >= 4) mult = +times[1];

  const out = { g: null, ml: null, count: null, countUnit: null };
  if (!best.unit) { out.count = best.qty; return out; }
  if (best.unit.kind === 'g') out.g = best.qty * best.unit.f * mult;
  else if (best.unit.kind === 'ml') out.ml = best.qty * best.unit.f * mult;
  else { out.count = best.qty; out.countUnit = best.unit.f; }
  return out;
}
