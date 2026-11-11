// Turns a flyer price ("4,99 /lb", "2/5 $", "3,49 — 454 g") into dollars per gram of the
// matched ingredient so different stores and package sizes can be compared.
import { deaccent, parseQuantity } from './text.js';

const MIN = 0.0002; // $0.20/kg
// Ceiling in $/kg per aisle: above it the "match" is a different product (sea cucumber,
// saffron-priced anything) or a parsing error, so it must not be used to cost a recipe.
const CEIL = { produce: 45, meat: 75, fish: 95, dairy: 65, bakery: 35, pantry: 60, frozen: 30, spices: 300, other: 60 };
const HERBS = new Set(['parsley', 'cilantro', 'basil', 'dill', 'mint', 'chives', 'thyme', 'rosemary', 'vanilla', 'yeast', 'walnuts', 'almonds', 'seeds', 'parmesan', 'prosciutto', 'salmon_smoked', 'scallop', 'chocolate']);
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

export function unitPrice(item, ing) {
  let p = Number(item.price);
  if (!isFinite(p) || p <= 0 || !ing) return null;
  const pre = deaccent(item.pre || '');
  const multi = pre.match(/(\d+)\s*(?:\/|pour|for)\s*$/);
  if (multi && +multi[1] > 1) p /= +multi[1];

  const post = deaccent(item.post || '');
  let perG = null;
  let basis = null;
  // Flyers print e.g. "/lb 19,82$/kg" or "/100 g 14,47$/lb": the first unit is the one the price is in.
  const unit = post.match(/100\s*g|\bkg\b|\blbs?\b|livre/);
  if (unit && /100/.test(unit[0])) { perG = p / 100; basis = 'weight'; }
  else if (unit && unit[0] === 'kg') { perG = p / 1000; basis = 'weight'; }
  else if (unit) { perG = p / 453.6; basis = 'weight'; }
  else {
    const q = parseQuantity(`${item.name || ''} ${item.desc || ''} ${item.post || ''}`);
    if (q.g != null && q.g >= 20) { perG = p / q.g; basis = 'size'; }
    else if (q.ml != null && q.ml >= 20) { perG = p / (q.ml * (ing.d || 1)); basis = 'size'; }
    else if (ing.u) {
      // Sold "each": estimate with the typical unit weight (and pack count for eggs, buns…).
      let n = ing.pk || 1;
      if (q.count != null && (q.countUnit === 'douzaine')) n = q.count * 12;
      else if (ing.pk && q.count != null && !q.countUnit && q.count >= 2 && q.count <= 60) n = q.count;
      perG = p / (ing.u * n);
      basis = 'each';
    }
  }
  if (perG == null || perG < MIN || perG > ceiling(ing)) return null;
  return { perG, basis };
}
