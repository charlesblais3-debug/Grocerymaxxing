// Recipe costing against the flyers of the stores the user selected.
//
// For each ingredient line: cheapest matching flyer price among the selected stores,
// otherwise the Statistics Canada average retail price for Québec, otherwise unpriced.
// Costs are prorated to the quantity the recipe uses (the Budget Bytes convention).
import { ING_BY_ID } from './ingredients.js';
import { formsCompatible, baseId } from './match.js';

/**
 * @param {object[]} flyerItems indexed flyer items ({ pg, store, from, to, fm, ... })
 * @param {Set<string>} stores selected store ids
 * @param {string} today ISO date; offers not valid on that day are ignored
 * @returns {Map<string, object[]>} ingredient id -> current offers, cheapest first
 */
export function bestOffers(flyerItems, stores, today, baseline = {}) {
  const all = new Map();
  const add = (key, o) => { if (!all.has(key)) all.set(key, []); all.get(key).push(o); };
  for (const it of flyerItems) {
    if (!it.pg || !stores.has(it.store)) continue;
    if (it.to && it.to.slice(0, 10) < today) continue;
    if (it.from && it.from.slice(0, 10) > today) continue;
    for (const [pk, perG] of Object.entries(it.pg)) {
      // Plausibility gate. Against a reference with real evidence (Statistics Canada, or
      // flyer prices seen at least 3 times), a price below 40 % of it is a misread size or
      // unit, and one above 2.5x is a different product. Such offers are not used.
      const ref = baseline[pk];
      const solid = ref && (ref.kind === 'statcan' || ref.kind == null || ref.n >= 3);
      if (solid && (perG < ref.perG * 0.4 || perG > ref.perG * 2.5)) continue;
      const id = baseId(pk);
      const o = { ...it, ing: id, pk, perG };
      add(pk, o);
      // "*group": every member's offers, for recipe lines that ask for the generic ("nuts").
      if (pk !== id) add('*' + id, o);
    }
  }
  for (const list of all.values()) list.sort((a, b) => a.perG - b.perG);
  return all;
}

/**
 * Cheapest offer for a price key whose product form suits the recipe line. A specific
 * member ("walnut") only takes offers for that member; a generic one takes any member's.
 */
export function pickOffer(offers, pk, lineForms) {
  const id = baseId(pk);
  const own = offers.get(pk) || [];
  const any = pk === id && ING_BY_ID[id]?.members.some((m) => m.generic) ? offers.get('*' + id) || [] : [];
  let best = null;
  for (const o of [...own, ...any]) {
    if ((!best || o.perG < best.perG) && formsCompatible(id, o.fm, lineForms)) best = o;
  }
  return best;
}

/** Cheapest current offer for an ingredient group, whatever the member (favourites, guide). */
export const bestFor = (offers, id) => pickOffer(offers, id, ALL_FORMS);
const ALL_FORMS = ['sliced', 'smoked', 'dried', 'cooked', 'breaded', 'seasoned', 'stuffed', 'ball', 'curds', 'spread', 'drink', 'canned'];

function lookup(pk, fm, offers, baseline, seen = 0) {
  const ing = ING_BY_ID[baseId(pk)];
  if (!ing) return null;
  const base = baseline[pk];
  if (base) {
    // A flyer can only LOWER the reference price, never create one: otherwise an ingredient
    // would be priced at the store that advertises it and free everywhere else. An offer
    // above the reference is not a deal (premium brand, small format) and is ignored.
    const offer = pickOffer(offers, pk, fm);
    if (offer && offer.perG <= base.perG) return { perG: offer.perG, src: 'flyer', offer, regular: base.perG };
    return { perG: base.perG, src: 'base', ref: base };
  }
  // Only a generic ingredient borrows another one's price ("poulet" -> chicken breast).
  if (ing.fb && pk === ing.id && seen < 2) {
    const r = lookup(ing.fb, fm, offers, baseline, seen + 1);
    if (r) return { ...r, via: baseId(ing.fb) };
  }
  return null;
}

/** "1 lb ground beef or turkey": the cheapest of the alternatives that can be priced. */
function lookupAlt(l, offers, baseline) {
  let best = null;
  for (const pk of l.alt || [l.pk || l.ing]) {
    const r = lookup(pk, l.fm, offers, baseline);
    if (r && (!best || r.perG < best.perG)) best = { ...r, pk };
  }
  return best;
}

/**
 * @returns {{ total:number|null, per:number|null, perKind:'meal'|'serving'|'unit'|null,
 *   priced:number, countable:number, deals:number, savings:number, coverage:number, lines:object[] }}
 */
export function costRecipe(recipe, offers, baseline, have) {
  let total = 0;
  let priced = 0;
  let countable = 0;
  let deals = 0;
  let savings = 0;
  let comparable = 0; // cost of the lines whose regular price is known
  const grams = recipe.ings.reduce((n, l) => n + (l.g && !ING_BY_ID[l.ing]?.free ? l.g : 0), 0);
  const missing = [];
  const lines = recipe.ings.map((l) => {
    const ing = l.ing ? ING_BY_ID[l.ing] : null;
    if (ing?.free) return { ...l, cost: 0, src: 'free' };
    // Already in the kitchen: nothing to buy for this line.
    if (have && l.ing && (have.has(l.ing) || have.has(l.via))) return { ...l, cost: 0, src: 'have' };
    const p = ing && l.g != null && !l.np ? lookupAlt(l, offers, baseline) : null;
    // Seasonings and "to taste" lines cost pennies and have no quantity to price:
    // they are shown as pantry items instead of dragging the coverage figure down.
    if (!p && ing && (ing.cat === 'spices' || l.nq)) return { ...l, cost: null, src: 'pantry' };
    countable++;
    if (!p) {
      // An unpriced protein, or an unpriced ingredient that is a big part of the dish,
      // makes the total meaningless: say so instead of showing a low price.
      if (ing && (ing.cat === 'meat' || ing.cat === 'fish' || (l.g != null && l.g >= 0.2 * grams))) missing.push(l.ing);
      return { ...l, cost: null, src: null };
    }
    const cost = l.g * p.perG;
    total += cost;
    priced++;
    let saved = 0;
    if (p.src === 'flyer') {
      deals++;
      if (p.regular && p.regular > p.perG) saved = l.g * (p.regular - p.perG);
      savings += saved;
      if (p.regular) comparable += cost;
    } else comparable += cost;
    return { ...l, pk: l.alt ? p.pk : l.pk, cost, src: p.src, offer: p.offer, via: p.via, saved, ref: p.ref };
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
    priced, countable, deals, savings, lines, missing,
    // Share saved against the regular price of the same basket.
    savingsPct: has && savings > 0 ? savings / (total + savings) : 0,
    // How much of the cost that percentage is based on (the rest has no known regular price).
    comparable: has && total > 0 ? comparable / total : 0,
    coverage: countable ? priced / countable : 0,
  };
}

/** A cost can be compared across recipes when most lines are priced and it is per meal/serving. */
export const complete = (c) => c.total != null && c.coverage >= 0.75 && !c.missing.length;
export const reliable = (c) => c.per != null && complete(c) && c.perKind !== 'unit';
