// Turns a flyer price ("4,99 /lb", "2/5 $", "3,49 — 454 g") into dollars per gram of the
// matched ingredient so different stores and package sizes can be compared.
import { deaccent, parseQuantity } from './text.js';

const MIN = 0.0002; // $0.20/kg
// Ceiling in $/kg per aisle: above it the "match" is a different product (sea cucumber,
// saffron-priced anything) or a parsing error, so it must not be used to cost a recipe.
const CEIL = { produce: 45, meat: 75, fish: 95, dairy: 65, bakery: 35, pantry: 60, frozen: 30, spices: 300, other: 60 };
// Expensive by nature (herbs by the gram, nuts, imported cheeses): a higher ceiling.
const HERBS = new Set(['swiss', 'blue_cheese', 'goat_cheese', 'brie', 'parsley', 'cilantro', 'basil', 'dill', 'mint', 'chives', 'thyme', 'rosemary', 'vanilla', 'yeast', 'walnuts', 'almonds', 'seeds', 'parmesan', 'prosciutto', 'salmon_smoked', 'scallop', 'chocolate']);
export const ceiling = (ing) => (HERBS.has(ing.id) ? 160 : CEIL[ing.cat] ?? 60) / 1000;

/**
 * @param {{price:number, pre?:string, post?:string, name?:string, desc?:string}} item
 * @param {object} ing canonical ingredient
 * @returns {{perG:number, basis:'weight'|'size'|'each'}|null}
 */
/**
 * How much dearer the regular price is than the flyer price, when the flyer says so itself
 * ("was 6,99", "2 $ d'économie", "43 % d'économie"). Vague claims ("jusqu'à…") are ignored.
 * @returns {number|null} regular / sale ratio, e.g. 1.4
 */
export function regularRatio(item) {
  const price = Number(item.price);
  if (!(price > 0)) return null;
  let r = null;
  if (item.was > price) r = item.was / price;
  const s = deaccent(item.story || '');
  if (!r && s && !/jusqu|up to|points/.test(s)) {
    const pct = s.match(/(\d{1,2})\s*%/);
    const amt = s.match(/(\d+(?:[.,]\d+)?)\s*\$|\$\s*(\d+(?:[.,]\d+)?)/);
    const cents = s.match(/(\d{1,2})\s*(?:¢|c\b)/);
    if (/econom|save|rabais|off/.test(s)) {
      if (pct) r = 1 / (1 - +pct[1] / 100);
      else if (amt) r = (price + parseFloat((amt[1] || amt[2]).replace(',', '.'))) / price;
      else if (cents) r = (price + +cents[1] / 100) / price;
    }
  }
  return r && r > 1.02 && r < 4 ? +r.toFixed(3) : null;
}

// ---- Package size, read strictly -------------------------------------------------------
// Flyer labels: "900 g (2x450 g)", "375/450 G", "125-200 G", "710-890 mL", "SAC DE 5 LB",
// "4 UN.", "12x355 mL". A range is only accepted when its ends are within 35 % of each other
// (then its middle is used); several different sizes in one label are ambiguous.
const SZ = { kg: ['g', 1000], kilogram: ['g', 1000], kilograms: ['g', 1000], kilogramme: ['g', 1000], kilogrammes: ['g', 1000], g: ['g', 1], gr: ['g', 1], gram: ['g', 1], grams: ['g', 1], gramme: ['g', 1], grammes: ['g', 1], lb: ['g', 453.6], lbs: ['g', 453.6], oz: ['g', 28.35], ml: ['ml', 1], millilitre: ['ml', 1], millilitres: ['ml', 1], milliliter: ['ml', 1], milliliters: ['ml', 1], l: ['ml', 1000], litre: ['ml', 1000], litres: ['ml', 1000], liter: ['ml', 1000], liters: ['ml', 1000] };
const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const UNIT = String.raw`(kilogrammes|kilogramme|kilograms|kilogram|kg|grammes|gramme|grams|gram|gr|g|lbs|lb|oz|millilitres|millilitre|milliliters|milliliter|ml|litres|litre|liters|liter|l)(?![a-z])`;
const num = (x) => parseFloat(String(x).replace(',', '.'));

/** @returns {{kind:'g'|'ml', v:number}|{ambiguous:true}|null} */
export function packageSize(text) {
  const t = deaccent(text).replace(/(\d)\s*%/g, ' ');
  const found = [];
  const multi = [...t.matchAll(new RegExp(String.raw`(\d+)\s*x\s*` + NUM + String.raw`\s*` + UNIT, 'g'))];
  for (const m of multi) {
    const [kind, f] = SZ[m[3]];
    found.push({ kind, lo: +m[1] * num(m[2]) * f, hi: +m[1] * num(m[2]) * f, multi: true, at: m.index, end: m.index + m[0].length });
  }
  const re = new RegExp(NUM + String.raw`(?:\s*(?:-|–|/|a|to|ou)\s*` + NUM + String.raw`)?\s*` + UNIT, 'g');
  for (const m of t.matchAll(re)) {
    if (found.some((f) => m.index >= f.at && m.index < f.end)) continue; // part of "2x450 g"
    if (/x\s*$/.test(t.slice(0, m.index))) continue;
    const [kind, f] = SZ[m[3]];
    const a = num(m[1]) * f;
    const b = m[2] ? num(m[2]) * f : a;
    found.push({ kind, lo: Math.min(a, b), hi: Math.max(a, b) });
  }
  if (!found.length) return null;
  // "900 g (2x450 g)": the total and the multipack agree — keep one.
  const sizes = [];
  for (const f of found) if (!sizes.some((s) => s.kind === f.kind && Math.abs(s.lo - f.lo) / s.lo < 0.12 && Math.abs(s.hi - f.hi) / s.hi < 0.12)) sizes.push(f);
  if (sizes.length !== 1) return { ambiguous: true };
  const s = sizes[0];
  if (s.hi / s.lo > 1.35) return { ambiguous: true };
  return { kind: s.kind, v: (s.lo + s.hi) / 2 };
}

/** Number of pieces in a pack: "4 UN.", "paquet de 6", "1 douzaine", "30 oeufs". */
export function packCount(text) {
  const t = deaccent(text);
  if (/\bdouzaine|\bdozen/.test(t)) { const m = t.match(/(\d+)\s*douzaines?|(\d+)\s*dozens?/); return 12 * (m ? +(m[1] || m[2]) : 1); }
  const m = t.match(/(\d+)\s*(?:un\.?|unites?|units?|ct|pqt|pk|morceaux|pieces?|pcs?|oeufs|eggs|count)(?![a-z])/) || t.match(/\b(?:paquet|sac|caisse|boite|pack|bag|emballage|filet)\s+de\s+(\d+)(?!\s*(?:[.,]\d)?\s*(?:kg|g|lb|ml|l|oz)\b)/);
  return m ? +m[1] : null;
}

// Ingredients a flyer may price per piece ("ch.") — produce that is really sold one at a
// time. Anything else needs a weight or a size: a "6 $" pack of chicken or bag of onions
// says nothing about how much food it is.
const EACH_OK = new Set(['leek', 'buns', 'avocado', 'mango', 'cucumber', 'lettuce', 'cauliflower', 'broccoli', 'cabbage', 'melon', 'pineapple', 'squash', 'celery', 'eggplant', 'fennel', 'bell_pepper', 'lemon', 'lime', 'grapefruit', 'chives', 'parsley', 'cilantro', 'dill', 'mint', 'basil', 'green_onion', 'kale', 'bok_choy', 'corn', 'garlic', 'radish', 'asparagus', 'egg', 'zucchini', 'kiwi', 'pomegranate']);
// Sold by the bunch or the dozen: a plural name ("oignons verts") is still one unit.
export const BUNCH = new Set(['egg', 'green_onion', 'radish', 'parsley', 'cilantro', 'dill', 'mint', 'basil', 'asparagus', 'kale', 'chives']);
const PACKED = /\b(sac|bag|paquet|pack|emballage|caisse|barquette|contenant|boite|filet|lb|lbs|kg|bte|panier|basket|clamshell|format)\b/;

/**
 * Price per gram of `ing` from a flyer item, or null when it cannot be read reliably.
 * @param {string} [segment] the part of the label that names this ingredient
 */
export function unitPrice(item, ing, segment) {
  let p = Number(item.price);
  if (!isFinite(p) || p <= 0 || !ing) return null;
  const pre = deaccent(item.pre || '');
  const post = deaccent(item.post || '');
  // "À partir de 4,99": the cheapest of several products — not a price for this one.
  if (/partir|starting|from\b/.test(pre + ' ' + post)) return null;
  // Multi-buy: "2/ … ou 3,99 ch." — buying one costs 3,99; otherwise split the bundle.
  const multi = pre.match(/(\d+)\s*(?:\/|pour|for)\s*$/);
  const single = post.match(/ou\s*(\d+(?:[.,]\d+)?)\s*\$?\s*(?:ch\b|chq|chacun|l'?unite|l unite|each|ea\b)/);
  if (single) p = num(single[1]);
  else if (multi && +multi[1] > 1) p /= +multi[1];

  let perG = null;
  let basis = null;
  const unit = post.replace(/\d+[.,]\d+\s*\$\s*\/\s*kg.*/, '').match(/100\s*g|\bkg\b|\blbs?\b|livre/);
  if (unit && /100/.test(unit[0])) { perG = p / 100; basis = 'weight'; }
  else if (unit && unit[0] === 'kg') { perG = p / 1000; basis = 'weight'; }
  else if (unit) { perG = p / 453.6; basis = 'weight'; }
  else {
    // The size printed next to this product, else in the whole label.
    let size = segment ? packageSize(segment) : null;
    if (!size || size.ambiguous) size = packageSize(`${item.name || ''} ${item.desc || ''}`);
    if (size?.ambiguous) return null;
    if (size && size.v >= 20) {
      perG = size.kind === 'g' ? p / size.v : ing.d ? p / (size.v * ing.d) : null;
      basis = 'size';
    } else if (!size) {
      if (!EACH_OK.has(ing.id)) return null;
      const label = `${segment || item.name || ''} ${item.desc || ''}`;
      const count = packCount(label);
      if (!count && PACKED.test(deaccent(label))) return null; // a bag of unknown size
      // "AVOCATS HASS 6 $" is a bag: a plural name needs an explicit per-piece price.
      const head = deaccent(label).trim().split(/[\s,|]+/)[0] || '';
      const perPiece = /\b(ch|chq|chacun|each|ea|l'?unite|unite|un)\b\.?/.test(post);
      // …unless the ingredient is sold in a usual pack ("poireaux" = 3 leeks, "pains à hamburger" = 8).
      const plural = !count && !perPiece && !BUNCH.has(ing.id) && head.length > 3 && /[sx]$/.test(head);
      if (plural && !ing.pk) return null;
      const n = count || (ing.id === 'egg' ? 12 : plural ? ing.pk : 1);
      perG = p / ((ing.su ?? ing.u) * n);
      basis = 'each';
    }
  }
  if (perG == null || perG < MIN || perG > ceiling(ing)) return null;
  return { perG, basis };
}
