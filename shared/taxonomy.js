// Browsing taxonomy. Modelled on how the big recipe sites slice their catalogues:
// dish type first (Ricardo, Allrecipes), then cuisine, main protein and diet,
// with cost bands on top (Budget Bytes). Tags are derived from the source's own
// category / keywords / title — they classify a recipe, they never alter it.
import { deaccent } from './text.js';

export const MEAL_TYPES = [
  ['main', 'Plats principaux', 'Mains'],
  ['soup', 'Soupes et potages', 'Soups & stews'],
  ['salad', 'Salades', 'Salads'],
  ['sandwich', 'Sandwichs, burgers et tacos', 'Sandwiches, burgers & tacos'],
  ['pasta', 'Pâtes et nouilles', 'Pasta & noodles'],
  ['side', 'Accompagnements', 'Side dishes'],
  ['breakfast', 'Déjeuners et brunchs', 'Breakfast & brunch'],
  ['appetizer', 'Entrées et bouchées', 'Appetizers & snacks'],
  ['preserve', 'Conserves et fermentations', 'Preserves & ferments'],
  ['sauce', 'Sauces, trempettes et vinaigrettes', 'Sauces, dips & dressings'],
  ['bread', 'Pains et boulangerie', 'Breads & baking'],
  ['dessert', 'Desserts', 'Desserts'],
  ['drink', 'Boissons', 'Drinks'],
];

const MEAL_RULES = {
  soup: /\b(soupes?|potages?|veloutes?|chaudrees?|bouillons?|soups?|stews?|ragouts?|chowders?|chilis?|bisques?|minestrone|pho|ramen|mijotes?)\b/,
  salad: /\b(salades?|salads?|slaw|taboule|tabbouleh)\b/,
  sandwich: /\b(sandwich(?:e?s)?|burgers?|hamburgers?|wraps?|tacos?|paninis?|croque[- ]monsieur|sous[- ]marins?|guedilles?|hot[- ]dogs?|quesadillas?|burritos?|fajitas?|pitas?|grilled cheese|sliders?|tartines?|toasts?|banh mi|subs?)\b/,
  pasta: /\b(pates|pasta|spaghetti|lasagnes?|lasagna|macaronis?|penne|linguine|fettuccine|gnocchis?|raviolis?|nouilles|noodles?|pad thai|carbonara|orzo|tortellinis?|mac and cheese|lo mein)\b/,
  side: /\b(accompagnements?|side dish(?:es)?|sides?|puree|mashed|riz pilaf|gratin dauphinois|legumes rotis|roasted vegetables|frites|fries)\b/,
  breakfast: /\b(dejeuners?|petit[- ]dejeuner|brunchs?|breakfast|crepes?|pancakes?|gaufres?|waffles?|omelettes?|granola|gruau|oatmeal|pain dore|french toast|smoothies?|muffins?|frittata|oeufs brouilles|scrambled eggs|overnight oats)\b/,
  appetizer: /\b(entrees?|bouchees?|hors[- ]d'?oeuvres?|appetizers?|starters?|snacks?|collations?|tapas|canapes?|amuse[- ]bouches?|finger food)\b/,
  preserve: /\b(conserves?|ferment\w*|lacto\w*|kimchi|choucroute|sauerkraut|kombucha|kefir|marinades?|pickles?|pickled|marines?|confitures?|jams?|gelees?|jell(?:y|ies)|ketchup maison|ketchup aux fruits|chutneys?|preserves?|canning|cannage|levain|sourdough starter|miso|vinaigre maison|relish|cornichons?)\b/,
  sauce: /\b(sauces?|trempettes?|dips?|vinaigrettes?|dressings?|pestos?|salsas?|mayonnaises?|houmous|hummus|guacamole|tzatziki|gravy|coulis|aioli|condiments?)\b/,
  bread: /\b(pains?|breads?|brioches?|focaccia|bagels?|baguettes?|biscuits? a la poudre|scones?|bannique|naan|pate a pizza|pizza dough|boulangerie|buns?)\b/,
  dessert: /\b(desserts?|gateaux?|cakes?|biscuits?|cookies?|tartes? (?:au|aux|a la) (?:sucre|pommes|citron|fraises|bleuets|chocolat|pacanes)|pies?|brownies?|carres?|bars|poudings?|puddings?|mousses? au|cremes? glacees?|ice cream|cupcakes?|fudge|sucre a la creme|croustades?|crumbles?|crisps?|cheesecake|tiramisu|beignes?|donuts?|galettes?|macarons?|truffes?|sweets?)\b/,
  drink: /\b(boissons?|cocktails?|mocktails?|drinks?|beverages?|limonades?|lemonade|smoothies?|punch|sangria|chocolat chaud|hot chocolate|lattes?|the glace|iced tea|jus)\b/,
  main: /\b(plats? principa(?:l|ux)|mains?|main (?:course|dish)|dinner|souper|supper|repas|entree(?=.*dinner)|casseroles?|sautes?|stir[- ]fry|roti|roast|grille|grilled|curry|cari|pate chinois|tourtiere|pizza)\b/,
};

export const CUISINES = [
  ['quebecoise', 'Québécoise', 'Québécois'],
  ['italienne', 'Italienne', 'Italian'],
  ['francaise', 'Française', 'French'],
  ['mexicaine', 'Mexicaine et tex-mex', 'Mexican & Tex-Mex'],
  ['asiatique', 'Asiatique', 'Asian'],
  ['indienne', 'Indienne', 'Indian'],
  ['mediterraneenne', 'Méditerranéenne', 'Mediterranean'],
  ['moyen-orient', 'Moyen-Orient', 'Middle Eastern'],
  ['americaine', 'Américaine', 'American'],
];

const CUISINE_RULES = {
  quebecoise: /\b(quebecois\w*|quebec|canadien\w*|canadian|pate chinois|tourtiere|poutine|cabane a sucre|cipaille|pouding chomeur|feves au lard|cretons?)\b/,
  italienne: /\b(italien\w*|italian|risotto|lasagn\w+|carbonara|bolognese|bolognaise|parmigiana|minestrone|gnocchi|pesto|osso buco|tiramisu|focaccia|cacciatore)\b/,
  francaise: /\b(francais\w*|french|bourguignon|ratatouille|quiche|coq au vin|cassoulet|gratin dauphinois|nicoise|provencale?|blanquette)\b/,
  mexicaine: /\b(mexicain\w*|mexican|tex[- ]mex|tacos?|burritos?|enchiladas?|quesadillas?|fajitas?|guacamole|chili con carne|salsa|carnitas)\b/,
  asiatique: /\b(asiatique|asian|chinois\w*|chinese|japonais\w*|japanese|thai\w*|coreen\w*|korean|vietnamien\w*|vietnamese|teriyaki|pad thai|ramen|sushi|kimchi|pho|banh mi|bibimbap|stir[- ]fry|general tao|wok|miso|satay|dumplings?|gyoza)\b/,
  indienne: /\b(indien\w*|indian|cari|curry|masala|dahl|dal|tandoori|biryani|korma|naan|vindaloo|poulet au beurre|butter chicken|chana)\b/,
  mediterraneenne: /\b(mediterraneen\w*|mediterranean|grec\w*|greek|souvlaki|tzatziki|espagnol\w*|spanish|paella|moussaka|gyros?)\b/,
  'moyen-orient': /\b(moyen[- ]orient\w*|middle eastern|libanais\w*|lebanese|marocain\w*|moroccan|tajine|tagine|falafels?|shawarma|houmous|hummus|taboule|tabbouleh|shakshuka|chakchouka|turc|turkish|persan|persian)\b/,
  americaine: /\b(americain\w*|american|bbq|barbecue|cajun|southern|mac and cheese|buffalo|pulled pork|porc effiloche|cornbread|sloppy joe)\b/,
};

export const PROTEINS = [
  ['chicken', 'Poulet et volaille', 'Chicken & poultry'],
  ['beef', 'Bœuf et veau', 'Beef & veal'],
  ['pork', 'Porc', 'Pork'],
  ['fish', 'Poissons et fruits de mer', 'Fish & seafood'],
  ['plant', 'Tofu et légumineuses', 'Tofu & legumes'],
  ['egg', 'Œufs', 'Eggs'],
];

const PROTEIN_OF = {
  chicken_breast: 'chicken', chicken_thigh: 'chicken', chicken_whole: 'chicken', chicken_wing: 'chicken', chicken_ground: 'chicken', chicken: 'chicken', turkey: 'chicken', turkey_ground: 'chicken',
  beef_ground: 'beef', beef_stew: 'beef', beef_steak: 'beef', beef: 'beef', veal: 'beef', lamb: 'beef',
  pork_ground: 'pork', pork_chop: 'pork', pork_tenderloin: 'pork', pork_loin: 'pork', pork_shoulder: 'pork', pork_ribs: 'pork', pork: 'pork', bacon: 'pork', ham: 'pork', sausage: 'pork', prosciutto: 'pork', pepperoni: 'pork',
  salmon: 'fish', salmon_smoked: 'fish', white_fish: 'fish', shrimp: 'fish', tuna_can: 'fish', scallop: 'fish', mussels: 'fish', sardine: 'fish',
  tofu: 'plant', chickpeas: 'plant', black_beans: 'plant', kidney_beans: 'plant', white_beans: 'plant', lentils: 'plant',
  egg: 'egg',
};
const ANIMAL = new Set(['chicken', 'beef', 'pork', 'fish']);
const NON_VEGAN = new Set(['egg', 'milk', 'cream_35', 'cream_10', 'sour_cream', 'butter', 'yogurt', 'yogurt_greek', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'cream_cheese', 'ricotta', 'swiss', 'cheese', 'condensed_milk', 'honey', 'gelatin', 'fish_sauce', 'worcestershire', 'mayo', 'broth_chicken', 'broth_beef']);
const HIDDEN_MEAT = new Set(['broth_chicken', 'broth_beef', 'fish_sauce', 'gelatin', 'worcestershire']);

/**
 * @param {object} r raw recipe (name, category[], cuisine[], keywords[])
 * @param {{ing:string|null}[]} ings parsed ingredient lines
 */
export function classify(r, ings) {
  const title = deaccent(r.name || '');
  const meta = deaccent([...(r.category || []), ...(r.keywords || [])].join(' | '));
  const cuisineMeta = deaccent((r.cuisine || []).join(' | '));

  // Dish type: the source's own category is the strongest signal, then the title.
  const meals = [];
  for (const [id] of MEAL_TYPES) {
    const re = MEAL_RULES[id];
    if (re.test(deaccent((r.category || []).join(' | '))) || re.test(title)) meals.push(id);
  }
  if (!meals.length) for (const [id] of MEAL_TYPES) if (MEAL_RULES[id].test(meta)) meals.push(id);

  const counts = {};
  for (const l of ings) {
    const p = PROTEIN_OF[l.ing];
    if (p) counts[p] = (counts[p] || 0) + 1;
  }
  const animal = Object.keys(counts).filter((p) => ANIMAL.has(p));
  const protein = animal.sort((a, b) => counts[b] - counts[a])[0] || (counts.plant ? 'plant' : counts.egg ? 'egg' : null);
  if (!meals.length && (animal.length || counts.plant)) meals.push('main');

  const cuisines = [];
  for (const [id] of CUISINES) {
    if (CUISINE_RULES[id].test(cuisineMeta) || CUISINE_RULES[id].test(title) || CUISINE_RULES[id].test(meta)) cuisines.push(id);
  }

  // Diet tags are only asserted when every ingredient line was recognised.
  const allKnown = ings.length > 0 && ings.every((l) => l.ing);
  const diets = [];
  const saysVeg = /\b(vegetarien\w*|vegetarian|vege)\b/.test(meta);
  const saysVegan = /\b(vegan\w*|vegetalien\w*|plant[- ]based)\b/.test(meta);
  const hasHidden = ings.some((l) => HIDDEN_MEAT.has(l.ing));
  if (!animal.length && ((allKnown && !hasHidden) || saysVeg || saysVegan)) diets.push('vegetarian');
  if (!animal.length && ((allKnown && !ings.some((l) => NON_VEGAN.has(l.ing))) || saysVegan)) {
    if (!diets.includes('vegetarian')) diets.push('vegetarian');
    diets.push('vegan');
  }
  return { meals, cuisines, protein, diets };
}

export const DIETS = [
  ['vegetarian', 'Végétarien', 'Vegetarian'],
  ['vegan', 'Végane', 'Vegan'],
];
