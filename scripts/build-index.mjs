// Turns the raw gathered data (data/*.json) into what the web app loads
// (public/data/*.json): ingredient lines matched to canonical ingredients, flyer items
// normalised to a price per gram, baseline prices mapped to ingredients.
import { readJson, writeJson } from './lib/http.mjs';
import { parseIngredientLine, matchIngredient, matchFlyerItem } from '../shared/match.js';
import { unitPrice } from '../shared/price.js';
import { classify } from '../shared/taxonomy.js';
import { ING_BY_ID } from '../shared/ingredients.js';
import { SOURCES } from './sources.mjs';
import { STORES, loadFlyers } from './fetch-flyers.mjs';

const numOf = (v) => {
  const m = String(v ?? '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export function buildRecipes(raw) {
  return raw.map((r) => {
    const ings = r.ingredients.map(parseIngredientLine);
    const n = r.nutrition || {};
    // Published nutrition only (per serving, as stated by the source). Never computed.
    const macros = r.nutrition ? {
      kcal: numOf(n.calories), protein: numOf(n.proteinContent), carbs: numOf(n.carbohydrateContent),
      fat: numOf(n.fatContent), fiber: numOf(n.fiberContent), sugar: numOf(n.sugarContent),
      sodium: numOf(n.sodiumContent), satFat: numOf(n.saturatedFatContent), serving: n.servingSize || null,
    } : null;
    const time = r.totalMin ?? ((r.prepMin ?? 0) + (r.cookMin ?? 0) || null);
    const { ingredients, nutrition, ...rest } = r;
    return { ...rest, time, macros: macros && macros.kcal != null ? macros : null, ings, tax: classify(r, ings) };
  });
}

export function buildFlyers(data) {
  if (!data) return { fetchedAt: null, regions: {}, stores: [], items: [] };
  const items = [];
  const flyerStore = {};
  for (const f of Object.values(data.flyers)) {
    flyerStore[f.id] = f.store;
    for (const it of f.items) {
      const ings = matchFlyerItem(it.name);
      if (!ings.length && f.general) continue;
      const pg = {};
      let basis;
      for (const ing of ings) {
        const up = unitPrice(it, ING_BY_ID[ing]);
        // Without the item's price text we cannot tell "each" from "per lb": trust only printed sizes.
        if (!up || (!it.d && up.basis !== 'size')) continue;
        pg[ing] = +up.perG.toFixed(6);
        basis ||= up.basis;
      }
      const { food, d, ...pub } = it;
      items.push({
        ...pub, flyer: f.id, store: f.store,
        from: (it.from || f.from || '').slice(0, 10), to: (it.to || f.to || '').slice(0, 10),
        ing: ings[0], ings: ings.length > 1 ? ings : undefined,
        pg: Object.keys(pg).length ? pg : undefined, perG: pg[ings[0]], basis,
      });
    }
  }
  const present = new Set(Object.values(flyerStore));
  const regions = {};
  for (const [id, r] of Object.entries(data.regions)) {
    regions[id] = { label: r.label, flyers: r.flyers, stores: [...new Set(r.flyers.map((f) => flyerStore[f]).filter(Boolean))] };
  }
  return {
    fetchedAt: data.fetchedAt, source: data.source, regions,
    stores: STORES.filter((s) => present.has(s.id)).map(({ id, name }) => ({ id, name })),
    items,
  };
}

export function buildBaseline(data) {
  if (!data) return { source: null, prices: {} };
  const byIng = {};
  for (const p of data.products) {
    const ing = matchIngredient(p.name, { flyer: true });
    if (!ing) continue;
    const post = /per kilogram/i.test(p.name) ? '/kg' : '';
    const up = unitPrice({ price: p.value, post, name: p.name.replace(/per kilogram/i, '') }, ING_BY_ID[ing]);
    if (!up) continue;
    (byIng[ing] ||= []).push({ perG: up.perG, label: p.name, date: p.date });
  }
  const prices = {};
  for (const [ing, list] of Object.entries(byIng)) {
    list.sort((a, b) => a.perG - b.perG);
    const mid = list[Math.floor((list.length - 1) / 2)];
    prices[ing] = { perG: +mid.perG.toFixed(6), label: mid.label, date: mid.date };
  }
  return { source: data.source, url: data.url, refDate: data.refDate, prices };
}

async function main() {
  const recipes = buildRecipes(await readJson('data/recipes.json', []));
  const flyers = buildFlyers(await loadFlyers('data/flyers.json'));
  const baseline = buildBaseline(await readJson('data/baseline.json', null));
  await writeJson('public/data/recipes.json', recipes);
  await writeJson('public/data/flyers.json', flyers);
  await writeJson('public/data/meta.json', {
    builtAt: new Date().toISOString(),
    baseline,
    sources: SOURCES.map(({ id, name, home, lang }) => ({ id, name, home, lang })),
  });
  const lines = recipes.flatMap((r) => r.ings);
  const matched = lines.filter((l) => l.ing).length;
  const weighed = lines.filter((l) => l.g != null).length;
  const priced = flyers.items.filter((i) => i.pg).length;
  console.log(`index: ${recipes.length} recipes (${recipes.filter((r) => r.macros).length} with nutrition), ` +
    `${lines.length} ingredient lines (${matched} matched, ${weighed} with a weight), ` +
    `${flyers.items.length} flyer items (${priced} unit-priced), ${Object.keys(baseline.prices).length} baseline prices`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
