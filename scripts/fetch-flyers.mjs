// Downloads this week's grocery flyers for Québec regions from Flipp's public flyer
// endpoints (the same data flipp.com shows). Run on a schedule by GitHub Actions.
// Prices are stored exactly as published; nothing is estimated here.
import { get, readJson, writeJson, summary, log } from './lib/http.mjs';
import { deaccent } from '../shared/text.js';
import { matchFlyerItem } from '../shared/match.js';

const API = process.env.FLIPP_API || 'https://backflipp.wishabi.com/flipp';
const OUT = 'data/flyers.json';

export const REGIONS = [
  { id: 'montreal', label: 'Montréal', postal: 'H2X1Y4' },
  { id: 'laval-rive-nord', label: 'Laval / Rive-Nord', postal: 'H7N3X5' },
  { id: 'rive-sud', label: 'Rive-Sud (Longueuil)', postal: 'J4K2T4' },
  { id: 'quebec', label: 'Québec', postal: 'G1R4P5' },
  { id: 'sherbrooke', label: 'Sherbrooke', postal: 'J1H1Z1' },
  { id: 'gatineau', label: 'Gatineau', postal: 'J8X2K1' },
  { id: 'trois-rivieres', label: 'Trois-Rivières', postal: 'G9A1X3' },
  { id: 'saguenay', label: 'Saguenay', postal: 'G7H1R5' },
];

// The Québec grocery banners most people shop at. `general: true` = the flyer is mostly
// non-food, so only items we can match to an ingredient are kept.
export const STORES = [
  { id: 'superc', name: 'Super C', re: /^super ?c\b/ },
  { id: 'maxi', name: 'Maxi', re: /^maxi/ },
  { id: 'iga', name: 'IGA', re: /^iga/ },
  { id: 'metro', name: 'Metro', re: /^metro/ },
  { id: 'provigo', name: 'Provigo', re: /^provigo/ },
  { id: 'walmart', name: 'Walmart', re: /^walmart/, general: true },
  { id: 'adonis', name: 'Adonis', re: /adonis/ },
];

// Banners gathered ONLY as price evidence (health-food chains such as Avril and Rachelle
// Béry are left out: their prices are not typical of a grocery basket): they never appear in the app, but what they
// charge for sesame oil, miso or baking powder helps set a reference price for ingredients
// the seven main banners rarely advertise.
export const REFERENCE_STORES = [
  { id: 'tnt', name: 'T&T', re: /^t ?& ?t/, ref: true },
  { id: 'kimphat', name: 'Kim Phat', re: /kim phat/, ref: true },
  { id: 'tradition', name: 'Marché Tradition', re: /tradition/, ref: true },
  { id: 'bonichoix', name: 'Bonichoix', re: /bonichoix/, ref: true },
  { id: 'richelieu', name: 'Marché Richelieu', re: /richelieu/, ref: true },
  { id: 'pa', name: 'Supermarché PA', re: /^(supermarche )?p\.?a\.?\b/, ref: true },
  { id: 'mayrand', name: 'Mayrand', re: /mayrand/, ref: true },
  { id: 'costco', name: 'Costco', re: /^costco/, ref: true },
];

export function storeFor(merchant) {
  const m = deaccent(merchant || '').trim();
  return [...STORES, ...REFERENCE_STORES].find((s) => s.re.test(m)) || null;
}

const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.').replace(/[^0-9.]/g, ''));
  return isFinite(n) && n > 0 ? n : null;
};
const str = (v) => (v == null ? '' : String(v).trim());

/** Field names differ between Flipp endpoints; read whichever is present. */
export function toItem(raw) {
  const price = num(raw.price ?? raw.current_price);
  const name = str(raw.name ?? raw.display_name);
  if (!price || !name) return null;
  return {
    id: String(raw.id ?? raw.flyer_item_id),
    name,
    brand: str(raw.brand) || undefined,
    desc: str(raw.description).slice(0, 160) || undefined,
    price,
    pre: str(raw.pre_price_text) || undefined,
    post: str(raw.price_text ?? raw.post_price_text) || undefined,
    story: str(raw.sale_story) || undefined,
    was: num(raw.original_price) || undefined,
    img: str(raw.cutout_image_url ?? raw.clean_image_url ?? raw.clipping_image_url ?? raw.image_url).replace(/^http:/, 'https:') || undefined,
    from: str(raw.valid_from) || undefined,
    to: str(raw.valid_to) || undefined,
  };
}

const sig = (store, it) => `${store}|${it.name}|${it.price}|${(it.from || '').slice(0, 10)}`;

/**
 * The flyer listing gives name + price only. The unit of that price ("/lb", "ch.",
 * "2/") lives on the item itself, so matched food items are looked up one by one —
 * once per distinct product, and never again while the same flyer is running.
 */
async function addDetails(flyers, previous) {
  const cache = new Map();
  for (const f of Object.values(previous?.flyers || {})) {
    for (const it of f.items) if (it.d) cache.set(sig(f.store, it), it);
  }
  const todo = new Map();
  // Grocery banners first, so they are complete even if the lookup cap is reached.
  for (const f of Object.values(flyers).sort((a, b) => (a.general ? 1 : 0) - (b.general ? 1 : 0))) {
    for (const it of f.items) {
      const k = sig(f.store, it);
      const old = cache.get(k);
      if (old) Object.assign(it, { pre: old.pre, post: old.post, story: old.story, desc: old.desc, was: old.was, d: 1 });
      else if (it.food) (todo.get(k) || todo.set(k, []).get(k)).push(it);
    }
  }
  let done = 0; let failed = 0; let logged = 0;
  const max = Number(process.env.MAX_ITEM_LOOKUPS || 9000);
  for (const [, items] of [...todo].slice(0, max)) {
    const res = await get(`${API}/items/${items[0].id}?locale=fr-ca`, { delayMs: 110, retries: 0, accept: 'application/json' });
    let j;
    try { j = JSON.parse(res.text); } catch { j = null; }
    const raw = j?.item ?? j;
    if (res.status !== 200 || !raw || typeof raw !== 'object') {
      if (++failed <= 3) log(`item ${items[0].id}: ${res.status || res.error} ${res.text.slice(0, 120)}`);
      if (failed > 60 && done < 5) { log('item lookups are failing; giving up on details for this run'); break; }
      continue;
    }
    if (logged++ < 3) log('item detail sample:', JSON.stringify(raw).slice(0, 1400));
    const d = {
      pre: str(raw.pre_price_text) || undefined,
      post: str(raw.price_text ?? raw.post_price_text) || undefined,
      story: str(raw.sale_story) || undefined,
      desc: str(raw.description).replace(/\s+/g, ' ').slice(0, 200) || undefined,
      was: num(raw.original_price) || undefined,
      d: 1,
    };
    for (const it of items) Object.assign(it, d);
    done++;
  }
  return { done, failed, pending: Math.max(0, todo.size - max), cached: cache.size };
}

const line = (o) => JSON.stringify(o);
function serialise(data) {
  const flyers = Object.values(data.flyers).sort((a, b) => a.id.localeCompare(b.id)).map((f) => {
    const { items, ...head } = f;
    return `${line(f.id)}:{"head":${line(head)},"items":[\n${items.map(line).join(',\n')}\n]}`;
  });
  return `{"fetchedAt":${line(data.fetchedAt)},"source":"Flipp","regions":${JSON.stringify(data.regions, null, 1)},\n"flyers":{\n${flyers.join(',\n')}\n}}\n`;
}

/** Reads the on-disk format back into { regions, flyers: { id: { ...head, items } } }. */
export async function loadFlyers(path = OUT) {
  const d = await readJson(path, null);
  if (!d) return null;
  for (const [id, f] of Object.entries(d.flyers)) if (f.head) d.flyers[id] = { ...f.head, items: f.items };
  return d;
}

async function main() {
  const previous = await loadFlyers();
  const regions = {};
  const flyers = {};
  const errors = [];
  let sampleLogged = false;

  for (const region of REGIONS) {
    const res = await get(`${API}/flyers?locale=fr-ca&postal_code=${region.postal}`, { delayMs: 800, accept: 'application/json' });
    let listing;
    try { listing = JSON.parse(res.text); } catch { listing = null; }
    const list = listing?.flyers ?? (Array.isArray(listing) ? listing : null);
    if (res.status !== 200 || !list) { errors.push(`${region.id}: flyer list ${res.status || res.error}`); continue; }
    if (!sampleLogged && list[0]) log('flyer listing keys:', Object.keys(list[0]).join(','));
    const ids = [];
    for (const f of list) {
      const store = storeFor(f.merchant ?? f.merchant_name);
      if (!store || /^ontario$/i.test(str(f.name))) continue;
      const id = String(f.id);
      ids.push(id);
      if (flyers[id]) continue;
      const fr = await get(`${API}/flyers/${id}?locale=fr-ca`, { delayMs: 800, accept: 'application/json' });
      let detail;
      try { detail = JSON.parse(fr.text); } catch { detail = null; }
      const rawItems = detail?.items ?? (Array.isArray(detail) ? detail : null);
      if (fr.status !== 200 || !rawItems) { errors.push(`flyer ${id} (${store.name}): ${fr.status || fr.error}`); ids.pop(); continue; }
      if (!sampleLogged && rawItems[0]) { log('flyer item sample:', JSON.stringify(rawItems.find((i) => i.price) ?? rawItems[0]).slice(0, 900)); sampleLogged = true; }
      flyers[id] = {
        id,
        store: store.id,
        merchant: str(f.merchant ?? f.merchant_name),
        name: str(f.name),
        from: str(f.valid_from),
        to: str(f.valid_to),
        general: store.general || store.ref || undefined,
        cats: str(f.categories_csv ?? (Array.isArray(f.categories) ? f.categories.join(',') : '')) || undefined,
        items: rawItems.map(toItem).filter(Boolean)
          .map((it) => ({ ...it, food: matchFlyerItem(it.name).length ? 1 : undefined }))
          .filter((it) => it.food || !(store.general || store.ref)),
      };
      if (!flyers[id].items.length) { delete flyers[id]; ids.pop(); }
    }
    regions[region.id] = { label: region.label, postal: region.postal.slice(0, 3), flyers: ids };
  }

  const det = await addDetails(flyers, previous);
  const count = Object.values(flyers).reduce((n, f) => n + f.items.length, 0);
  const lines = Object.values(flyers).map((f) => `| ${f.merchant} | ${f.from.slice(0, 10)} → ${f.to.slice(0, 10)} | ${f.items.length} |`).join('\n');
  await summary(`## Flyers\n\n${Object.keys(flyers).length} flyers, ${count} priced items, ${Object.keys(regions).length}/${REGIONS.length} regions. Item details: ${det.done} fetched, ${det.failed} failed, ${det.pending} left for next run.\n\n| store | valid | items |\n|---|---|---|\n${lines}\n${errors.length ? '\nErrors:\n' + errors.map((e) => '- ' + e).join('\n') : ''}\n`);

  // Never replace good data with an empty download (API hiccup): keep last week's file.
  if (!count) {
    console.error('No flyer items downloaded; keeping the previous data file.');
    process.exit(previous ? 0 : 1);
  }
  const { writeFile } = await import('node:fs/promises');
  // Keep the old timestamp when nothing changed so the nightly job makes no empty commit.
  const same = previous && serialise({ ...previous, fetchedAt: '' }) === serialise({ fetchedAt: '', regions, flyers });
  await writeFile(OUT, serialise({ fetchedAt: same ? previous.fetchedAt : new Date().toISOString(), regions, flyers }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
  const { updateHistory } = await import('./history.mjs');
  await updateHistory(); // remember this week's prices as future reference prices
}
