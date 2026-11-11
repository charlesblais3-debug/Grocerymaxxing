// Turns the raw gathered data (data/*.json) into what the web app loads
// (public/data/*.json): ingredient lines matched to canonical ingredients, flyer items
// normalised to a price per gram, baseline prices mapped to ingredients.
import { writeFile, mkdir } from 'node:fs/promises';
import { readJson } from './lib/http.mjs';

// Compact output: these files are downloaded by every visitor.
async function writeJson(path, data) {
  await mkdir('public/data', { recursive: true });
  await writeFile(path, JSON.stringify(data));
}
import { parseIngredientLine, matchIngredient, matchFlyerItem, forms } from '../shared/match.js';
import { unitPrice, regularRatio } from '../shared/price.js';
import { classify, isMealDish } from '../shared/taxonomy.js';
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
    // "12 muffins", "3 quarts": the yield is a count of things, not servings.
    const y = (r.yield || '').toLowerCase();
    const servingLike = !y || /^\d+$/.test(y.trim()) || /serv|portion|personne|people|person|meal|repas|bowl|bol|^\s*\d+\s*(à|to|-)\s*\d+\s*$|^\d+ \d+$/.test(y);
    if (!servingLike) rest.unitYield = 1;
    // A source default of "1 portion" on a recipe that weighs kilos is not a real serving count.
    const grams = ings.reduce((n, l) => n + (l.g || 0), 0);
    if (rest.servings === 1 && grams > 900) rest.servings = null;
    // "585 ml", "900 g": a volume or weight, not a number of servings.
    if (rest.unitYield && (rest.servings > 48 || /^\s*[\d.,/ ]+\s*(ml|l|g|kg|oz|lb|litres?|tasses?|cups?)\b/.test(y))) rest.servings = null;

    // Safety net: one ingredient weighing more than a whole plate per serving means the
    // quantity was misread. Leave the line unpriced instead of charging for it.
    if (rest.servings && !rest.unitYield) {
      for (const l of ings) {
        const def = ING_BY_ID[l.ing];
        if (!def || l.g == null) continue;
        const cap = def.free || /^broth_|milk$|canned_tomato|tomato_sauce|coconut_milk|wine/.test(def.id) ? 900 : def.cat === 'meat' || def.cat === 'fish' ? 500 : 450;
        if (l.g / rest.servings > cap) { l.g = null; l.odd = 1; }
      }
    }

    // --- Meals. A "portion" on a recipe site can be a 150-kcal bite; what matters when
    // cooking is the cost of a plate that makes a meal. For meal dishes the published
    // serving is kept when it is meal-sized, otherwise the recipe is re-divided into
    // meals of about 550 kcal (published nutrition) or about 450 g of food (weights).
    const tax = classify(r, ings);
    let meals = null;
    let mealBasis = null;
    if (isMealDish(tax)) {
      const food = ings.reduce((n, l) => n + (l.g && !ING_BY_ID[l.ing]?.free ? l.g * (/^broth_/.test(l.ing) ? 0.3 : 1) : 0), 0);
      const weighed = ings.filter((l) => l.g != null).length / Math.max(1, ings.filter((l) => !l.nq).length);
      const half = (x) => Math.max(1, Math.round(x * 2) / 2);
      const s = rest.unitYield ? null : rest.servings;
      const byWeight = weighed >= 0.7 && food > 0 ? food / 450 : 0;
      if (macros?.kcal && s) {
        if (macros.kcal >= 350) { meals = s; mealBasis = 'source'; } else {
          // Published calories that contradict the weight of food on the plate (a "1 kcal"
          // typo, a marinade counted without its chicken) give way to the weight.
          const byKcal = (macros.kcal * s) / 550;
          if (byWeight * 0.75 > byKcal) { meals = half(Math.min(s, byWeight * 0.75)); mealBasis = 'weight'; } else { meals = half(byKcal); mealBasis = 'kcal'; }
        }
      } else if (weighed >= 0.7 && food > 0) {
        const per = s ? food / s : 0;
        if (s && per >= 280 && per <= 900) { meals = s; mealBasis = 'source'; } else { meals = half(food / 450); mealBasis = 'weight'; }
      } else if (s) { meals = s; mealBasis = 'source'; }
      if (mealBasis === 'kcal' && meals > s) { meals = s; mealBasis = 'source'; }
    }
    rest.meals = meals || undefined;
    rest.mealBasis = meals ? mealBasis : undefined;
    return { ...rest, time, macros: macros && macros.kcal != null ? macros : null, ings, tax };
  });
}

export function buildFlyers(data) {
  if (!data) return { fetchedAt: null, regions: {}, stores: [], items: [] };
  const items = [];
  const seen = new Map();
  const flyerStore = {};
  const kept = new Set(STORES.map((s) => s.id));
  for (const f of Object.values(data.flyers)) {
    if (!kept.has(f.store)) continue; // flyers gathered before the store list was narrowed
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
      // The same product repeats in every regional edition of a banner's flyer: keep one copy.
      const key = `${f.store}|${it.name}|${it.price}|${it.pre || ''}|${it.post || ''}|${(it.from || f.from).slice(0, 10)}|${(it.to || f.to).slice(0, 10)}`;
      const dup = seen.get(key);
      if (dup) { dup.flyers.push(f.id); continue; }
      const row = {
        ...pub, flyers: [f.id], store: f.store,
        from: (it.from || f.from || '').slice(0, 10), to: (it.to || f.to || '').slice(0, 10),
        ing: ings[0], ings: ings.length > 1 ? ings : undefined,
        fm: ings.length && forms(it.name).length ? forms(it.name) : undefined,
        pg: Object.keys(pg).length ? pg : undefined, perG: pg[ings[0]], basis,
        rr: Object.keys(pg).length ? regularRatio(it) || undefined : undefined,
      };
      seen.set(key, row);
      items.push(row);
    }
  }
  const present = new Set(Object.values(flyerStore));
  const regions = {};
  for (const [id, r] of Object.entries(data.regions)) {
    regions[id] = { label: r.label, flyers: r.flyers.filter((f) => flyerStore[f]), stores: [...new Set(r.flyers.map((f) => flyerStore[f]).filter(Boolean))] };
  }
  return {
    fetchedAt: data.fetchedAt, source: data.source, regions,
    stores: STORES.filter((s) => present.has(s.id)).map(({ id, name }) => ({ id, name })),
    items,
  };
}

// Statistics Canada product labels the generic matcher gets wrong or cannot place.
const STATCAN = [
  [/^Beef stewing/i, ['beef_stew']], [/^Beef (striploin|top sirloin)/i, ['beef_steak']], [/^Beef rib/i, []],
  [/^Block cheese/i, ['cheddar']], [/^Canned beans and lentils/i, ['black_beans', 'kidney_beans', 'chickpeas']],
  [/^Cream,/i, ['cream_35']], [/^Dried lentils/i, ['lentils']], [/^Peppers/i, ['bell_pepper']],
  [/^Nut milk/i, []], [/^Chicken drumsticks/i, ['chicken_drumstick']], [/^Chicken thigh/i, ['chicken_thigh']], [/^Canned (salmon|peach|pear|soup)/i, []], [/^Salad greens/i, []],
];

export function buildBaseline(data) {
  if (!data) return { source: null, prices: {} };
  const byIng = {};
  for (const p of data.products) {
    const rule = STATCAN.find(([re]) => re.test(p.name));
    for (const ing of rule ? rule[1] : [matchIngredient(p.name, { flyer: true })].filter(Boolean)) {
    const post = /per kilogram/i.test(p.name) ? '/kg' : '';
    const up = unitPrice({ price: p.value, post, name: p.name.replace(/per kilogram/i, '') }, ING_BY_ID[ing]);
    if (!up) continue;
    (byIng[ing] ||= []).push({ perG: up.perG, label: p.name, date: p.date });
    }
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
