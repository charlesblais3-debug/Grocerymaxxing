// Price observations from every flyer we have seen, kept for 26 weeks in
// data/price-history.json. They are what lets the app give an ingredient a reference
// price at a store that has no deal on it this week — otherwise that ingredient would
// count as free there and stores with fewer deals would look cheaper.
import { readJson, writeJson } from './lib/http.mjs';
import { matchFlyerItem, forms } from '../shared/match.js';
import { unitPrice, regularRatio } from '../shared/price.js';
import { ING_BY_ID } from '../shared/ingredients.js';
import { STORES, loadFlyers } from './fetch-flyers.mjs';

const OUT = 'data/price-history.json';
const KEEP_WEEKS = 26;

/** Ingredients a flyer item stands for and its price per gram of each. */
export function priceItem(it) {
  const ings = matchFlyerItem(it.name);
  const pg = {};
  let basis;
  for (const ing of ings) {
    const up = unitPrice(it, ING_BY_ID[ing]);
    // Without the item's price text we cannot tell "each" from "per lb": trust only printed sizes.
    if (!up || (!it.d && up.basis !== 'size')) continue;
    pg[ing] = +up.perG.toFixed(6);
    basis ||= up.basis;
  }
  const has = Object.keys(pg).length > 0;
  const fm = ings.length ? forms(it.name) : [];
  return { ings, pg: has ? pg : null, basis, fm: fm.length ? fm : null, rr: has ? regularRatio(it) : null };
}

/** Adds the current flyers' prices to the history. Rows: [store, ingredient, $/g, regular $/g or 0, plain form 1/0]. */
export async function updateHistory(data) {
  const flyers = data || (await loadFlyers());
  const hist = await readJson(OUT, { weeks: {} });
  if (!flyers) return hist;
  const kept = new Set(STORES.map((s) => s.id));
  for (const f of Object.values(flyers.flyers)) {
    if (!kept.has(f.store)) continue;
    const week = (f.from || '').slice(0, 10);
    if (!week) continue;
    const rows = new Map((hist.weeks[week] || []).map((r) => [r.slice(0, 3).join('|'), r]));
    for (const it of f.items) {
      const p = priceItem(it);
      if (!p.pg) continue;
      for (const [ing, perG] of Object.entries(p.pg)) {
        rows.set(`${f.store}|${ing}|${perG}`, [f.store, ing, perG, p.rr ? +(perG * p.rr).toFixed(6) : 0, p.fm ? 0 : 1]);
      }
    }
    hist.weeks[week] = [...rows.values()].sort((a, b) => (a[1] + a[0]).localeCompare(b[1] + b[0]) || a[2] - b[2]);
  }
  const weeks = Object.keys(hist.weeks).sort().slice(-KEEP_WEEKS);
  hist.weeks = Object.fromEntries(weeks.map((w) => [w, hist.weeks[w]]));
  await writeJson(OUT, hist);
  return hist;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const h = await updateHistory();
  const n = Object.values(h.weeks).reduce((a, w) => a + w.length, 0);
  console.log(`price history: ${Object.keys(h.weeks).length} flyer weeks, ${n} observations, ${new Set(Object.values(h.weeks).flat().map((r) => r[1])).size} ingredients`);
}
