// Quality audit of the built index: prints the lines and recipes most likely to be wrong.
// Run after `npm run index`:  node scripts/audit.mjs [region] [store,store]
import { readFile } from 'node:fs/promises';
import { bestOffers, costRecipe, reliable } from '../shared/cost.js';

const load = async (f) => JSON.parse(await readFile(`public/data/${f}.json`, 'utf8'));
const [recipes, flyers, meta] = await Promise.all([load('recipes'), load('flyers'), load('meta')]);
const region = flyers.regions[process.argv[2] || 'montreal'];
const stores = new Set((process.argv[3] || 'maxi,superc,iga,metro,provigo,walmart,adonis').split(','));
const fs = new Set(region.flyers);
const today = new Date().toISOString().slice(0, 10);
const day = flyers.items.some((i) => i.to >= today && i.from <= today) ? today : flyers.items.map((i) => i.from).sort().pop();
const offers = bestOffers(flyers.items.filter((i) => i.flyers.some((f) => fs.has(f))), stores, day, meta.baseline.prices);
const rows = recipes.map((r) => ({ r, c: costRecipe(r, offers, meta.baseline.prices) }));
const ok = rows.filter((x) => reliable(x.c));
const per = ok.map((x) => x.c.per).sort((a, b) => a - b);
const q = (p) => per[Math.floor(per.length * p)]?.toFixed(2);
console.log(`day ${day} · ${recipes.length} recipes · reliable ${ok.length} · per meal/serving p5 ${q(0.05)} p25 ${q(0.25)} p50 ${q(0.5)} p75 ${q(0.75)} p95 ${q(0.95)}`);
const kinds = {};
for (const x of rows) kinds[x.c.perKind] = (kinds[x.c.perKind] || 0) + 1;
console.log('cost quoted per:', JSON.stringify(kinds), '· meal basis:', JSON.stringify(recipes.reduce((m, r) => { m[r.mealBasis || '-'] = (m[r.mealBasis || '-'] || 0) + 1; return m; }, {})));
console.log('unreadable quantities set aside:', recipes.reduce((n, r) => n + r.ings.filter((l) => l.odd).length, 0));
const lines = rows.flatMap((x) => x.c.lines.filter((l) => l.cost).map((l) => ({ ...l, r: x.r, share: l.cost / x.c.total, per: l.cost / (x.r.meals || x.r.servings || 1) })));
const show = (l) => `  ${l.per.toFixed(2)}$/meal · ${l.raw.slice(0, 48)} → ${l.ing} ${l.g}g · ${l.offer ? `${l.offer.store}: ${l.offer.name.slice(0, 34)} ${(l.offer.perG * 1000).toFixed(1)}$/kg` : 'regular price'} [${l.r.name.slice(0, 30)}]`;
console.log('\nCostliest single lines per meal:');
for (const l of lines.sort((a, b) => b.per - a.per).slice(0, +process.env.N || 14)) console.log(show(l));
console.log('\nCheapest and dearest reliable recipes:');
for (const x of [...ok.sort((a, b) => a.c.per - b.c.per).slice(0, 6), ...ok.slice(-6)]) console.log(`  ${x.c.per.toFixed(2)} /${x.c.perKind} · ${x.r.name.slice(0, 44)} · yield ${x.r.yield} · meals ${x.r.meals} (${x.r.mealBasis}) · kcal ${x.r.macros?.kcal ?? '-'} · ${x.c.priced}/${x.c.countable}`);

// Calculated macros checked against the sources that publish theirs.
const both = recipes.filter((r) => r.calcCheck && r.macros && !r.macros.calc && r.macros.kcal > 50);
const ratios = both.map((r) => r.calcCheck / r.macros.kcal).sort((a, b) => a - b);
if (ratios.length) {
  const within = (p) => Math.round((ratios.filter((x) => Math.abs(x - 1) <= p).length / ratios.length) * 100);
  console.log(`\nCalculated vs published calories on ${ratios.length} recipes: median ratio ${ratios[Math.floor(ratios.length / 2)].toFixed(2)}, within ±20 %: ${within(0.2)} %, within ±35 %: ${within(0.35)} %`);
}
console.log(`macros: ${recipes.filter((r) => r.macros && !r.macros.calc).length} published, ${recipes.filter((r) => r.macros?.calc).length} calculated, ${recipes.filter((r) => !r.macros).length} none`);
const tags = {};
for (const r of recipes) { for (const d of r.tax.diets) tags[d] = (tags[d] || 0) + 1; if (r.tax.prep) tags.prep = (tags.prep || 0) + 1; }
console.log('tags:', JSON.stringify(tags));
