// Rebuilds data/price-history.json from every version of data/flyers.json in git history.
// Run it after any change to how flyer items are matched or priced, so the reference prices
// never carry observations recorded under older, faulty rules.
import { execFileSync } from 'node:child_process';
import { writeJson } from './lib/http.mjs';
import { mergeHistory } from './history.mjs';

const commits = execFileSync('git', ['log', '--format=%H', '--reverse', '--', 'data/flyers.json']).toString().trim().split('\n').filter(Boolean);
let hist = { weeks: {} };
for (const c of commits) {
  let d;
  try { d = JSON.parse(execFileSync('git', ['show', `${c}:data/flyers.json`], { maxBuffer: 1 << 28 }).toString()); } catch { continue; }
  for (const [id, f] of Object.entries(d.flyers || {})) if (f.head) d.flyers[id] = { ...f.head, items: f.items };
  hist = mergeHistory(hist, d);
}
await writeJson('data/price-history.json', hist);
const n = Object.values(hist.weeks).reduce((a, w) => a + w.length, 0);
console.log(`rebuilt from ${commits.length} flyer snapshots: ${Object.keys(hist.weeks).length} weeks, ${n} observations`);
