// Recipe costing against the flyers of the stores the user selected.
//
// For each ingredient line: cheapest matching flyer price among the selected stores,
// otherwise the Statistics Canada average retail price for Québec, otherwise unpriced.
// Costs are prorated to the quantity the recipe uses (the Budget Bytes convention).
import { ING_BY_ID } from './ingredients.js';

/**
 * @param {object[]} flyerItems indexed flyer items ({ ing, perG, store, to, ... })
 * @param {Set<string>} stores selected store ids
 * @param {string} today ISO date, offers that ended before it are ignored
 * @returns {Map<string, object>} ingredient id -> cheapest current offer
 */
export function bestOffers(flyerItems, stores, today) {
  const best = new Map();
  for (const it of flyerItems) {
    if (!it.ing || it.perG == null || !stores.has(it.store)) continue;
    if (it.to && it.to.slice(0, 10) < today) continue;
    if (it.from && it.from.slice(0, 10) > today) continue;
    const cur = best.get(it.ing);
    if (!cur || it.perG < cur.perG) best.set(it.ing, it);
  }
  return best;
}

function lookup(id, offers, baseline, seen = 0) {
  const ing = ING_BY_ID[id];
  if (!ing) return null;
  const offer = offers.get(id);
  const base = baseline[id];
  if (offer) return { perG: offer.perG, src: 'flyer', offer, base };
  if (base) return { perG: base.perG, src: 'base', base };
  if (ing.fb && seen < 2) {
    const r = lookup(ing.fb, offers, baseline, seen + 1);
    if (r) return { ...r, via: ing.fb };
  }
  return null;
}

/**
 * @returns {{ total:number|null, perServing:number|null, priced:number, countable:number,
 *   deals:number, savings:number, lines:object[] }}
 */
export function costRecipe(recipe, offers, baseline) {
  let total = 0;
  let priced = 0;
  let countable = 0;
  let deals = 0;
  let savings = 0;
  const lines = recipe.ings.map((l) => {
    const ing = l.ing ? ING_BY_ID[l.ing] : null;
    if (ing?.free) return { ...l, cost: 0, src: 'free' };
    countable++;
    if (!ing || l.g == null) return { ...l, cost: null, src: null };
    const p = lookup(l.ing, offers, baseline);
    if (!p) return { ...l, cost: null, src: null };
    const cost = l.g * p.perG;
    total += cost;
    priced++;
    let saved = 0;
    if (p.src === 'flyer') {
      deals++;
      if (p.base && p.base.perG > p.perG) saved = l.g * (p.base.perG - p.perG);
      savings += saved;
    }
    return { ...l, cost, src: p.src, offer: p.offer, via: p.via, saved };
  });
  const servings = recipe.servings || null;
  const has = priced > 0;
  return {
    total: has ? total : null,
    perServing: has && servings ? total / servings : null,
    priced, countable, deals, savings, lines,
    coverage: countable ? priced / countable : 0,
  };
}
