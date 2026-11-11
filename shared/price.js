// Turns a flyer price ("4,99 /lb", "2/5 $", "3,49 — 454 g") into dollars per gram of the
// matched ingredient so different stores and package sizes can be compared.
import { deaccent, parseQuantity } from './text.js';

const MIN = 0.0002; // $0.20/kg
const MAX = 0.25; // $250/kg — anything outside is a parsing error, not a deal

/**
 * @param {{price:number, pre?:string, post?:string, name?:string, desc?:string}} item
 * @param {object} ing canonical ingredient
 * @returns {{perG:number, basis:'weight'|'size'|'each'}|null}
 */
export function unitPrice(item, ing) {
  let p = Number(item.price);
  if (!isFinite(p) || p <= 0 || !ing) return null;
  const pre = deaccent(item.pre || '');
  const multi = pre.match(/(\d+)\s*(?:\/|pour|for)\s*$/);
  if (multi && +multi[1] > 1) p /= +multi[1];

  const post = deaccent(item.post || '');
  let perG = null;
  let basis = null;
  if (/100\s*g/.test(post)) { perG = p / 100; basis = 'weight'; }
  else if (/\bkg\b/.test(post)) { perG = p / 1000; basis = 'weight'; }
  else if (/\blb\b|livre/.test(post)) { perG = p / 453.6; basis = 'weight'; }
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
  if (perG == null || perG < MIN || perG > MAX) return null;
  return { perG, basis };
}
