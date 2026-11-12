// Price observations from every flyer we have seen, kept for 26 weeks in
// data/price-history.json. They are what lets the app give an ingredient a reference
// price at a store that has no deal on it this week — otherwise that ingredient would
// count as free there and stores with fewer deals would look cheaper.
import { readJson, writeJson } from './lib/http.mjs';
import { matchFlyerItemFull, forms } from '../shared/match.js';
import { unitPrice, regularRatio } from '../shared/price.js';
import { ING_BY_ID } from '../shared/ingredients.js';
import { STORES, REFERENCE_STORES, loadFlyers } from './fetch-flyers.mjs';

const OUT = 'data/price-history.json';
const KEEP_WEEKS = 26;

/** Ingredients a flyer item stands for and its price per gram of each. */
export function priceItem(it) {
  const hits = matchFlyerItemFull(it.name);
  const ings = [...new Set(hits.map((h) => h.id))];
  const pg = {}; // price key -> $/g
  const seg = {}; // price key -> the part of the label that names it ("mangue rouge")
  let basis;
  for (const h of hits) {
    const up = unitPrice(it, ING_BY_ID[h.id]);
    // Without the item's price text we cannot tell "each" from "per lb": trust only printed sizes.
    if (!up || (!it.d && up.basis !== 'size')) continue;
    pg[h.pk] = +up.perG.toFixed(6);
    if (hits.length > 1) seg[h.pk] = h.seg;
    basis ||= up.basis;
  }
  const has = Object.keys(pg).length > 0;
  const fm = ings.length ? forms(it.name) : [];
  return { ings, pg: has ? pg : null, seg: Object.keys(seg).length ? seg : null, basis, fm: fm.length ? fm : null, rr: has ? regularRatio(it) : null };
}

/**
 * Folds the current flyers' prices into a history object (pure: nothing is written).
 * Rows: [store, price key, $/g, retailer's claimed regular $/g or 0, plain form 1/0].
 */
export function mergeHistory(hist, flyers) {
  const out = { weeks: { ...(hist?.weeks || {}) } };
  // Rows recorded before groups were split into members cannot say which member they were.
  for (const [w, rows] of Object.entries(out.weeks)) out.weeks[w] = rows.filter((r) => r[1].includes('~') || ING_BY_ID[r[1]]?.members.length === 1);
  if (!flyers) return out;
  const kept = new Set([...STORES, ...REFERENCE_STORES].map((s) => s.id));
  for (const f of Object.values(flyers.flyers)) {
    if (!kept.has(f.store)) continue;
    const week = (f.from || '').slice(0, 10);
    if (!week) continue;
    const rows = new Map((out.weeks[week] || []).map((r) => [r.slice(0, 3).join('|'), r]));
    for (const it of f.items) {
      const p = priceItem(it);
      if (!p.pg) continue;
      for (const [pk, perG] of Object.entries(p.pg)) {
        rows.set(`${f.store}|${pk}|${perG}`, [f.store, pk, perG, p.rr ? +(perG * p.rr).toFixed(6) : 0, p.fm ? 0 : 1]);
      }
    }
    out.weeks[week] = [...rows.values()].sort((a, b) => (a[1] + a[0]).localeCompare(b[1] + b[0]) || a[2] - b[2]);
  }
  const weeks = Object.keys(out.weeks).sort().slice(-KEEP_WEEKS);
  out.weeks = Object.fromEntries(weeks.map((w) => [w, out.weeks[w]]));
  return out;
}

/** Adds the current flyers' prices to data/price-history.json. */
export async function updateHistory(data) {
  const hist = mergeHistory(await readJson(OUT, { weeks: {} }), data || (await loadFlyers()));
  await writeJson(OUT, hist);
  return hist;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const h = await updateHistory();
  const n = Object.values(h.weeks).reduce((a, w) => a + w.length, 0);
  console.log(`price history: ${Object.keys(h.weeks).length} flyer weeks, ${n} observations, ${new Set(Object.values(h.weeks).flat().map((r) => r[1])).size} ingredients`);
}
