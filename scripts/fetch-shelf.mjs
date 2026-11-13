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
const OUT = process.env.SHELF_OUT || 'data/shelf.json';

// Common English shelf names the ingredient list does not spell out (searches are in English).
const EXTRA = ['worcestershire sauce', 'lea perrins', 'jalapeno peppers', 'leeks', 'dried cranberries', 'pumpkin puree', 'canned pumpkin',
  'gruyere cheese', 'cheese ravioli', 'bbq sauce', 'barbecue sauce', 'miso paste', 'white miso', 'icing sugar', 'powdered sugar', 'unflavoured gelatin',
  'almond butter', 'coleslaw mix', 'wonton wrappers', 'hamburger buns', 'hot dog buns', 'crab meat', 'swiss chard', 'snow peas', 'thai chili',
  'sweet cherries', 'hemp hearts', 'pizza dough', 'anchovy fillets', 'pure vanilla extract', 'sun dried tomatoes', 'pine nuts', 'agave syrup',
  'medjool dates', 'dried apricots', 'coconut flakes', 'egg roll wrappers', 'phyllo pastry', 'puff pastry', 'pie crust', 'tortilla wraps',
  'poppy seed', 'cardamom', 'ground cloves', 'fenugreek', 'enchilada sauce', 'buffalo sauce', 'chili crisp', 'dark soy sauce', 'ponzu', 'fish stock',
  'juniper berries', 'taco seasoning', 'italian seasoning', 'onion soup mix', 'frozen mixed vegetables', 'hash browns', 'cannellini beans', 'apple juice'];

/** Search terms: each ingredient's English name and the first names of each member. */
export function queries() {
  const q = new Set();
  for (const i of INGREDIENTS) {
    if (i.free) continue;
    q.add(i.en.toLowerCase());
    for (const m of i.members) for (const s of m.syn.slice(0, 3)) q.add(s);
  }
  for (const x of EXTRA) q.add(x);
  return [...q];
}

async function main() {
  const old = await readJson(OUT, null);
  const bySku = new Map((old?.products || []).map((p) => [p.sku, p]));
  // Searches done in the last 6 days are skipped, so an interrupted run resumes where it stopped.
  const searched = { ...(old?.searched || {}) };
  const today = new Date().toISOString().slice(0, 10);
  const fresh = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  // ONLY=term1,term2: search just these (after adding ingredients); others are kept as stored.
  const all = process.env.ONLY ? process.env.ONLY.split(',').map((x) => x.trim()).filter(Boolean) : queries();
  const list = all.filter((q) => process.env.ONLY || !(searched[q] >= fresh));
  let ok = 0;
  let failed = 0;
  const save = async () => {
    // Prices not seen again for 8 weeks are dropped (discontinued products).
    const cutoff = new Date(Date.now() - 56 * 864e5).toISOString().slice(0, 10);
    const products = [...bySku.values()].filter((p) => p.date >= cutoff).sort((a, b) => a.name.localeCompare(b.name));
    await writeJson(OUT, { source: 'Walmart.ca (catalogue en ligne, via Flipp)', fetchedAt: new Date().toISOString(), searched, products });
    return products.length;
  };
  for (const [i, q] of list.entries()) {
    const { status, text } = await get(`${API}/items/search?locale=en-ca&postal_code=${POSTAL}&q=${encodeURIComponent(q)}`, { delayMs: 250, accept: 'application/json' });
    if (status !== 200) { failed++; continue; }
    let j;
    try { j = JSON.parse(text); } catch { failed++; continue; }
    ok++;
    searched[q] = today;
    for (const e of j.ecom_items || []) {
      if (e.merchant !== 'Walmart' || !e.name || !(e.current_price > 0)) continue;
      // The everyday price: a temporary rollback shows the regular one as original_price.
      const price = e.original_price > e.current_price ? e.original_price : e.current_price;
      bySku.set(e.sku || e.global_id, { sku: e.sku || e.global_id, name: e.name, price, date: today });
    }
    if ((i + 1) % 50 === 0) log(`shelf: ${i + 1}/${list.length} searches, ${await save()} products`);
  }
  if (!ok && list.length) { log(`shelf: every search failed, keeping ${OUT}`); return; }
  log(`shelf: ${ok} searches (${failed} failed, ${all.length - list.length} skipped as fresh), ${await save()} Walmart products`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
