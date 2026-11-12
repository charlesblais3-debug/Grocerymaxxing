// "Which store for what this week": compares the flyers of every store in the region and
// says where each store has the best price, so someone who shops at one store can pick it.
import { ING_BY_ID } from './ingredients.js';
import { anchorKind } from './synergy.js';
import { baseId } from './match.js';

// Everyday basics worth comparing even though they are too common to plan a week around.
const BASICS = new Set(['egg', 'milk', 'butter', 'potato', 'carrot', 'onion', 'tomato', 'bread', 'pasta', 'rice']);
const WEIGHT = { protein: 3, cheese: 2, produce: 1.5, basic: 1 };
export const GROUPS = { meat: 'meat', fish: 'meat', produce: 'produce', frozen: 'produce', dairy: 'dairy', bakery: 'pantry', pantry: 'pantry' };

/**
 * @param {Map<string, object[]>} allOffers bestOffers() over every store of the region
 * @param {object} baseline regular prices
 * @param {string[]} storeIds stores of the region
 * @returns {object[]} one entry per store, strongest first:
 *   { id, score, deals, wins: [{ ing, kind, offer, margin, off, only }], strong: group|null }
 */
export function storeGuide(allOffers, baseline, storeIds) {
  const out = new Map(storeIds.map((id) => [id, { id, score: 0, deals: 0, wins: [], groups: {} }]));
  for (const [pk, list] of allOffers) {
    if (pk.startsWith('*')) continue;
    const ing = baseId(pk);
    const def = ING_BY_ID[ing];
    const kind = anchorKind(ing) || (BASICS.has(ing) ? 'basic' : null);
    // Plain products only: a sliced or seasoned version winning on price says nothing useful.
    const plain = list.filter((o) => !o.fm?.length);
    for (const id of new Set(plain.map((o) => o.store))) if (out.has(id)) out.get(id).deals++;
    if (!def || !kind || !plain.length) continue;
    const best = plain[0];
    const store = out.get(best.store);
    if (!store) continue;
    const other = plain.find((o) => o.store !== best.store);
    const margin = other ? 1 - best.perG / other.perG : null;
    const base = baseline[pk]?.perG ?? (best.rr ? best.perG * Math.min(best.rr, 2) : null);
    const off = base && base > best.perG ? 1 - best.perG / base : null;
    // A win must be clear: at least 8 % cheaper than the next store, or the only flyer with
    // it at a real discount.
    if (other ? margin < 0.08 : !(off >= 0.1)) continue;
    const weight = WEIGHT[kind] * (1 + (off || 0) + (margin || 0));
    store.wins.push({ ing, pk, kind, offer: best, margin, off, only: !other, weight });
    store.score += weight;
    const g = GROUPS[def.cat] || 'pantry';
    store.groups[g] = (store.groups[g] || 0) + weight;
  }
  return [...out.values()].map((s) => {
    s.wins.sort((a, b) => b.weight - a.weight);
    // The headline describes what the reader actually sees: the group behind at least two
    // of the four leading wins.
    const seen = {};
    for (const w of s.wins.slice(0, 4)) { const g = GROUPS[ING_BY_ID[w.ing].cat] || 'pantry'; seen[g] = (seen[g] || 0) + 1; }
    const top = Object.entries(seen).sort((a, b) => b[1] - a[1])[0];
    return { id: s.id, score: s.score, deals: s.deals, wins: s.wins, strong: top && top[1] >= 2 ? top[0] : null };
  }).sort((a, b) => b.score - a.score);
}
