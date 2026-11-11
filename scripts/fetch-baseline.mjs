// Regular (non-sale) price baseline: Statistics Canada table 18-10-0245-01,
// "Monthly average retail prices for selected products", Québec rows, latest month.
// Used to price ingredients that are not in a flyer this week and to estimate savings.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson, writeJson, summary, UA } from './lib/http.mjs';

const URL_ZIP = 'https://www150.statcan.gc.ca/n1/tbl/csv/18100245-eng.zip';
const OUT = 'data/baseline.json';

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

async function main() {
  const previous = await readJson(OUT, null);
  let csv;
  try {
    const res = await fetch(URL_ZIP, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const dir = mkdtempSync(join(tmpdir(), 'statcan-'));
    const zip = join(dir, 't.zip');
    writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    csv = execFileSync('unzip', ['-p', zip, '18100245.csv'], { maxBuffer: 1 << 30 }).toString('utf8');
  } catch (e) {
    await summary(`## Baseline prices\n\nDownload failed (${e.message}); keeping previous file.\n`);
    process.exit(previous ? 0 : 0);
  }
  const lines = csv.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const head = parseCsvLine(lines[0]);
  const col = (n) => head.findIndex((h) => h.trim().toUpperCase() === n);
  const iDate = col('REF_DATE'), iGeo = col('GEO'), iProd = col('PRODUCTS'), iVal = col('VALUE');
  const latest = new Map();
  for (let i = 1; i < lines.length; i++) {
    const r = parseCsvLine(lines[i]);
    if (r[iGeo] !== 'Quebec') continue;
    const value = Number(r[iVal]);
    if (!isFinite(value) || value <= 0) continue;
    const cur = latest.get(r[iProd]);
    if (!cur || r[iDate] > cur.date) latest.set(r[iProd], { name: r[iProd], value, date: r[iDate] });
  }
  const products = [...latest.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (!products.length) { await summary('## Baseline prices\n\nNo Québec rows parsed; keeping previous file.\n'); return; }
  const refDate = products.reduce((m, p) => (p.date > m ? p.date : m), '');
  await writeJson(OUT, { source: 'Statistique Canada, tableau 18-10-0245-01', url: 'https://www150.statcan.gc.ca/t1/tbl1/fr/tv.action?pid=1810024501', geo: 'Québec', refDate, fetchedAt: new Date().toISOString(), products });
  await summary(`## Baseline prices\n\n${products.length} Québec products, reference month ${refDate}.\n`);
}

await main();
