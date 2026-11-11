// Polite HTTP helpers: identifies as a bot, honours robots.txt, rate-limits per host.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const UA = process.env.BOT_UA || 'Mozilla/5.0 (compatible; RecipeIndexBot/0.1; recipe metadata indexer)';
const UA_TOKEN = 'recipeindexbot';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastHit = new Map();

/** GET with a per-host minimum delay, timeout and small retry. Returns { status, text }. */
export async function get(url, { delayMs = 1200, timeoutMs = 25000, retries = 1, accept } = {}) {
  const host = new URL(url).host;
  for (let attempt = 0; ; attempt++) {
    const wait = (lastHit.get(host) || 0) + delayMs - Date.now();
    lastHit.set(host, Date.now() + Math.max(0, wait));
    if (wait > 0) await sleep(wait);
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: accept || 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8', 'accept-language': 'fr-CA,fr;q=0.9,en;q=0.8' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      if (res.status >= 500 && attempt < retries) { await sleep(3000); continue; }
      return { status: res.status, text, url: res.url };
    } catch (err) {
      if (attempt < retries) { await sleep(3000); continue; }
      return { status: 0, text: '', error: String(err?.cause?.code || err?.message || err) };
    }
  }
}

/** Minimal robots.txt parser (Allow/Disallow with * and $, Crawl-delay, Sitemap). */
export function parseRobots(txt) {
  const groups = [];
  const sitemaps = [];
  let cur = null;
  let lastWasAgent = false;
  for (const line of txt.split(/\r?\n/)) {
    const clean = line.replace(/#.*/, '').trim();
    const m = clean.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'sitemap') { sitemaps.push(val); continue; }
    if (key === 'user-agent') {
      if (!lastWasAgent) { cur = { agents: [], rules: [], delay: null }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === 'allow' || key === 'disallow') cur.rules.push({ allow: key === 'allow', path: val });
    if (key === 'crawl-delay') cur.delay = parseFloat(val);
  }
  const group = groups.find((g) => g.agents.some((a) => a !== '*' && UA_TOKEN.includes(a))) || groups.find((g) => g.agents.includes('*')) || { rules: [], delay: null };
  const toRe = (p) => new RegExp('^' + p.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$').replace(/\$$/, '$'));
  const rules = group.rules.filter((r) => r.path).map((r) => ({ ...r, re: toRe(r.path), len: r.path.length }));
  return {
    sitemaps,
    delayMs: group.delay ? Math.min(group.delay, 10) * 1000 : null,
    allowed(url) {
      const u = new URL(url);
      const path = u.pathname + u.search;
      let best = null;
      for (const r of rules) if (r.re.test(path) && (!best || r.len > best.len || (r.len === best.len && r.allow))) best = r;
      return best ? best.allow : true;
    },
  };
}

export async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 1) + '\n');
}

// Everything worth knowing about a run also lands in data/last-run.md, which is
// committed with the data so a failed source can be diagnosed without opening CI logs.
const REPORT = 'data/last-run.md';
async function report(text) {
  const { appendFile } = await import('node:fs/promises');
  await mkdir(dirname(REPORT), { recursive: true });
  await appendFile(REPORT, text + '\n');
}

export async function log(...args) {
  const msg = args.join(" ");
  console.log(msg);
  await report('    ' + String(msg).replace(/\n/g, '\n    '));
}

export async function summary(md) {
  console.log(md);
  await report(md);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  }
}
