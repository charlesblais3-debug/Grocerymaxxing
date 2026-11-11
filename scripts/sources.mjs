// Where recipes are gathered from. Every recipe is taken from the site's own
// schema.org/Recipe structured data — nothing is written or completed by us.
//
// urlRe      which sitemap URLs look like recipe pages
// sitemapRe  (optional) only walk sitemap files whose URL matches
// sitemaps   (optional) extra sitemap URLs to try when robots.txt lists none
// target     how many recipes to keep from this source
const WP_SITEMAP = /post|recipe|recette|sitemap(_index)?\.xml$|wp-sitemap\.xml$/;
const esc = (h) => h.replace(/[.]/g, '\\.');
/** WordPress-style blog: posts live at /slug/ and are listed in a post sitemap. */
const wp = (id, name, home, lang, target = 45) => ({
  id, name, home, lang, target,
  urlRe: new RegExp(esc(new URL(home).host) + '/(?:recettes?/|recipes?/)?[a-z0-9-]+/?$'),
  sitemapRe: WP_SITEMAP,
});

export const SOURCES = [
  // --- Québec / français
  { id: 'ricardo', name: 'Ricardo', home: 'https://www.ricardocuisine.com', lang: 'fr', urlRe: /ricardocuisine\.com\/recettes\/\d+-/, target: 140 },
  { id: 'recettes-qc', name: 'Recettes du Québec', home: 'https://www.recettes.qc.ca', lang: 'fr', urlRe: /recettes\.qc\.ca\/recettes?\/recette\//, target: 100 },
  { id: 'troisfoisparjour', name: 'Trois fois par jour', home: 'https://www.troisfoisparjour.com', lang: 'fr', urlRe: /troisfoisparjour\.com\/fr\/recettes\/.+\/.+/, target: 80 },
  { id: 'metro', name: 'Metro', home: 'https://www.metro.ca', lang: 'fr', urlRe: /metro\.ca\/recettes-et-occasions\/recettes\/[^/]+$/, target: 60 },
  { id: 'iga', name: 'IGA', home: 'https://www.iga.net', lang: 'fr', urlRe: /iga\.net\/fr\/recettes_inspirantes\/recettes\//, target: 60 },
  { id: 'kpourkatrine', name: 'K pour Katrine', home: 'https://www.kpourkatrine.com', lang: 'fr', urlRe: /kpourkatrine\.com\/fr\/recettes?\/.+/, target: 50 },
  { id: 'coupdepouce', name: 'Coup de pouce', home: 'https://www.coupdepouce.com', lang: 'fr', urlRe: /coupdepouce\.com\/.*recette/, target: 50 },
  { id: 'cuisinez', name: 'Cuisinez (Télé-Québec)', home: 'https://cuisinez.telequebec.tv', lang: 'fr', urlRe: /cuisinez\.telequebec\.tv\/recettes\/\d+/, target: 60 },
  { id: 'zeste', name: 'Zeste', home: 'https://www.zeste.ca', lang: 'fr', urlRe: /zeste\.ca\/recettes\/.+/, target: 60 },
  { id: 'pratico', name: 'Pratico-Pratiques', home: 'https://www.pratico-pratiques.com', lang: 'fr', urlRe: /pratico-pratiques\.com\/.*recettes?\/.+/, target: 60 },
  { id: '5-15', name: '5 ingrédients 15 minutes', home: 'https://www.5ingredients15minutes.com', lang: 'fr', urlRe: /5ingredients15minutes\.com\/fr\/recettes\/.+\/.+/, target: 60 },
  { id: 'salutbonjour', name: 'Salut Bonjour', home: 'https://www.salutbonjour.ca', lang: 'fr', urlRe: /salutbonjour\.ca\/.*recette/, target: 40 },
  wp('cuisinefutee', 'Cuisine futée', 'https://cuisinefutee.telequebec.tv', 'fr', 50),
  wp('savourer', 'Savourer', 'https://savourer.ca', 'fr', 50),
  wp('lesrecettesdecaty', 'Les recettes de Caty', 'https://www.lesrecettesdecaty.com', 'fr', 50),
  wp('jeanphilippe', 'La cuisine de Jean-Philippe', 'https://lacuisinedejeanphilippe.com', 'fr', 50),
  wp('loounie', 'Loounie cuisine', 'https://loouniecuisine.com', 'fr', 50),
  wp('boblechef', 'Bob le Chef', 'https://www.boblechef.com', 'fr', 40),
  wp('lecoupdegrace', 'Le Coup de Grâce', 'https://lecoupdegrace.ca', 'fr', 40),
  wp('chefcuisto', 'Chef Cuisto', 'https://chefcuisto.com', 'fr', 50),
  wp('madamelabriski', 'Madame Labriski', 'https://madamelabriski.com', 'fr', 30),
  wp('jecuisine', 'Je cuisine', 'https://www.jecuisine.com', 'fr', 40),
  wp('hopdanslewok', 'Hop dans le wok', 'https://hopdanslewok.com', 'fr', 30),
  // --- English
  { id: 'budgetbytes', name: 'Budget Bytes', home: 'https://www.budgetbytes.com', lang: 'en', urlRe: /budgetbytes\.com\/[a-z0-9-]+\/$/, sitemapRe: WP_SITEMAP, target: 140 },
  { id: 'bbcgoodfood', name: 'BBC Good Food', home: 'https://www.bbcgoodfood.com', lang: 'en', urlRe: /bbcgoodfood\.com\/recipes\/(?!collection|category)[a-z0-9-]+$/, target: 80 },
  { id: 'minimalistbaker', name: 'Minimalist Baker', home: 'https://minimalistbaker.com', lang: 'en', urlRe: /minimalistbaker\.com\/[a-z0-9-]+\/$/, sitemapRe: WP_SITEMAP, target: 70 },
  wp('loveandlemons', 'Love and Lemons', 'https://www.loveandlemons.com', 'en', 40),
  wp('recipetineats', 'RecipeTin Eats', 'https://www.recipetineats.com', 'en', 60),
  wp('skinnytaste', 'Skinnytaste', 'https://www.skinnytaste.com', 'en', 50),
  wp('cookieandkate', 'Cookie and Kate', 'https://cookieandkate.com', 'en', 40),
  wp('pinchofyum', 'Pinch of Yum', 'https://pinchofyum.com', 'en', 40),
  wp('wellplated', 'Well Plated', 'https://www.wellplated.com', 'en', 40),
  wp('downshiftology', 'Downshiftology', 'https://downshiftology.com', 'en', 40),
  wp('sweetpeasandsaffron', 'Sweet Peas and Saffron', 'https://sweetpeasandsaffron.com', 'en', 50),
  wp('workweeklunch', 'Workweek Lunch', 'https://workweeklunch.com', 'en', 40),
  wp('mealpreponfleek', 'Meal Prep on Fleek', 'https://mealpreponfleek.com', 'en', 40),
  wp('fitfoodiefinds', 'Fit Foodie Finds', 'https://fitfoodiefinds.com', 'en', 40),
  wp('feastingathome', 'Feasting at Home', 'https://www.feastingathome.com', 'en', 40),
  wp('fermentingforfoodies', 'Fermenting for Foodies', 'https://www.fermentingforfoodies.com', 'en', 50),
  wp('nourishedkitchen', 'Nourished Kitchen', 'https://nourishedkitchen.com', 'en', 40),
  wp('culturesforhealth', 'Cultures for Health', 'https://culturesforhealth.com', 'en', 30),
  wp('canadianliving', 'Canadian Living', 'https://www.canadianliving.com', 'en', 40),
  // Allrecipes, Serious Eats and Simply Recipes answer crawlers with HTTP 402
  // (paid crawling only), so they are deliberately not gathered.
];

// URL slugs we go looking for first, so the catalogue covers every dish type
// (sides, ferments, preserves, sandwiches…) instead of whatever the sitemap lists first.
export const SLUG_BUCKETS = [
  /soupe|potage|soup|stew|chili|chaudree|chowder/,
  /salade|salad/,
  /sandwich|burger|wrap|taco|panini|croque/,
  /ferment|kimchi|choucroute|sauerkraut|kombucha|kefir|lacto|levain|sourdough/,
  /marinade|pickle|conserve|confiture|jam|ketchup|chutney|relish|cornichon/,
  /accompagnement|side|puree|gratin|riz|rice|legumes-rotis|roasted/,
  /pates|pasta|spaghetti|lasagn|nouilles|noodle|macaroni/,
  /poulet|chicken|dinde|turkey/,
  /boeuf|beef|porc|pork|saucisse|sausage/,
  /saumon|salmon|poisson|fish|crevette|shrimp|thon|tuna/,
  /tofu|lentille|lentil|pois-chiche|chickpea|haricot|bean|vege/,
  /meal-prep|mijoteuse|slow-cooker|plaque|sheet-pan|one-pot|casserole|bol|bowl/,
  /dejeuner|breakfast|brunch|gruau|oat|granola|omelette|crepe|pancake/,
  /sauce|trempette|dip|vinaigrette|pesto|houmous|hummus/,
  /pain|bread|muffin|biscuit|cookie|gateau|cake|dessert/,
];
