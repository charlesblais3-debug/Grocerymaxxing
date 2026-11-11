// Where recipes are gathered from. Every recipe is taken from the site's own
// schema.org/Recipe structured data — nothing is written or completed by us.
//
// urlRe      which sitemap URLs look like recipe pages
// sitemapRe  (optional) only walk sitemap files whose URL matches
// sitemaps   (optional) extra sitemap URLs to try when robots.txt lists none
// target     how many recipes to keep from this source
export const SOURCES = [
  { id: 'ricardo', name: 'Ricardo', home: 'https://www.ricardocuisine.com', lang: 'fr', urlRe: /ricardocuisine\.com\/recettes\/\d+-/, target: 140 },
  { id: 'recettes-qc', name: 'Recettes du Québec', home: 'https://www.recettes.qc.ca', lang: 'fr', urlRe: /recettes\.qc\.ca\/recettes?\/recette\//, target: 120 },
  { id: 'troisfoisparjour', name: 'Trois fois par jour', home: 'https://www.troisfoisparjour.com', lang: 'fr', urlRe: /troisfoisparjour\.com\/fr\/recettes\/.+\/.+/, target: 100 },
  { id: 'budgetbytes', name: 'Budget Bytes', home: 'https://www.budgetbytes.com', lang: 'en', urlRe: /budgetbytes\.com\/[a-z0-9-]+\/$/, sitemapRe: /post-sitemap|sitemap(_index)?\.xml$/, target: 140 },
  { id: 'metro', name: 'Metro', home: 'https://www.metro.ca', lang: 'fr', urlRe: /metro\.ca\/recettes-et-occasions\/recettes\/[^/]+$/, target: 80 },
  { id: 'iga', name: 'IGA', home: 'https://www.iga.net', lang: 'fr', urlRe: /iga\.net\/fr\/recettes_inspirantes\/recettes\//, target: 80 },
  { id: 'kpourkatrine', name: 'K pour Katrine', home: 'https://www.kpourkatrine.com', lang: 'fr', urlRe: /kpourkatrine\.com\/fr\/recettes?\/.+/, target: 60 },
  { id: 'coupdepouce', name: 'Coup de pouce', home: 'https://www.coupdepouce.com', lang: 'fr', urlRe: /coupdepouce\.com\/.*recette/, target: 60 },
  { id: 'allrecipes', name: 'Allrecipes', home: 'https://www.allrecipes.com', lang: 'en', urlRe: /allrecipes\.com\/recipe\/\d+\//, target: 80 },
  { id: 'seriouseats', name: 'Serious Eats', home: 'https://www.seriouseats.com', lang: 'en', urlRe: /seriouseats\.com\/[a-z0-9-]+-recipe-\d+$/, target: 60 },
  { id: 'simplyrecipes', name: 'Simply Recipes', home: 'https://www.simplyrecipes.com', lang: 'en', urlRe: /simplyrecipes\.com\/(recipes\/[a-z0-9_-]+\/?|[a-z0-9-]+-recipe-\d+)$/, target: 60 },
  { id: 'bbcgoodfood', name: 'BBC Good Food', home: 'https://www.bbcgoodfood.com', lang: 'en', urlRe: /bbcgoodfood\.com\/recipes\/(?!collection|category)[a-z0-9-]+$/, target: 60 },
  { id: 'minimalistbaker', name: 'Minimalist Baker', home: 'https://minimalistbaker.com', lang: 'en', urlRe: /minimalistbaker\.com\/[a-z0-9-]+\/$/, sitemapRe: /post-sitemap|sitemap(_index)?\.xml$/, target: 50 },
  { id: 'loveandlemons', name: 'Love and Lemons', home: 'https://www.loveandlemons.com', lang: 'en', urlRe: /loveandlemons\.com\/[a-z0-9-]+\/$/, sitemapRe: /post-sitemap|sitemap(_index)?\.xml$/, target: 50 },
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
