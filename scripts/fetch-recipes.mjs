// Gathers recipes from the sites in sources.mjs.
//
// Rules this script follows:
//  * Only the publisher's own schema.org/Recipe JSON-LD is read. Fields are copied
//    verbatim; a missing field stays missing. Nothing is invented or filled in.
//  * robots.txt is honoured and requests are rate-limited per host.
//  * The preparation steps are NOT copied: the app links to the original page for the
//    method (ingredient lists and nutrition are facts; the written method is the
//    author's work). Only the number of steps is recorded.
//  * Incremental: recipes already in data/recipes.json are kept, never re-fetched.
import { createHash } from 'node:crypto';
import { get, parseRobots, readJson, writeJson, summary } from './lib/http.mjs';
import { SOURCES, SLUG_BUCKETS } from './sources.mjs';

const OUT = 'data/recipes.json';
const SKIP = 'data/recipes-skip.json';
const ONLY = process.env.SOURCES ? new Set(process.env.SOURCES.split(',')) : null;
const SCALE = Number(process.env.TARGET_SCALE || 1);
const MAX_SITEMAPS = 40;

const hash = (s) => createHash('sha1').update(s).digest('hex');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', ucirc: 'û', ugrave: 'ù', icirc: 'î', iuml: 'ï', euml: 'ë', oelig: 'œ', deg: '°', frac12: '½', frac14: '¼', frac34: '¾', rsquo: '’', lsquo: '‘', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»' };

export function clean(v) {
  if (v == null) return '';
  return String(v)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}
const list = (v) => (v == null ? [] : Array.isArray(v) ? v : String(v).split(/\s*,\s*/)).map(clean).filter(Boolean);

function isoMinutes(v) {
  const m = String(v || '').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

function image(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return image(v[v.length > 1 ? 1 : 0]) || image(v[0]);
  return v.url || v.contentUrl || null;
}

/** Extract the first schema.org Recipe object from a page. */
export function extractRecipe(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let data;
    try { data = JSON.parse(b[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '')); } catch {
      try { data = JSON.parse(b[1].replace(/[\u0000-\u001f]+/g, ' ')); } catch { continue; }
    }
    const stack = [data];
    while (stack.length) {
      const n = stack.pop();
      if (!n || typeof n !== 'object') continue;
      if (Array.isArray(n)) { stack.push(...n); continue; }
      const t = n['@type'];
      if ((Array.isArray(t) ? t : [t]).includes('Recipe') && n.recipeIngredient) return n;
      if (n['@graph']) stack.push(n['@graph']);
      if (n.mainEntity) stack.push(n.mainEntity);
    }
  }
  return null;
}

function countSteps(v) {
  if (!v) return 0;
  if (typeof v === 'string') return v.split(/\n+|(?<=\.)\s+(?=[A-ZÀ-Ý])/).filter((s) => s.trim()).length;
  if (!Array.isArray(v)) v = [v];
  let n = 0;
  for (const s of v) n += s?.itemListElement ? countSteps(s.itemListElement) : 1;
  return n;
}

export function toRecord(ld, url, source) {
  const ingredients = list(Array.isArray(ld.recipeIngredient) ? ld.recipeIngredient : [ld.recipeIngredient]);
  const name = clean(ld.name || ld.headline);
  if (!name || ingredients.length < 2) return null;
  const yieldRaw = clean(Array.isArray(ld.recipeYield) ? ld.recipeYield.find((y) => /\D/.test(String(y))) ?? ld.recipeYield[0] : ld.recipeYield);
  const yieldNum = String(Array.isArray(ld.recipeYield) ? ld.recipeYield[0] : ld.recipeYield ?? '').match(/\d+/);
  const nutrition = {};
  if (ld.nutrition && typeof ld.nutrition === 'object') {
    for (const [k, v] of Object.entries(ld.nutrition)) if (k !== '@type' && v != null && v !== '') nutrition[k] = clean(v);
  }
  const rating = ld.aggregateRating && (ld.aggregateRating.ratingValue != null)
    ? { value: Number(ld.aggregateRating.ratingValue), count: Number(ld.aggregateRating.ratingCount ?? ld.aggregateRating.reviewCount ?? 0) || null }
    : null;
  const author = clean((Array.isArray(ld.author) ? ld.author[0] : ld.author)?.name ?? (typeof ld.author === 'string' ? ld.author : ''));
  return {
    id: hash(url).slice(0, 12),
    url,
    source: source.id,
    lang: source.lang,
    name,
    image: image(ld.image),
    author: author || null,
    yield: yieldRaw || null,
    servings: yieldNum ? +yieldNum[0] : null,
    prepMin: isoMinutes(ld.prepTime),
    cookMin: isoMinutes(ld.cookTime),
    totalMin: isoMinutes(ld.totalTime),
    category: list(ld.recipeCategory),
    cuisine: list(ld.recipeCuisine),
    keywords: list(ld.keywords).slice(0, 25),
    ingredients,
    nutrition: Object.keys(nutrition).length ? nutrition : null,
    rating: rating && isFinite(rating.value) ? rating : null,
    steps: countSteps(ld.recipeInstructions),
    published: ld.datePublished ? String(ld.datePublished).slice(0, 10) : null,
    fetchedAt: new Date().toISOString().slice(0, 10),
  };
}

async function discover(src, robots) {
  const queue = [...new Set([...(robots.sitemaps || []), ...(src.sitemaps || [])])];
  queue.push(src.home + '/sitemap.xml', src.home + '/sitemap_index.xml', src.home + '/wp-sitemap.xml');
  let sample = null;
  const seen = new Set();
  const urls = new Set();
  let files = 0;
  // Walk recipe-looking sitemap files first.
  const score = (u) => (/recette|recipe|post/i.test(u) ? 0 : 1);
  while (queue.length && files < MAX_SITEMAPS && urls.size < 30000) {
    queue.sort((a, b) => score(a) - score(b));
    const sm = queue.shift();
    if (seen.has(sm)) continue;
    seen.add(sm);
    const res = await get(sm, { delayMs: robots.delayMs ?? 1000, accept: 'application/xml,text/xml,*/*' });
    files++;
    if (res.status !== 200) { if (res.status !== 404) console.log(`  [${src.id}] sitemap ${res.status || res.error} ${sm}`); if (res.status === 402) break; continue; }
    const locs = [...res.text.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([^<\]]+?)(?:\]\]>)?\s*<\/loc>/g)].map((m) => clean(m[1]));
    const isIndex = /<sitemapindex/i.test(res.text);
    if (!sample && locs.length && !isIndex) sample = locs[Math.min(3, locs.length - 1)];
    for (const loc of locs) {
      if (isIndex || /\.xml(\.gz)?(\?.*)?$/.test(loc)) {
        if (!loc.endsWith('.gz') && !/(tag|category|author|page|video|image|news|web-stories)[-_]?sitemap|sitemap[-_]?(tag|categor|author|page|video|image|news)/i.test(loc) && (!src.sitemapRe || src.sitemapRe.test(loc))) queue.push(loc);
      } else if (src.urlRe.test(loc)) urls.add(loc);
    }
  }
  console.log(`  [${src.id}] ${files} sitemap files, ${urls.size} recipe urls${urls.size ? '' : `; sample loc: ${sample}`}`);
  return [...urls];
}

/** Spread picks across dish-type buckets, then fill with a stable pseudo-random order. */
function order(urls) {
  const rest = urls.slice().sort((a, b) => (hash(a) < hash(b) ? -1 : 1));
  const buckets = SLUG_BUCKETS.map((re) => rest.filter((u) => re.test(u.toLowerCase())));
  const out = [];
  const used = new Set();
  for (let i = 0; i < 12; i++) {
    for (const b of buckets) {
      const u = b[i];
      if (u && !used.has(u)) { used.add(u); out.push(u); }
    }
  }
  for (const u of rest) if (!used.has(u)) out.push(u);
  return out;
}

async function runSource(src, existing, skip) {
  const have = existing.filter((r) => r.source === src.id).length;
  const need = Math.round(src.target * SCALE) - have;
  const stat = { id: src.id, have, added: 0, tried: 0, found: 0, note: '' };
  if (need <= 0) { stat.note = 'target reached'; return { stat, recipes: [] }; }

  const rb = await get(src.home + '/robots.txt', { delayMs: 500 });
  if ([0, 401, 402, 403, 429].includes(rb.status)) { stat.note = `robots.txt unreachable (${rb.status || rb.error})`; return { stat, recipes: [] }; }
  const robots = parseRobots(rb.status === 200 ? rb.text : '');
  const delayMs = Math.max(robots.delayMs ?? 0, 1500);

  const known = new Set(existing.map((r) => r.url));
  const urls = order((await discover(src, robots)).filter((u) => !known.has(u) && !skip[u] && robots.allowed(u)));
  stat.found = urls.length;
  const recipes = [];
  let streak = 0;
  for (const url of urls) {
    if (recipes.length >= need || stat.tried >= need * 3 + 10) break;
    stat.tried++;
    const res = await get(url, { delayMs });
    if (res.status !== 200 && stat.tried <= 2) console.log(`  [${src.id}] page ${res.status || res.error} ${url}`);
    if (res.status !== 200) {
      if ([401, 402, 403, 429, 0].includes(res.status) && ++streak >= 6) { stat.note = `blocked (${res.status || res.error})`; break; }
      if (res.status === 404 || res.status === 410) skip[url] = res.status;
      continue;
    }
    streak = 0;
    const ld = extractRecipe(res.text);
    const rec = ld && toRecord(ld, url, src);
    if (!rec) {
      if (!recipes.length && stat.tried <= 3) console.log(`  [${src.id}] no Recipe JSON-LD: ${url} (${res.text.length} bytes, ld+json blocks: ${(res.text.match(/application\/ld\+json/g) || []).length})`);
      skip[url] = 'no-recipe';
      continue;
    }
    recipes.push(rec);
  }
  stat.added = recipes.length;
  return { stat, recipes };
}

async function main() {
  const existing = await readJson(OUT, []);
  const skip = await readJson(SKIP, {});
  const sources = SOURCES.filter((s) => !ONLY || ONLY.has(s.id));
  const results = await Promise.all(sources.map((s) => runSource(s, existing, skip).catch((e) => ({ stat: { id: s.id, have: 0, added: 0, tried: 0, found: 0, note: 'error: ' + e.message }, recipes: [] }))));
  const all = existing.concat(results.flatMap((r) => r.recipes));
  const byUrl = new Map(all.map((r) => [r.url, r]));
  const out = [...byUrl.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  await writeJson(OUT, out);
  await writeJson(SKIP, skip);
  const rows = results.map(({ stat: s }) => `| ${s.id} | ${s.have} | ${s.found} | ${s.tried} | ${s.added} | ${s.note} |`).join('\n');
  await summary(`## Recipes\n\nTotal: **${out.length}** (with nutrition: ${out.filter((r) => r.nutrition).length})\n\n| source | had | urls found | tried | added | note |\n|---|---|---|---|---|---|\n${rows}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
