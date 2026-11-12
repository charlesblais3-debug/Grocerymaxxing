// Proposes dinners for a household within a budget: cheap, on sale, and varied.
import { reliable } from './cost.js';

const DINNER = new Set(['main', 'pasta', 'soup']);

/** How many times to make a recipe so it feeds `people` (steps of one half). */
export const batchesFor = (recipe, people) => Math.max(0.5, Math.round((people / (recipe.meals || recipe.servings || people)) * 2) / 2);

/** Published or calculated nutrition per meal (sources quote it per serving). */
const perMeal = (r, key) => (r.macros?.[key] == null ? null : r.macros[key] * (r.meals && r.servings && !r.unitYield ? r.servings / r.meals : 1));

/**
 * @param {object} o
 * @param {number|null} o.budget money available for the dinners to pick
 * @param {number} o.dinners how many to pick
 * @param {object[]} o.keep recipes already in the week: not returned, but the picks stay varied against them
 * @param {Set<string>} o.avoid recipe ids not to propose (already planned, or proposed recently)
 * @param {number} o.minProtein grams of protein per meal, o.maxKcal calories per meal
 * @returns {{id:string, batches:number, day:number, cost:number}[]}
 */
export function suggestPlan(recipes, costs, { budget = null, people = 2, dinners = 5, keep = [], avoid = new Set(), minProtein = 0, maxKcal = 0 } = {}) {
  // Dinners only: a real main dish with a protein, almost fully priced, nothing unrecognised
  // (an unrecognised ingredient could be the expensive one).
  const pool = recipes.filter((r) => r.meals && r.tax.protein && r.tax.meals.some((m) => DINNER.has(m)) && !r.tax.meals.includes('appetizer') && !r.tax.meals.includes('side')
    && !avoid.has(r.id) && !keep.includes(r)
    && reliable(costs.get(r.id)) && costs.get(r.id).coverage >= 0.9 && (!r.ings || r.ings.every((l) => l.ing))
    && (!minProtein || perMeal(r, 'protein') >= minProtein) && (!maxKcal || (perMeal(r, 'kcal') != null && perMeal(r, 'kcal') <= maxKcal)));
  const week = keep.map((r) => ({ r }));
  const picked = [];
  let left = budget ?? Infinity;
  while (picked.length < dinners) {
    let best = null;
    let bestScore = -Infinity;
    for (const r of pool) {
      if (picked.some((c) => c.r === r)) continue;
      const c = costs.get(r.id);
      const batches = batchesFor(r, people);
      const cost = c.total * batches;
      if (cost > left) continue;
      let s = c.savingsPct * 12 - c.per + (r.macros ? 0.3 : 0) + (r.time && r.time <= 45 ? 0.3 : 0);
      for (const o of [...week, ...picked]) {
        if (o.r.tax.protein === r.tax.protein) s -= 3;
        if (o.r.tax.meals[0] === r.tax.meals[0]) s -= 1.5;
        if (o.r.tax.cuisines[0] && o.r.tax.cuisines[0] === r.tax.cuisines[0]) s -= 1.5;
        if (o.r.source === r.source) s -= 1;
      }
      if (s > bestScore) { bestScore = s; best = { r, batches, cost }; }
    }
    if (!best) break;
    picked.push(best);
    left -= best.cost;
  }
  return picked.map((c, day) => ({ id: c.r.id, batches: c.batches, day, cost: c.cost }));
}
