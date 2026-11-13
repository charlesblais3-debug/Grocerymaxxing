// Regular shelf prices from Walmart's online grocery catalogue, as listed by Flipp's search.
//
// Flyers only show what is on sale: staples such as ginger, vanilla, baking powder or rice
// vinegar can go months without a flyer price. Walmart is one of the seven stores the site
// covers, and its catalogue gives the everyday price of those products. Only the raw product
// names and prices are stored here; build-index matches them to ingredients with the same
// strict rules as flyer items (name matching, package size, product form), so a better
// matcher re-reads old data without fetching again.
import { get, readJson, writeJson, log } from './lib/http.mjs';
import { INGREDIENTS } from '../shared/ingredients.js';

const API = process.env.FLIPP_API || 'https://backflipp.wishabi.com/flipp';
const POSTAL = 'H2X1Y4';
const OUT = 'data/shelf.json';

/** Search terms: each ingredient's English name and the first names of each member. */
export function queries() {
  const q = new Set();
  for (const i of INGREDIENTS) {
    if (i.free) continue;
    q.add(i.en.toLowerCase());
    for (const m of i.members) for (const s of m.syn.slice(0, 3)) q.add(s);
  }
  return [...q];
}

async function main() {
  const old = await readJson(OUT, null);
  const bySku = new Map((old?.products || []).map((p) => [p.sku, p]));
  const today = new Date().toISOString().slice(0, 10);
  let ok = 0;
  let failed = 0;
  // ONLY=term1,term2: search just these (after adding ingredients); others are kept as stored.
  const list = process.env.ONLY ? process.env.ONLY.split(',').map((x) => x.trim()).filter(Boolean) : queries();
  for (const q of list) {
    const { status, text } = await get(`${API}/items/search?locale=en-ca&postal_code=${POSTAL}&q=${encodeURIComponent(q)}`, { delayMs: 350, accept: 'application/json' });
    if (status !== 200) { failed++; continue; }
    ok++;
    let j;
    try { j = JSON.parse(text); } catch { continue; }
    for (const e of j.ecom_items || []) {
      if (e.merchant !== 'Walmart' || !e.name || !(e.current_price > 0)) continue;
      // The everyday price: a temporary rollback shows the regular one as original_price.
      const price = e.original_price > e.current_price ? e.original_price : e.current_price;
      bySku.set(e.sku || e.global_id, { sku: e.sku || e.global_id, name: e.name, price, date: today });
    }
  }
  // Prices not seen again for 8 weeks are dropped (discontinued products).
  const cutoff = new Date(Date.now() - 56 * 864e5).toISOString().slice(0, 10);
  const products = [...bySku.values()].filter((p) => p.date >= cutoff).sort((a, b) => a.name.localeCompare(b.name));
  if (!ok) { log(`shelf: every search failed, keeping ${OUT}`); return; }
  await writeJson(OUT, { source: 'Walmart.ca (catalogue en ligne, via Flipp)', fetchedAt: new Date().toISOString(), products });
  log(`shelf: ${ok} searches (${failed} failed), ${products.length} Walmart products`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
