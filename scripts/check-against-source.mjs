// Ground-truth check: Budget Bytes prints the cost of each ingredient line, e.g.
// "1 cup long grain rice ($0.43)". Our reference cost for the same line (no flyer deal) should
// be in the same range: their US prices × ~1.4 for Canadian dollars and newer prices.
// Lines off by more than 3× in either direction point at a quantity or pricing bug.
import { readFile } from 'node:fs/promises';
import { costRecipe } from '../shared/cost.js';

const recipes = JSON.parse(await readFile('public/data/recipes.json', 'utf8'));
const meta = JSON.parse(await readFile('public/data/meta.json', 'utf8'));
const base = meta.baseline.prices;
const FX = 1.4;
const rows = [];
for (const r of recipes.filter((x) => x.source === 'budgetbytes')) {
  const c = costRecipe(r, new Map(), base);
  for (const l of c.lines) {
    const m = l.raw.match(/\$\s*(\d+(?:\.\d+)?)/);
    if (!m || l.src === 'free') continue;
    const theirs = +m[1] * FX;
    if (theirs < 0.15) continue; // pennies: too coarse to compare
    rows.push({ r, l, theirs, ours: l.cost, ratio: l.cost != null ? l.cost / theirs : null });
  }
}
const priced = rows.filter((x) => x.ratio != null);
const off = priced.filter((x) => x.ratio > 3 || x.ratio < 1 / 3);
const sorted = priced.map((x) => x.ratio).sort((a, b) => a - b);
const q = (p) => sorted[Math.floor(p * sorted.length)].toFixed(2);
console.log(`${rows.length} Budget Bytes lines with a stated cost; ${priced.length} priced by us; ratio ours/theirs×${FX}: p10 ${q(0.1)} p25 ${q(0.25)} median ${q(0.5)} p75 ${q(0.75)} p90 ${q(0.9)}`);
console.log(`off by more than 3×: ${off.length} (${Math.round((off.length / priced.length) * 100)} %)`);
const show = process.argv.includes('--all') ? off : off.sort((a, b) => Math.abs(Math.log(b.ratio)) - Math.abs(Math.log(a.ratio))).slice(0, +process.env.N || 40);
for (const x of show) console.log(`${x.ratio.toFixed(2).padStart(6)} | ${x.l.raw.slice(0, 60).padEnd(60)} | ${String(x.l.pk || x.l.ing).padEnd(22)} ${String(x.l.g).padStart(7)} g | ours ${x.ours.toFixed(2)} vs ${x.theirs.toFixed(2)}`);
const unpriced = rows.filter((x) => x.ratio == null && x.l.src !== 'pantry');
console.log(`\nunpriced by us (${unpriced.length}):`, unpriced.slice(0, 25).map((x) => x.l.raw.slice(0, 40)).join(' | '));
