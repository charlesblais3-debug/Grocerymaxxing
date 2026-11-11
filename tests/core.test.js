// Test inputs below are synthetic lines used only to exercise the parsers.
// They are not recipes and never ship in the app's data.
import { describe, it, expect } from 'vitest';
import { parseQuantity } from '../shared/text.js';
import { matchIngredient, matchFlyerItem, parseIngredientLine } from '../shared/match.js';
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
    expect(offers.get('chicken_breast').perG).toBe(0.01);
    expect(offers.has('onion')).toBe(false);
    const c = costRecipe(recipe, offers, { chicken_breast: { perG: 0.015 } });
    expect(c.total).toBeCloseTo(4);
    expect(c.perServing).toBeCloseTo(1);
    expect(c.priced).toBe(1);
    expect(c.countable).toBe(3);
    expect(c.savings).toBeCloseTo(2);
  });
  it('picks the cheapest store', () => expect(bestOffers(items, new Set(['maxi', 'iga']), '2030-01-01').get('chicken_breast').store).toBe('iga'));
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
    expect(storeFor('Marché Tradition').id).toBe('tradition');
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
    for (const n of ['STEAK DE CAPICOLLE DE PORC AUX 3 POIVRES', 'COCKTAIL DE TOMATE ET DE PALOURDES MOTT\'S', 'TOFU DESSERT SUNRISE', 'HALVA VANILLE', 'BIÈRE SAPPORO', 'pochettes chinoises à la ciboulette']) {
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
  const html = `<div itemscope itemtype="https://schema.org/Recipe"><h1 itemprop="name">Essai</h1>
    <meta itemprop="recipeYield" content="4 portions"><time itemprop="totalTime" datetime="PT30M">30 min</time>
    <ul><li itemprop="recipeIngredient"><span><span>2</span> tasses</span> de <a href="#">lait</a></li><li itemprop="recipeIngredient">1 oignon</li></ul>
    <div itemprop="nutrition" itemscope><span itemprop="calories">250 kcal</span></div></div>`;
  const rec = toRecord(extractMicrodata(html), 'https://x.test/1', { id: 'x', lang: 'fr' });
  expect(rec).toMatchObject({ name: 'Essai', servings: 4, totalMin: 30, ingredients: ['2 tasses de lait', '1 oignon'] });
  expect(rec.nutrition.calories).toBe('250 kcal');
});
