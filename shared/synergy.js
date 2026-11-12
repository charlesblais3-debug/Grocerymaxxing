// "Idées de la semaine": bundles of different recipes built around what is on sale at the
// selected stores, so one big deal (a family pack of chicken, a bag of peppers) is reused
// across several meals without eating the same dish all week.
import { ING_BY_ID } from './ingredients.js';
import { isMealDish } from './taxonomy.js';

// Ingredients worth planning a week around: proteins, vegetables, fruit, cheese.
// Staples that are in almost every recipe (onion, garlic, butter, milk, eggs, herbs, lemon,
// stock, oil, spices) would link everything to everything and are left out.
const STAPLES = new Set(['onion', 'garlic', 'ginger', 'green_onion', 'shallot', 'lemon', 'lime', 'butter', 'margarine', 'milk', 'egg', 'cream_35', 'cream_10', 'parsley', 'cilantro', 'basil', 'dill', 'mint', 'chives', 'thyme', 'rosemary', 'hot_pepper', 'orange_juice', 'soy_milk', 'tomato', 'potato', 'carrot', 'celery', 'bacon', 'prosciutto', 'pepperoni']);
const CHEESE = new Set(['cheddar', 'mozzarella', 'bocconcini', 'parmesan', 'feta', 'swiss', 'brie', 'goat_cheese', 'blue_cheese', 'halloumi', 'ricotta', 'cream_cheese', 'cheese_curds']);
const PLANT = new Set(['tofu', 'chickpeas', 'black_beans', 'kidney_beans', 'white_beans', 'lentils']);

export function anchorKind(id) {
  const ing = ING_BY_ID[id];
  if (!ing || ing.ro || STAPLES.has(id)) return null;
  if (ing.cat === 'meat' || ing.cat === 'fish' || PLANT.has(id)) return 'protein';
  if (CHEESE.has(id)) return 'cheese';
  if (ing.cat === 'produce' || id === 'frozen_veg') return 'produce';
  return null;
}

/** The ingredient a recipe line is priced as ("poulet" is priced as chicken breast). */
const priced = (l) => l.via || l.ing;

/**
 * @param {object[]} recipes
 * @param {Map} costs recipe id -> costRecipe() result for the selected stores
 * @param {Map} offers bestOffers() result
 * @param {object} baseline ingredient id -> { perG }
 * @returns {{anchors: object[], bundles: object[]}}
 */
export function buildIdeas(recipes, costs, offers, baseline, { size = 4, maxBundles = 8 } = {}) {
  // 1. What is on sale and actually used by a recipe line, with its discount.
  const used = new Map(); // ingredient -> { offer, recipes:Set }
  const meals = recipes.filter((r) => isMealDish(r.tax) && costs.get(r.id)?.coverage >= 0.6);
  for (const r of meals) {
    for (const l of costs.get(r.id).lines) {
      if (l.src !== 'flyer') continue;
      const id = priced(l);
      const kind = anchorKind(id);
      if (!kind) continue;
      if (!used.has(id)) used.set(id, { id, kind, offer: l.offer, recipes: new Set(), grams: 0 });
      used.get(id).recipes.add(r.id);
    }
  }
  const anchors = [...used.values()].filter((a) => a.recipes.size >= 3).map((a) => {
    const base = a.offer.rr ? a.offer.perG * a.offer.rr : baseline[a.offer.pk || a.id]?.perG;
    const off = base && base > a.offer.perG ? 1 - a.offer.perG / base : null;
    // Score: a known discount counts most; breadth of use breaks ties.
    return { ...a, off, score: (off ?? 0.12) * 100 + Math.min(a.recipes.size, 30) / 3 + (a.kind === 'protein' ? 8 : 0) };
  }).sort((a, b) => b.score - a.score);
  const onSale = new Set(anchors.map((a) => a.id));

  const saleSet = (r) => new Set(costs.get(r.id).lines.filter((l) => l.src === 'flyer' && onSale.has(priced(l))).map(priced));
  const sets = new Map(meals.map((r) => [r.id, saleSet(r)]));
  const dealShare = (r) => { const c = costs.get(r.id); return c.deals / Math.max(c.countable, 6); };

  // 2. One bundle per leading anchor: greedy pick of varied recipes that share sale items.
  const bundles = [];
  const usedRecipes = new Set();
  const leaders = [...anchors.filter((a) => a.kind === 'protein').slice(0, 5), ...anchors.filter((a) => a.kind !== 'protein').slice(0, 4)];
  for (const anchor of leaders) {
    const pool = meals.filter((r) => anchor.recipes.has(r.id) && !usedRecipes.has(r.id));
    if (pool.length < 3) continue;
    const chosen = [];
    while (chosen.length < size) {
      let best = null;
      let bestScore = -Infinity;
      const shared = new Set(chosen.flatMap((r) => [...sets.get(r.id)]));
      for (const r of pool) {
        if (chosen.includes(r)) continue;
        let s = dealShare(r) * 6;
        for (const id of sets.get(r.id)) if (id !== anchor.id && shared.has(id)) s += 2; // reuses another sale item
        for (const c of chosen) {
          if (c.tax.meals[0] === r.tax.meals[0]) s -= 2.5; // not four soups
          if (c.tax.cuisines[0] && c.tax.cuisines[0] === r.tax.cuisines[0]) s -= 2;
          if (c.source === r.source) s -= 1.5;
          if (c.lang !== r.lang) s -= 0.5;
        }
        if (r.macros) s += 0.5;
        if (r.time && r.time <= 45) s += 0.5;
        if (s > bestScore) { bestScore = s; best = r; }
      }
      if (!best) break;
      chosen.push(best);
    }
    if (chosen.length < 3) continue;
    chosen.forEach((r) => usedRecipes.add(r.id));

    // What the bundle shares: sale ingredients used by at least two of its recipes.
    const tally = new Map();
    for (const r of chosen) {
      for (const l of costs.get(r.id).lines) {
        const id = priced(l);
        if (l.src !== 'flyer' || !onSale.has(id)) continue;
        if (!tally.has(id)) tally.set(id, { id, offer: l.offer, n: new Set(), g: 0 });
        const t = tally.get(id);
        t.n.add(r.id);
        t.g += l.g || 0;
      }
    }
    const shared = [...tally.values()].filter((t) => t.n.size >= 2 || t.id === anchor.id).map((t) => ({ id: t.id, offer: t.offer, count: t.n.size, grams: Math.round(t.g) })).sort((a, b) => (b.id === anchor.id) - (a.id === anchor.id) || b.count - a.count);
    const total = chosen.reduce((n, r) => n + (costs.get(r.id).total || 0), 0);
    const mealsCount = chosen.reduce((n, r) => n + (r.meals || r.servings || 0), 0);
    const savings = chosen.reduce((n, r) => n + costs.get(r.id).savings, 0);
    bundles.push({ anchor, recipes: chosen, shared, total, meals: mealsCount, savings });
    if (bundles.length >= maxBundles) break;
  }
  return { anchors, bundles };
}
