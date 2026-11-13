// Consistency check of the pricing rules on the built index, for every recipe, region and
// store. It must print "0 violations": run it after `npm run index` (CI does).
//   1. The same ingredient lines are priced whatever the store (no "free" ingredients).
//   2. A store's flyer can only lower a recipe's cost: cost(store) <= cost(no flyer).
//   3. More stores never cost more: cost(all stores) <= cost(any single store).
//   4. Every line is charged at min(flyer price, reference price).
//   5. No substitution: a flyer product is only used for the very food the line asks for
//      (same member), for a generic request ("nuts"), or for a declared generic fallback.
import { readFile } from 'node:fs/promises';
import { bestOffers, costRecipe } from '../shared/cost.js';
import { ING_BY_ID } from '../shared/ingredients.js';
import { baseId } from '../shared/match.js';

const load = async (f) => JSON.parse(await readFile(`public/data/${f}.json`, 'utf8'));
const [recipes, flyers, meta] = await Promise.all([load('recipes'), load('flyers'), load('meta')]);
const base = meta.baseline.prices;
const EPS = 1e-9;
let checks = 0;
const bad = [];
const note = (rule, r, extra) => { if (bad.length < 12) bad.push(`rule ${rule}: ${r.name} — ${extra}`); else bad.count = (bad.count || 12) + 1; };
for (const [regionId, region] of Object.entries(flyers.regions)) {
  const fs = new Set(region.flyers);
  const items = flyers.items.filter((i) => i.flyers.some((f) => fs.has(f)));
  const days = [...new Set(items.flatMap((i) => [i.from, i.to]))].sort();
  for (const day of [days[0], days[days.length - 1], new Date().toISOString().slice(0, 10)]) {
    const none = bestOffers(items, new Set(), day, base);
    const all = bestOffers(items, new Set(region.stores), day, base);
    const per = region.stores.map((s) => [s, bestOffers(items, new Set([s]), day, base)]);
    for (const r of recipes) {
      const c0 = costRecipe(r, none, base);
      const cAll = costRecipe(r, all, base);
      const sig = (c) => c.lines.map((l) => (l.cost != null ? 1 : 0)).join('');
      for (const [s, o] of [...per, ['all', all]]) {
        const c = costRecipe(r, o, base);
        checks++;
        if (sig(c) !== sig(c0)) note(1, r, `${regionId}/${s}/${day}: priced lines differ from the no-flyer case`);
        if ((c.total ?? 0) > (c0.total ?? 0) + EPS) note(2, r, `${regionId}/${s}/${day}: ${c.total} > ${c0.total}`);
        if ((cAll.total ?? 0) > (c.total ?? 0) + EPS) note(3, r, `${regionId}/${s}/${day}: all stores ${cAll.total} > ${c.total}`);
        for (const l of c.lines) {
          const ref = base[l.via || l.pk || l.ing]?.perG;
          if (l.src === 'flyer' && !l.via) {
            const want = l.pk || l.ing; // for alternatives, l.pk is the one chosen
            const generic = want === l.ing && ING_BY_ID[l.ing].members.some((m) => m.generic);
            if (l.offer.pk !== want && !(generic && baseId(l.offer.pk) === l.ing)) note(5, r, `${l.raw.slice(0, 40)} priced with ${l.offer.pk}`);
          }
          if (l.cost && ref && l.cost > l.g * ref + EPS) note(4, r, `${l.raw.slice(0, 40)}: charged above the reference price`);
        }
      }
    }
  }
}
const n = bad.count || bad.length;
console.log(`${checks} recipe × store × date checks, ${n} violations`);
if (n) { console.log(bad.join('\n')); process.exit(1); }
