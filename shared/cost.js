// Recipe costing against the flyers of the stores the user selected.
//
// For each ingredient line: cheapest matching flyer price among the selected stores,
// otherwise the Statistics Canada average retail price for Québec, otherwise unpriced.
// Costs are prorated to the quantity the recipe uses (the Budget Bytes convention).
import { ING_BY_ID } from './ingredients.js';
import { formsCompatible } from './match.js';

/**
 * @param {object[]} flyerItems indexed flyer items ({ pg, store, from, to, fm, ... })
 * @param {Set<string>} stores selected store ids
 * @param {string} today ISO date; offers not valid on that day are ignored
 * @returns {Map<string, object[]>} ingredient id -> current offers, cheapest first
 */
export function bestOffers(flyerItems, stores, today, baseline = {}) {
  const all = new Map();
  for (const it of flyerItems) {
    if (!it.pg || !stores.has(it.store)) continue;
    if (it.to && it.to.slice(0, 10) < today) continue;
    if (it.from && it.from.slice(0, 10) > today) continue;
    for (const [ing, perG] of Object.entries(it.pg)) {
      // A "deal" at more than 2.5x the regular price is a mismatched product, not a deal.
      if (baseline[ing] && perG > baseline[ing].perG * 2.5) continue;
      // ...and one at less than a third of the regular price is a misread size or unit.
      if (baseline[ing] && perG < baseline[ing].perG * 0.33) continue;
      if (!all.has(ing)) all.set(ing, []);
      all.get(ing).push({ ...it, ing, perG });
    }
  }
  for (const list of all.values()) list.sort((a, b) => a.perG - b.perG);
  return all;
}

/** Cheapest offer for an ingredient whose product form suits the recipe line. */
export function pickOffer(offers, id, lineForms) {
  const list = offers.get(id);
  if (!list) return null;
  return list.find((o) => formsCompatible(id, o.fm, lineForms)) || null;
}

function lookup(id, fm, offers, baseline, seen = 0) {
  const ing = ING_BY_ID[id];
  if (!ing) return null;
  const offer = pickOffer(offers, id, fm);
  const base = baseline[id];
  if (offer) return { perG: offer.perG, src: 'flyer', offer, base };
  if (base) return { perG: base.perG, src: 'base', base };
  if (ing.fb && seen < 2) {
    const r = lookup(ing.fb, fm, offers, baseline, seen + 1);
    if (r) return { ...r, via: ing.fb };
  }
  return null;
}

/**
 * @returns {{ total:number|null, per:number|null, perKind:'meal'|'serving'|'unit'|null,
 *   priced:number, countable:number, deals:number, savings:number, coverage:number, lines:object[] }}
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
    const p = ing && l.g != null ? lookup(l.ing, l.fm, offers, baseline) : null;
    // Seasonings and "to taste" lines cost pennies and have no quantity to price:
    // they are shown as pantry items instead of dragging the coverage figure down.
    if (!p && ing && (ing.cat === 'spices' || l.nq)) return { ...l, cost: null, src: 'pantry' };
    countable++;
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
  const has = priced > 0;
  // Cost is quoted per meal for meal dishes (see build-index: `meals`), otherwise per
  // serving as published, or per unit when the yield is "12 muffins".
  const div = recipe.meals || recipe.servings || null;
  const perKind = !has || !div ? null : recipe.meals ? 'meal' : recipe.unitYield ? 'unit' : 'serving';
  return {
    total: has ? total : null,
    per: perKind ? total / div : null,
    perKind,
    priced, countable, deals, savings, lines,
    coverage: countable ? priced / countable : 0,
  };
}

/** A cost can be compared across recipes when most lines are priced and it is per meal/serving. */
export const reliable = (c) => c.per != null && c.coverage >= 0.75 && c.perKind !== 'unit';
