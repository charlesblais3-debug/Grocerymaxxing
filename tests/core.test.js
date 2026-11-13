// Test inputs below are synthetic lines used only to exercise the parsers.
// They are not recipes and never ship in the app's data.
import { describe, it, expect } from 'vitest';
import { parseQuantity } from '../shared/text.js';
import { matchIngredient, matchFlyerItem, matchFlyerItemFull, parseIngredientLine } from '../shared/match.js';
import { unitPrice } from '../shared/price.js';
import { ING_BY_ID } from '../shared/ingredients.js';
import { bestOffers, costRecipe } from '../shared/cost.js';
import { classify } from '../shared/taxonomy.js';
import { parseRobots } from '../scripts/lib/http.mjs';
import { extractRecipe, toRecord } from '../scripts/fetch-recipes.mjs';
import { storeFor, toItem } from '../scripts/fetch-flyers.mjs';

describe('parseQuantity', () => {
  it('prefers metric over cups', () => expect(parseQuantity('1 1/2 tasse (375 ml) de lait').ml).toBe(375));
  it('reads french spoons', () => expect(parseQuantity("2 c. à soupe d'huile d'olive").ml).toBe(30));
  it('reads tsp', () => expect(parseQuantity('1 c. à thé de sel').ml).toBe(5));
  it('reads weights', () => expect(parseQuantity('454 g (1 lb) de boeuf haché').g).toBe(454));
  it('reads pounds', () => expect(parseQuantity('2 lbs chicken thighs').g).toBeCloseTo(907.2));
  it('multiplies cans', () => expect(parseQuantity('2 boîtes de 398 ml de tomates en dés').ml).toBe(796));
  it('multiplies US cans', () => expect(parseQuantity('2 (15 oz) cans black beans').g).toBeCloseTo(850.5));
  it('unicode fractions', () => expect(parseQuantity('½ cup sugar').ml).toBeCloseTo(118.5));
  it('ranges keep the low bound', () => expect(parseQuantity('2 à 3 carottes').count).toBe(2));
  it('cloves', () => expect(parseQuantity("3 gousses d'ail")).toMatchObject({ count: 3, countUnit: 'gousse' }));
  it('nothing', () => expect(parseQuantity('Sel et poivre').count).toBeNull());
});

describe('matchIngredient', () => {
  const m = (t, o) => matchIngredient(t, o);
  it('longest phrase wins', () => {
    expect(m('1 tasse de bouillon de poulet')).toBe('broth_chicken');
    expect(m("2 c. à soupe d'huile d'olive")).toBe('olive_oil');
    expect(m('2 poitrines de poulet désossées')).toBe('chicken_breast');
    expect(m('1 can diced tomatoes')).toBe('canned_tomato');
    expect(m('3 cloves garlic, minced')).toBe('garlic');
    expect(m('2 oignons verts hachés')).toBe('green_onion');
    expect(m('1 lb ground beef')).toBe('beef_ground');
  });
  it('flyer names', () => {
    expect(m('POITRINES DE POULET DÉSOSSÉES', { flyer: true })).toBe('chicken_breast');
    expect(m('Bœuf haché mi-maigre', { flyer: true })).toBe('beef_ground');
    expect(m('Soupe poulet et nouilles', { flyer: true })).toBeNull();
    expect(m('Croustilles saveur oignon', { flyer: true })).toBeNull();
    expect(m('Poulet', { flyer: true })).toBeNull(); // too vague
    expect(m('Sauce tomate Classico', { flyer: true })).toBe('tomato_sauce');
    expect(m('Fromage à la crème Philadelphia', { flyer: true })).toBe('cream_cheese');
  });
  it('grams', () => {
    expect(parseIngredientLine('2 oignons hachés').g).toBe(300);
    expect(parseIngredientLine("3 gousses d'ail").g).toBe(15);
    expect(parseIngredientLine('1 tasse de farine').g).toBeCloseTo(132.5);
    expect(parseIngredientLine('Sel et poivre').g).toBeNull();
  });
});

describe('unitPrice', () => {
  const chicken = ING_BY_ID.chicken_breast;
  it('per lb', () => expect(unitPrice({ price: 4.99, post: '/lb' }, chicken).perG).toBeCloseTo(0.011, 3));
  it('per kg', () => expect(unitPrice({ price: 11, post: '/kg' }, chicken).perG).toBeCloseTo(0.011, 3));
  it('package size', () => expect(unitPrice({ price: 4.54, name: 'Beurre 454 g' }, ING_BY_ID.butter).perG).toBeCloseTo(0.01));
  it('multi-buy', () => expect(unitPrice({ price: 5, pre: '2/', name: 'Pâtes 900 g' }, ING_BY_ID.pasta).perG).toBeCloseTo(2.5 / 900));
  it('each with pack', () => expect(unitPrice({ price: 3.96, name: 'Oeufs gros' }, ING_BY_ID.egg).perG).toBeCloseTo(3.96 / 660));
  it('rejects nonsense', () => expect(unitPrice({ price: 999, name: 'Beurre 1 g' }, ING_BY_ID.butter)).toBeNull());
  it('statcan label', () => expect(unitPrice({ price: 10, name: 'Milk, 4 litres' }, ING_BY_ID.milk).perG).toBeCloseTo(10 / 4120, 5));
});

describe('costing', () => {
  const items = [
    { pg: { chicken_breast: 0.01 }, store: 'maxi', to: '2030-01-07' },
    { pg: { chicken_breast: 0.008 }, store: 'iga', to: '2030-01-07' },
    { pg: { onion: 0.002 }, store: 'maxi', to: '2020-01-01' }, // expired
    { pg: { cucumber: 0.04 }, store: 'maxi', to: '2030-01-07' }, // 10x the regular price: not a deal
  ];
  const recipe = { servings: 4, ings: [{ raw: 'a', ing: 'chicken', g: 400 }, { raw: 'b', ing: 'onion', g: 150 }, { raw: 'c', ing: 'water', g: 500 }, { raw: 'd', ing: null, g: null }] };
  it('uses only selected stores and current offers', () => {
    const offers = bestOffers(items, new Set(['maxi']), '2030-01-01', { cucumber: { perG: 0.004 } });
    expect(offers.has('cucumber')).toBe(false);
    expect(offers.get('chicken_breast')[0].perG).toBe(0.01);
    expect(offers.has('onion')).toBe(false);
    const c = costRecipe(recipe, offers, { chicken_breast: { perG: 0.015 } });
    expect(c.savingsPct).toBeCloseTo(2 / 6);
    expect(c.total).toBeCloseTo(4);
    expect(c.per).toBeCloseTo(1);
    expect(c.perKind).toBe('serving');
    expect(c.priced).toBe(1);
    expect(c.countable).toBe(3);
    expect(c.savings).toBeCloseTo(2);
  });
  it('picks the cheapest store', () => expect(bestOffers(items, new Set(['maxi', 'iga']), '2030-01-01').get('chicken_breast')[0].store).toBe('iga'));
});

describe('taxonomy', () => {
  it('classifies', () => {
    const t = classify({ name: 'Soupe aux lentilles', category: ['Soupes'], keywords: [], cuisine: [] }, [{ ing: 'lentils' }, { ing: 'onion' }]);
    expect(t.meals).toContain('soup');
    expect(t.protein).toBe('plant');
    expect(t.diets).toContain('vegan');
    expect(classify({ name: 'Kimchi maison' }, [{ ing: 'cabbage' }, { ing: null }]).meals).toContain('preserve');
    expect(classify({ name: 'Tacos au poulet' }, [{ ing: 'chicken' }]).cuisines).toContain('mexicaine');
  });
});

describe('scraper helpers', () => {
  it('robots', () => {
    const r = parseRobots('User-agent: *\nDisallow: /recherche\nAllow: /recherche/ok\nCrawl-delay: 2\nSitemap: https://x.test/sitemap.xml');
    expect(r.allowed('https://x.test/recettes/1')).toBe(true);
    expect(r.allowed('https://x.test/recherche?q=1')).toBe(false);
    expect(r.allowed('https://x.test/recherche/ok')).toBe(true);
    expect(r.sitemaps).toEqual(['https://x.test/sitemap.xml']);
    expect(r.delayMs).toBe(2000);
  });
  it('json-ld extraction keeps fields verbatim and drops the method text', () => {
    const html = `<html><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":["Recipe"],"name":"Test &amp; essai","recipeYield":["4","4 portions"],"totalTime":"PT1H15M","recipeIngredient":["1 x","2 y"],"recipeInstructions":[{"@type":"HowToStep","text":"secret"}],"nutrition":{"@type":"NutritionInformation","calories":"250 kcal"},"recipeCategory":"Soupes, Plats"}]}</script></html>`;
    const rec = toRecord(extractRecipe(html), 'https://x.test/r/1', { id: 'x', lang: 'fr' });
    expect(rec).toMatchObject({ name: 'Test & essai', servings: 4, yield: '4 portions', totalMin: 75, steps: 1, category: ['Soupes', 'Plats'], nutrition: { calories: '250 kcal' } });
    expect(JSON.stringify(rec)).not.toContain('secret');
  });
  it('flyer mapping', () => {
    expect(storeFor('Super C').id).toBe('superc');
    expect(storeFor('Marché Tradition')).toMatchObject({ ref: true }); // price evidence only, never shown
    expect(storeFor('Pharmaprix')).toBeNull();
    expect(storeFor('Canadian Tire')).toBeNull();
    expect(toItem({ id: 1, name: 'X', price: '4.99', price_text: '/lb' })).toMatchObject({ price: 4.99, post: '/lb' });
    expect(toItem({ id: 1, name: 'X', price: '' })).toBeNull();
  });
});

describe('real-world formats seen in the data', () => {
  it('price text with both units', () => {
    expect(unitPrice({ price: 8.99, post: '/lb 19,82$/kg' }, ING_BY_ID.beef_ground).perG).toBeCloseTo(8.99 / 453.6, 5);
    expect(unitPrice({ price: 3.19, post: '/100 g 14,47$/lb' }, ING_BY_ID.ham).perG).toBeCloseTo(0.0319, 5);
    expect(unitPrice({ price: 4.99, post: 'lb' }, ING_BY_ID.chicken_breast).perG).toBeCloseTo(0.011, 3);
  });
  it('source cost notes and ranges', () => {
    expect(parseQuantity('2 onions ($0.50)').count).toBe(2);
    expect(parseQuantity('3/4 to 1 cup all-purpose flour * ($0.07)').ml).toBeCloseTo(177.75);
    expect(parseQuantity('1/2 scant tsp sea salt').ml).toBe(2.5);
  });
  it('plural forms and non-food', () => {
    expect(matchIngredient('200g radishes cut into matchsticks')).toBe('radish');
    expect(matchIngredient('2 tranches de pain')).toBe('bread');
    expect(matchIngredient('ailes de poulet')).toBe('chicken_wing');
    expect(matchIngredient("3 gousses d'ail")).toBe('garlic');
    expect(matchIngredient('Figurine Woody ou Buzz de Monsieur Patate', { flyer: true })).toBeNull();
    expect(matchFlyerItem('Carottes ou oignons jaunes | carrots or yellow onions')).toEqual(['carrot', 'onion']);
    expect(matchFlyerItem('Soda gingembre Canada Dry zéro sucre')).toEqual([]);
    expect(matchFlyerItem('UNIQUE CONCOMBRE DE MER CANADIEN, 454g')).toEqual([]);
    expect(matchFlyerItem("rôti de palette d'épaule de porc désossé | boneless pork shoulder blade roast")).toEqual(['pork_shoulder']);
    expect(unitPrice({ price: 64.97, name: 'concombre 454g' }, ING_BY_ID.cucumber)).toBeNull();
  });
});

describe('multipacks and alternatives', () => {
  it('does not double a printed total', () => {
    expect(parseQuantity('BOEUF HACHÉ MI-MAIGRE, 900 g (2x450 g)').g).toBe(900);
    expect(parseQuantity('Yogourt 4 x 100 g').g).toBe(400);
    expect(parseQuantity('Eau pétillante 12x355 mL').ml).toBe(4260);
  });
  it('alternatives stay in the aisle', () => {
    expect(matchFlyerItem('Courges poivrées, musquées, buttercups ou spaghettis')).toEqual(['squash']);
  });
});

describe('fixes from the first full data run', () => {
  it('hyphenated and spelled-out quantities', () => {
    expect(parseIngredientLine('one 14-ounce can crushed tomatoes').g).toBeCloseTo(396.9, 0);
    expect(parseIngredientLine('14-ounce can of black beans, drained').g).toBeCloseTo(396.9, 0);
    expect(parseIngredientLine('6-8 thick slices of sourdough bread').g).toBe(210);
    expect(parseIngredientLine('4 rashers smoked back bacon').g).toBe(80);
    expect(parseIngredientLine('une gousse d\'ail').g).toBe(5);
  });
  it('flyer look-alikes are rejected', () => {
    expect(matchFlyerItem('Piments en huile avec haricots noirs Lao Gan Ma')).not.toContain('black_beans');
    for (const n of ['STEAK DE CAPICOLLE DE PORC AUX 3 POIVRES', 'COCKTAIL DE TOMATE ET DE PALOURDES MOTT\'S', 'TOFU DESSERT SUNRISE', 'HALVA VANILLE', 'pochettes chinoises à la ciboulette']) {
      expect(matchFlyerItem(n), n).toEqual([]);
    }
    expect(matchFlyerItem('BŒUF HACHÉ MI-MAIGRE')).toEqual(['beef_ground']);
    expect(matchFlyerItem('FILET DE PORC, EMBALLAGE SOUS-VIDE')).toEqual(['pork_tenderloin']);
  });
  it('seasonings do not count against coverage', () => {
    const c = costRecipe({ servings: 2, ings: [{ raw: 'sel', ing: 'salt', g: null, nq: 1 }, { raw: 'x', ing: 'onion', g: 100 }] }, new Map(), { onion: { perG: 0.003 } });
    expect(c.countable).toBe(1);
    expect(c.coverage).toBe(1);
  });
});

it('flavour words after "ou" are not products', () => {
  expect(matchFlyerItem('Poulet rôti Mon marché fraîcheur barbecue ou ail et fines herbes')).toEqual([]);
  expect(matchFlyerItem('Xyz inconnu | fresh boneless chicken breasts')).toEqual(['chicken_breast']);
  expect(matchFlyerItem('ORANGES 3 LB, AVOCATS 5-6 UN., CITRONS 2 LB')).toEqual(['orange', 'avocado', 'lemon']);
});

it('microdata recipes are read verbatim, nested tags included', async () => {
  const { extractMicrodata, toRecord } = await import('../scripts/fetch-recipes.mjs');
  const html = `<div itemscope itemtype="https://schema.org/Recipe"><span itemprop="publisher" itemscope><meta itemprop="name" content="Le Site"></span><h1 itemprop="name">Essai</h1>
    <meta itemprop="recipeYield" content="4 portions"><time itemprop="totalTime" datetime="PT30M">30 min</time>
    <ul><li itemprop="recipeIngredient"><span><span>2</span> tasses</span> de <a href="#">lait</a></li><li itemprop="recipeIngredient">1 oignon</li></ul>
    <div itemprop="nutrition" itemscope><span itemprop="calories">250 kcal</span></div></div>`;
  const rec = toRecord(extractMicrodata(html), 'https://x.test/1', { id: 'x', lang: 'fr' });
  expect(rec).toMatchObject({ name: 'Essai', servings: 4, totalMin: 30, ingredients: ['2 tasses de lait', '1 oignon'] });
  expect(rec.nutrition.calories).toBe('250 kcal');
});

describe('second review round', () => {
  it('named count units are never priced as whole heads', () => {
    expect(parseIngredientLine('5 feuilles de laitue romaine déchiquetées').g).toBe(75);
    expect(parseIngredientLine('1 tête d\'ail').g).toBe(45);
    expect(parseIngredientLine('2 feuilles de laurier').g).toBeNull();
    expect(parseIngredientLine('1 botte de persil').g).toBe(60);
    expect(parseIngredientLine('1 boîte (769 ml) de tomates en dés aux épices italiennes').ing).toBe('canned_tomato');
  });
  it('product forms: sliced or fresh-ball cheese never stands in for grated cheese', async () => {
    const { pickOffer } = await import('../shared/cost.js');
    const { forms } = await import('../shared/match.js');
    const mk = (name, ing, perG) => ({ name, pg: { [ing]: perG }, store: 'maxi', fm: forms(name) });
    const offers = bestOffers([mk('Fromage cheddar en tranches Black Diamond', 'cheddar', 0.01), mk('Cheddar fort P\'tit Québec 400 g', 'cheddar', 0.02)], new Set(['maxi']), '2030-01-01');
    expect(pickOffer(offers, 'cheddar', forms('200 g de cheddar fort râpé')).perG).toBe(0.02);
    expect(pickOffer(offers, 'cheddar', forms('4 tranches de cheddar')).perG).toBe(0.01);
    expect(matchFlyerItem('FROMAGE BOCCONCINI SAPUTO')).toEqual(['bocconcini']);
    expect(matchIngredient('400 g de mozzarella râpée')).toBe('mozzarella');
  });
  it('cuisine needs real evidence', () => {
    const c = (name, cuisine = []) => classify({ name, cuisine, category: [], keywords: [] }, [{ ing: 'chicken' }]).cuisines;
    expect(c('Poulet au beurre et citron')).toEqual([]);
    expect(c('Butter chicken')).toEqual(['indienne']);
    expect(c('Salade de pâtes au pesto')).toEqual([]);
    expect(c('Tacos au poulet', ['Italienne'])).toEqual(['italienne']); // the source's word wins
  });
  it('dish type looks at where the word sits', () => {
    const m = (name) => classify({ name, category: [], keywords: [], cuisine: [] }, [{ ing: 'chicken' }]).meals;
    expect(m('Poulet sauce aux arachides')).toEqual(['main']);
    expect(m('Pain de viande classique')).toEqual(['main']);
    expect(m('Gingery Apple Cabbage Sauerkraut')).toContain('preserve');
    expect(m('7 Best Chicken Marinade Ideas')).toEqual(['main']);
  });
});

it('weekly ideas bundle varied recipes around one deal and skip staples', async () => {
  const { buildIdeas, anchorKind } = await import('../shared/synergy.js');
  expect(anchorKind('onion')).toBeNull();
  expect(anchorKind('spice')).toBeNull();
  expect(anchorKind('chicken_thigh')).toBe('protein');
  expect(anchorKind('cheddar')).toBe('cheese');
  const mk = (id, meal, extra) => ({ id, name: id, source: id, lang: 'fr', servings: 4, meals: 4, tax: { meals: [meal], cuisines: [], protein: 'chicken', diets: [] },
    ings: [{ raw: 'a', ing: 'chicken_thigh', g: 500 }, { raw: 'b', ing: extra, g: 200 }, { raw: 'c', ing: 'onion', g: 100 }] });
  const recipes = [mk('r1', 'soup', 'bell_pepper'), mk('r2', 'soup', 'broccoli'), mk('r3', 'main', 'bell_pepper'), mk('r4', 'pasta', 'broccoli'), mk('r5', 'salad', 'bell_pepper')];
  const offers = bestOffers(['chicken_thigh', 'bell_pepper', 'onion'].map((g) => ({ name: g, pg: { [g]: 0.004 }, store: 'maxi' })), new Set(['maxi']), '2030-01-01');
  const base = { chicken_thigh: { perG: 0.009 }, bell_pepper: { perG: 0.005 }, onion: { perG: 0.005 }, broccoli: { perG: 0.005 } };
  const costs = new Map(recipes.map((r) => [r.id, costRecipe(r, offers, base)]));
  const { anchors, bundles } = buildIdeas(recipes, costs, offers, base);
  expect(anchors[0].id).toBe('chicken_thigh');
  expect(anchors.map((a) => a.id)).not.toContain('onion');
  expect(bundles[0].recipes).toHaveLength(4);
  expect(new Set(bundles[0].recipes.map((r) => r.tax.meals[0])).size).toBeGreaterThanOrEqual(3);
  expect(bundles[0].shared[0]).toMatchObject({ id: 'chicken_thigh', count: 4, grams: 2000 });
});

it('store guide credits a store only for a clear win', async () => {
  const { storeGuide } = await import('../shared/stores.js');
  const mk = (ing, store, perG, name = ing) => ({ name, pg: { [ing]: perG }, store });
  const all = bestOffers([
    mk('chicken_breast', 'iga', 0.008), mk('chicken_breast', 'maxi', 0.011),   // IGA 27 % cheaper
    mk('beef_ground', 'maxi', 0.0100), mk('beef_ground', 'iga', 0.0102),       // too close to call
    mk('broccoli', 'superc', 0.003),                                           // only flyer, 40 % under regular
    mk('spice', 'maxi', 0.01),                                                 // never compared
  ], new Set(['iga', 'maxi', 'superc']), '2030-01-01');
  const g = storeGuide(all, { broccoli: { perG: 0.005 } }, ['iga', 'maxi', 'superc']);
  const by = Object.fromEntries(g.map((s) => [s.id, s]));
  expect(g[0].id).toBe('iga');
  expect(by.iga.wins.map((w) => w.ing)).toEqual(['chicken_breast']);
  expect(by.iga.wins[0].margin).toBeCloseTo(0.27, 2);
  expect(by.maxi.wins).toEqual([]);
  expect(by.superc.wins[0]).toMatchObject({ ing: 'broccoli', only: true });
});

describe('savings', () => {
  it('reads the regular price the flyer states', async () => {
    const { regularRatio } = await import('../shared/price.js');
    expect(regularRatio({ price: 4.99, was: 6.99 })).toBeCloseTo(1.401, 2);
    expect(regularRatio({ price: 3, story: "2$ d'économie" })).toBeCloseTo(1.667, 2);
    expect(regularRatio({ price: 5, story: "43% d'économie" })).toBeCloseTo(1.754, 2);
    expect(regularRatio({ price: 5, story: "Jusqu'à 70% d'économie" })).toBeNull();
    expect(regularRatio({ price: 5, story: '100 points' })).toBeNull();
  });
  it('a flyer price above the regular price is not a deal', () => {
    const offers = bestOffers([{ name: 'oeufs', pg: { egg: 0.012 }, store: 'superc' }, { name: 'poulet', pg: { chicken_breast: 0.01 }, store: 'superc', rr: 2 }], new Set(['superc']), '2030-01-01');
    const c = costRecipe({ servings: 2, ings: [{ raw: 'a', ing: 'egg', g: 100 }, { raw: 'b', ing: 'chicken_breast', g: 500 }] }, offers, { egg: { perG: 0.006 }, chicken_breast: { perG: 0.014 } });
    expect(c.lines[0]).toMatchObject({ src: 'base' });
    expect(c.lines[0].cost).toBeCloseTo(0.6);
    expect(c.deals).toBe(1);
    expect(c.lines[1].saved).toBeCloseTo(2); // against our reference price, not the retailer's claimed regular price
    expect(c.savingsPct).toBeCloseTo(2 / 7.6, 3);
  });
});

describe('pricing is consistent across stores', () => {
  const recipe = { servings: 4, ings: [{ raw: 'a', ing: 'chicken_whole', g: 1600 }, { raw: 'b', ing: 'mango', g: 600 }, { raw: 'c', ing: 'broth_chicken', g: 500 }, { raw: 'd', ing: 'kimchi', g: 100 }] };
  const base = { chicken_whole: { perG: 0.0064 }, mango: { perG: 0.004 }, broth_veg: { perG: 0.0016 } };
  const items = [{ name: 'mangue', pg: { mango: 0.003 }, store: 'a' }, { name: 'poulet entier', pg: { chicken_whole: 0.009 }, store: 'b' }];
  const cost = (stores) => costRecipe(recipe, bestOffers(items, new Set(stores), '2030-01-01', base), base);
  it('an ingredient without a deal is charged its reference price, never zero', () => {
    const none = cost([]);
    expect(none.lines.map((l) => l.src)).toEqual(['base', 'base', 'base', null]);
    expect(none.total).toBeCloseTo(1600 * 0.0064 + 600 * 0.004 + 500 * 0.0016);
  });
  it('a store with a deal costs less, and one with a dearer flyer price costs the same', () => {
    expect(cost(['a']).total).toBeCloseTo(cost([]).total - 600 * 0.001);
    expect(cost(['b']).total).toBeCloseTo(cost([]).total);
    expect(cost(['b']).deals).toBe(0);
    expect(cost(['a', 'b']).total).toBeLessThanOrEqual(cost(['a']).total);
  });
  it('a missing protein makes the price incomplete', async () => {
    const { complete } = await import('../shared/cost.js');
    const c = costRecipe({ servings: 4, ings: [{ raw: 'x', ing: 'duck', g: 800 }, { raw: 'y', ing: 'mango', g: 200 }] }, new Map(), base);
    expect(c.missing).toEqual(['duck']);
    expect(complete(c)).toBe(false);
  });
  it('reference prices: StatCan first, then the median of flyer prices actually seen', async () => {
    const { buildBaseline } = await import('../scripts/build-index.mjs');
    const statcan = { products: [{ name: 'Whole chicken, per kilogram', value: 6.39, date: '2026-09' }, { name: 'Chicken breasts, per kilogram', value: 14.39, date: '2026-09' }, { name: 'Ground beef, per kilogram', value: 16.43, date: '2026-09' }, { name: 'Eggs, 1 dozen', value: 4.09, date: '2026-09' }] };
    const history = { weeks: { '2026-11-05': [['maxi', 'ginger', 0.004, 0, 1], ['iga', 'ginger', 0.006, 0, 1], ['maxi', 'mango', 0.003, 0.005, 1], ['iga', 'mango', 0.003, 0, 1], ['maxi', 'kiwi', 0.004, 0, 1], ['maxi', 'chicken_whole', 0.004, 0, 1]] } };
    const { prices } = buildBaseline(statcan, history);
    expect(prices.chicken_whole).toMatchObject({ kind: 'statcan', perG: 0.00639 });
    expect(Object.keys(prices)).toEqual(expect.arrayContaining(['chicken_breast', 'beef_ground', 'egg']));
    expect(prices.mango).toMatchObject({ kind: 'flyer', perG: 0.003 }); // the retailer's claimed regular price (0.005) is ignored
    expect(prices.ginger).toMatchObject({ kind: 'flyer', perG: 0.005 }); // median of two products
    expect(prices.kiwi).toBeUndefined(); // one product is not enough evidence
  });
});

describe('planner, pantry, calculated macros, tags', () => {
  it('pantry items are not charged and stay consistent', () => {
    const r = { servings: 2, ings: [{ raw: 'a', ing: 'chicken_breast', g: 400 }, { raw: 'b', ing: 'onion', g: 100 }] };
    const base = { chicken_breast: { perG: 0.014 }, onion: { perG: 0.003 } };
    const c = costRecipe(r, new Map(), base, new Set(['onion']));
    expect(c.total).toBeCloseTo(5.6);
    expect(c.lines[1]).toMatchObject({ src: 'have', cost: 0 });
    expect(c.countable).toBe(1);
  });
  it('suggests a varied week within the budget, scaled to the household', async () => {
    const { suggestPlan, batchesFor } = await import('../shared/planner.js');
    const mk = (id, protein, total, meal = 'main') => ({ id, source: id, meals: 4, servings: 4, tax: { meals: [meal], cuisines: [], protein, diets: [] } });
    const recipes = [mk('a', 'chicken'), mk('b', 'chicken'), mk('c', 'beef'), mk('d', 'fish'), mk('e', 'plant'), mk('f', 'pork')];
    const cost = { a: 8, b: 9, c: 12, d: 14, e: 6, f: 10 };
    const costs = new Map(recipes.map((r) => [r.id, { total: cost[r.id], per: cost[r.id] / 4, perKind: 'meal', coverage: 1, missing: [], savingsPct: 0 }]));
    expect(batchesFor(recipes[0], 2)).toBe(0.5);
    expect(batchesFor(recipes[0], 6)).toBe(1.5);
    const plan = suggestPlan(recipes, costs, { budget: 30, people: 4, dinners: 5 });
    expect(plan.reduce((n, p) => n + p.cost, 0)).toBeLessThanOrEqual(30);
    expect(new Set(plan.map((p) => recipes.find((r) => r.id === p.id).tax.protein)).size).toBe(plan.length);
    expect(plan.map((p) => p.day)).toEqual(plan.map((_, i) => i));
  });
  it('calculates macros only when the recipe is well understood', async () => {
    const { computeNutrition } = await import('../shared/nutrition.js');
    const isP = (id) => ['chicken_breast', 'duck'].includes(id);
    const ok = computeNutrition([{ ing: 'chicken_breast', g: 400 }, { ing: 'rice', g: 200 }, { ing: 'olive_oil', g: 20 }, { ing: 'salt', nq: 1 }], isP);
    expect(ok.kcal).toBeCloseTo(480 + 730 + 176.8, 0);
    expect(ok.protein).toBeCloseTo(90 + 14.2, 0);
    expect(computeNutrition([{ ing: 'chicken_breast', g: null }, { ing: 'rice', g: 200 }, { ing: 'onion', g: 100 }, { ing: 'carrot', g: 100 }], isP)).toBeNull();
    expect(computeNutrition([{ ing: null, g: null }, { ing: 'rice', g: 200 }, { ing: 'onion', g: 100 }], isP)).toBeNull();
  });
  it('diet and meal-prep tags', () => {
    const c = (name, ings, extra = {}) => classify({ name, category: [], keywords: [], cuisine: [], ...extra }, ings.map((ing) => ({ ing })));
    expect(c('Riz au poulet', ['chicken_breast', 'rice', 'onion']).diets).toEqual(expect.arrayContaining(['glutenfree', 'dairyfree', 'nutfree']));
    expect(c('Pâtes au fromage', ['pasta', 'cheddar']).diets).not.toContain('glutenfree');
    expect(c('Mystère', ['rice', null]).diets).toEqual([]);
    expect(c('Chicken Meal Prep Bowls', ['chicken_breast']).prep).toBe(true);
    expect(c('Poulet rôti', ['chicken_breast']).prep).toBeUndefined();
  });
});

describe('no substitutions between different foods', () => {
  const mk = (name, store = 'a') => { const pg = {}; const seg = {}; for (const h of matchFlyerItemFull(name)) { pg[h.pk] = 0.004; seg[h.pk] = h.seg; } return { name, pg, seg, store }; };
  const line = (raw) => parseIngredientLine(raw);
  // Every food here has a reference price (flyers only lower one), so a line is 'flyer' when
  // the right offer applies and 'base' when no offer for that food exists.
  const REF = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? { perG: 0.01, kind: 'statcan' } : undefined), has: () => true });
  const price = (raw, items, base = REF) => costRecipe({ servings: 2, ings: [line(raw)] }, bestOffers(items, new Set(['a']), '2030-01-01', base), base).lines[0];
  it('a plum deal never prices peaches, nor dates raisins, nor pecans walnuts', () => {
    expect(price('4 pêches', [mk('PRUNES NOIRES')]).src).toBe('base');
    expect(price('4 prunes', [mk('PRUNES NOIRES')]).src).toBe('flyer');
    expect(price('1 tasse de raisins secs', [mk('dattes entières dénoyautées')]).src).toBe('base');
    expect(price('1 tasse de noix de Grenoble', [mk('Pacanes en moitiés')]).src).toBe('base');
    expect(price('200 g de morue', [mk('Filets de tilapia')]).src).toBe('base');
    expect(price('1 tasse de quinoa', [mk('Boulgour Aoun')]).src).toBe('base');
    expect(price('2 c. à soupe de miel', [mk('Mélasse Grandma 675 g')]).src).toBe('base');
    expect(price('500 g de dinde hachée', [mk('Poulet haché extra maigre')]).src).toBe('base');
  });
  it('a generic request accepts any member', () => {
    expect(price('1 tasse de noix hachées', [mk('Pacanes en moitiés')]).src).toBe('flyer');
    expect(price('400 g de poisson blanc', [mk('Filets de tilapia')]).src).toBe('flyer');
  });
  it('a shared flyer line is shown as the part that matches', async () => {
    const { offerName } = await import('../src/ui.jsx');
    const l = price('2 mangues', [mk('mangue rouge, fruit de la passion')]);
    expect(l.src).toBe('flyer');
    expect(offerName(l.offer, 'fr')).toBe('Mangue rouge');
  });
  it('reference prices do not cross members either', async () => {
    const { buildBaseline } = await import('../scripts/build-index.mjs');
    const { prices } = buildBaseline(null, { weeks: { w: [['maxi', 'peach~prune', 0.008, 0, 1], ['iga', 'peach~prune', 0.009, 0, 1], ['maxi', 'walnuts~pacane', 0.03, 0, 1], ['iga', 'walnuts~pacane', 0.032, 0, 1]] } });
    const cost = (raw) => costRecipe({ servings: 1, ings: [line(raw)] }, new Map(), prices).lines[0];
    expect(cost('4 pêches').src).toBeNull();
    expect(cost('4 prunes').src).toBe('base');
    expect(cost('100 g de noix').src).toBe('base'); // generic: median of the members seen
    expect(cost('100 g de noix de Grenoble').src).toBeNull();
  });
});

describe('deal score and plan refinements', () => {
  it('scores the price itself, with a bonus for a historic low', async () => {
    const { dealScore } = await import('../shared/score.js');
    const base = { onion: { perG: 0.004 } };
    expect(dealScore({ pk: 'onion', perG: 0.004 }, base, {})).toBe(3);
    expect(dealScore({ pk: 'onion', perG: 0.0028 }, base, {})).toBe(8); // 30 % under
    expect(dealScore({ pk: 'onion', perG: 0.006 }, base, {})).toBe(1); // dearer than usual
    expect(dealScore({ pk: 'kiwi', perG: 0.006 }, base, {})).toBeNull(); // nothing to compare with
    const hist = { onion: { '2030-01-01': { a: 0.0035 }, '2030-01-08': { a: 0.0033 }, '2030-01-15': { b: 0.0036 } } };
    expect(dealScore({ pk: 'onion', perG: 0.0032, from: '2030-01-22' }, base, hist)).toBe(7); // 20 % under (6) + lowest in 3 weeks
  });
  it('swaps one dinner without repeating the week, and honours macro goals', async () => {
    const { suggestPlan } = await import('../shared/planner.js');
    const mk = (id, protein, p) => ({ id, source: id, meals: 4, servings: 4, macros: { kcal: 500, protein: p }, tax: { meals: ['main'], cuisines: [], protein, diets: [] } });
    const recipes = [mk('a', 'chicken', 40), mk('b', 'chicken', 20), mk('c', 'beef', 45), mk('d', 'fish', 15)];
    const costs = new Map(recipes.map((r) => [r.id, { total: 8, per: 2, perKind: 'meal', coverage: 1, missing: [], savingsPct: 0 }]));
    const keep = [recipes[0]];
    const [next] = suggestPlan(recipes, costs, { people: 4, dinners: 1, keep, avoid: new Set(['a', 'b']) });
    expect(['c', 'd']).toContain(next.id); // not the kept one, not the avoided one, and not chicken again
    expect(suggestPlan(recipes, costs, { people: 4, dinners: 5, minProtein: 30 }).map((x) => x.id).sort()).toEqual(['a', 'c']);
  });
});

// Every case below is a pricing error found in the November 2026 audit.
describe('pricing audit regressions', () => {
  it('recipe quantities given in brackets, cooked grains, legs and frying are read correctly', () => {
    const P = (s, lang = 'en') => { const l = parseIngredientLine(s, lang); return [l.ing, l.g, l.np]; };
    expect(P('1 medium-to-large yellow squash (about ½ pound), diced')[0]).toBe('zucchini'); // summer squash, not a 1 kg butternut
    expect(P('6 small red potatoes (1-1.5 lbs.)')[1]).toBeCloseTo(453.6); // the bracket is the total
    expect(P('4 chicken breasts (6 oz)')[1]).toBeCloseTo(680.4); // the bracket is each
    expect(P('1 ½ medium-large ripe avocados ((1 ½ large avocados yield ~270 g diced))')[1]).toBe(255); // a note, not a size
    expect(P('6 tasses de riz brun (cuit)', 'fr')[1]).toBe(375); // dry rice to buy
    expect(P('4 cuisses de poulet', 'fr')[1]).toBe(1120); // whole legs
    expect(P("1 jambon d'épaule picnic avec os (environ 4 kg)", 'fr')[0]).toBe('pork_shoulder');
    expect(P('1 contenant de porc effiloché avec sauce de 400 g', 'fr')[2]).toBe(1); // ready-made: not priced as raw pork
    expect(P('6 cups cubed (peeled butternut squash (about 30 ounces))')[0]).toBe('squash');
    expect(P('2 lemon wedges')[1]).toBe(26);
    expect(P('4 salmon fillets, about 6 oz each')[1]).toBeCloseTo(680.4); // each, not in total
    expect(P("4 côtelettes de porc avec os d'environ 300 g chacune", 'fr')[1]).toBe(1200);
    expect(P('4 (6 oz) salmon fillets')[1]).toBeCloseTo(680.4);
    expect(P('9 lasagna noodles (about ½ lb.)')[1]).toBeCloseTo(226.8); // no piece weight known: the bracket is the total
    expect(P('4 tablespoons butter for the bread')[0]).toBe('butter');
    expect(P('1 cup water for the rice')[0]).toBe('water');
  });
  it('flyer sizes are read strictly', async () => {
    const { packageSize, unitPrice } = await import('../shared/price.js');
    expect(packageSize('SAUCISSES DALISA, 375/450 G')).toEqual({ kind: 'g', v: 412.5 }); // not the fraction 0.83 g
    expect(packageSize('CASTELLO HAVARTI, CHEDDAR OU BLEU, 125-200 G')).toEqual({ ambiguous: true });
    expect(packageSize('THON 85/170 G OU LÉGUMES 341-398 ML')).toEqual({ ambiguous: true });
    expect(packageSize('Potatoes, 4.54 kilograms')).toEqual({ kind: 'g', v: 4540 });
    expect(packageSize('BOEUF HACHÉ, 900 g (2x450 g)')).toEqual({ kind: 'g', v: 900 });
    const I = ING_BY_ID;
    expect(unitPrice({ name: 'OIGNONS JAUNES', price: 1.99 }, I.onion)).toBeNull(); // a bag of unknown size
    expect(unitPrice({ name: 'POITRINES DE POULET PC', price: 13 }, I.chicken_breast)).toBeNull(); // a pack
    expect(unitPrice({ name: 'AVOCATS HASS', price: 6 }, I.avocado)).toBeNull(); // plural: a bag
    expect(unitPrice({ name: 'OIGNONS VERTS', price: 0.99 }, I.green_onion).perG).toBeCloseTo(0.0099); // a bunch
    expect(unitPrice({ name: 'Fromage 200 g', price: 5, pre: 'À partir de' }, I.cheddar)).toBeNull();
    expect(unitPrice({ name: 'Pâtes 900 g', price: 10, pre: '2/', post: "ou 5,49$ l'unité" }, I.pasta).perG).toBeCloseTo(5.49 / 900);
  });
  it('processed or different products never price a raw ingredient', () => {
    const none = ['pommes de terre frites | McCain Fries', 'GRATIN DE POMMES DE TERRE', 'TRIO SUCRE À LA CRÈME ET FUDGE', 'OSSO BUCO DE VEAU DE LAIT | FROZEN MILK-FED VEAL',
      'Cubes de bouillon de poulet OXO', 'lait au chocolat Québon', 'ghee légume Aseel', 'SAUCISSES DE CANARD LAC BROME', 'SAUCISSES FUMÉES SANS NOM® | SMOKED SAUSAGES',
      'MÉLANGE DE LAITUES AVEC GARNITURES', 'RILLETTES DE SAUMON FUMÉ', 'BOEUF, PORC ET VEAU HACHÉS MAIGRES', 'TOMATES PASTENE', 'BOMBAS MOZZA ET PESTO PC',
      'TARTINADE AU CARAMEL', 'BOURSIN® GARLIC & FINE HERBS'];
    for (const n of none) expect(matchFlyerItem(n), n).toEqual([]);
    expect(matchFlyerItemFull('brie double crème | double cream cheese').map((h) => h.pk)).toEqual(['brie']);
    expect(matchFlyerItemFull('POIVRONS JAUNES, ROUGES, ORANGE').map((h) => h.pk)).toEqual(['bell_pepper']);
    expect(matchFlyerItemFull('tomates mélangées ou cerises').map((h) => h.pk)).toEqual(['tomato', 'cherry_tomato']);
    expect(matchFlyerItemFull('bifteck de surlonge de boeuf').map((h) => h.pk)).toEqual(['beef_steak~surlonge']);
  });
  it('recipe quantities', () => {
    const g = (s) => parseIngredientLine(s).g;
    const k = (s) => parseIngredientLine(s).pk || parseIngredientLine(s).ing;
    expect(g('6 inch broccoli stem')).toBeNull();
    expect(g('1 pint grape tomatoes')).toBeCloseTo(283.8);
    expect(g('4 cups day-old cooked jasmine rice')).toBeCloseTo(237);
    expect(g('½ 16 oz. box rigatoni')).toBeCloseTo(226.8);
    expect(g('2 -15 oz cans butter beans')).toBeCloseTo(850.5);
    expect(g('1 bunch green onions')).toBe(100);
    expect(g('1 lime (1 Tbsp juice, $0.50)')).toBe(65);
    expect(g('4 5-6 oz salmon fillets')).toBeCloseTo(567);
    expect(g('2 filets de porc de 450 grammes')).toBe(900);
    expect(g('2 sheets puff pastry')).toBe(450);
    expect(g('5 feuilles de laitue romaine')).toBe(75);
    expect(k('16 small corn tortillas')).toBe('tortilla~tortilla_de_mais');
    expect(k('4 8-inch flour tortillas')).toBe('tortilla~tortilla');
    expect(k('2 -15 oz cans butter beans')).toBe('white_beans~haricot_de_lima');
    expect(k('16 oz potato gnocchi')).toBe('pasta~gnocchi');
    expect(k('1/4 cup balsamic vinegar')).toBe('vinegar~vinaigre_balsamique');
    expect(k('2 cups whole milk ricotta')).toBe('ricotta~ricotta');
    expect(k('1 tsp dried thyme')).toBe('spice');
    expect(k('2 boîtes de 398 ml de tomates')).toBe('canned_tomato');
    expect(k('25 g de fromage à raclette')).toBe('swiss~raclette');
    expect(k('5 lbs chicken pieces')).toBe('chicken_drumstick');
    expect(parseIngredientLine('1 20 oz. can pineapple chunks').np).toBe(1);
    expect(parseIngredientLine('500 g de bœuf, porc ou veau haché').alt).toEqual(['beef', 'pork', 'veal']);
  });
  it('alternatives are priced at the cheapest; flyers never create a price', () => {
    const base = { pork_loin: { perG: 0.008 }, beef_stew: { perG: 0.02 }, veal: { perG: 0.022 } };
    const l = { ...parseIngredientLine('500 g de bœuf, porc ou veau haché') };
    const c = costRecipe({ servings: 2, ings: [l] }, new Map(), base);
    expect(c.lines[0].cost).toBeCloseTo(4); // pork at 8 $/kg
    const offers = bestOffers([{ name: 'kiwi', pg: { kiwi: 0.004 }, store: 'a' }], new Set(['a']), '2030-01-01', {});
    expect(costRecipe({ servings: 1, ings: [{ raw: 'x', ing: 'kiwi', g: 100 }] }, offers, {}).lines[0].src).toBeNull();
  });
});
