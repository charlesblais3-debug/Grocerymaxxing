// Maps free text (recipe ingredient line, flyer product name, StatCan product label)
// to a canonical ingredient id. Longest synonym phrase wins; ties go to the earliest.
import { INGREDIENTS, ING_BY_ID } from './ingredients.js';
import { tokens, parseQuantity, deaccent } from './text.js';

const INDEX = new Map(); // first token -> [{ toks, id }]
for (const ing of INGREDIENTS) {
  ing.members.forEach((member, m) => {
    // Price key: the group id for single-member groups and for a generic member ("nuts"),
    // "group~n" for a specific member of a multi-member group ("walnut").
    const pk = ing.pa || (ing.members.length === 1 || member.generic ? ing.id : `${ing.id}~${member.key}`);
    for (const syn of member.syn) {
      const toks = tokens(syn);
      if (!toks.length) continue;
      if (!INDEX.has(toks[0])) INDEX.set(toks[0], []);
      INDEX.get(toks[0]).push({ toks, id: ing.id, pk });
    }
  });
}

/** Group id of a price key ("peach~2" -> "peach"). */
export const baseId = (pk) => (pk ? pk.split('~')[0] : pk);
/** Display name of a price key: the member's own name when it is a specific member. */
export function pkLabel(pk, lang) {
  const ing = ING_BY_ID[baseId(pk)];
  if (!ing) return pk;
  const m = pk.includes('~') ? ing.members.find((x) => x.key === pk.split('~')[1]) : null;
  if (!m) return ing[lang === 'en' ? 'en' : 'fr'];
  const name = (lang === 'en' && m.syn[1]) || m.syn[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Words that mean a flyer product is a prepared food / non-food that merely mentions an
// ingredient ("soupe poulet et nouilles", "croustilles saveur oignon").
const FLYER_VETO = new Set(tokens([
  'soupe soup pizza saveur flavour flavor croustilles chips biscuits cookies chat chien cat dog',
  'litière shampooing savon détergent repas dinner bonbons candy gâteau cake tarte muffin',
  'céréales cereal barres bars croissant beigne vinaigrette dressing trempette dip nourriture',
  'collation snack sauce kit assaisonné seasoned mariné marinated pané breaded croquettes nuggets',
  'burger pogo glacée ice chocolat chocolate boisson drink jus juice thé tea café coffee',
  'jouet toy figurine poupée doll peluche véhicule camion jeu game livre book bracelet interactif',
  'frigo soufflé popcorn éclater cocktail fondue halva dessert instantané',
  'soda liqueur bière beer vin wine mer séché dried confit gomme gum pastille rince',
  'modeler décoration ornement fleur plante bougie chandelle vêtement chandail pyjama monsieur',
  'bébé baby aromatisé flavoured vitamines supplément lotion dentifrice parfum arôme',
  // Processed products that only borrow an ingredient's name.
  'frites fries galette galettes gratin rondelle rondelles pilées purée nugget nuggets osso buco tartare bao',
  'précuit précuite precooked prêt fudge trio mccain cavendish stouffer michelina knorr lipton sidekick',
  'boursin matelot caramel spread rillettes garniture garnitures kit bomba bombas',
].join(' ')));

const LEADING = new Set(tokens('frais fraîche fresh boneless désossé skinless lean maigre extra mini gros grosse petit petite large small surgelé frozen bio biologique organic vrai real whole entier jeune baby nouveau new'));
const COLOURS = new Set(tokens('orange rouge jaune vert verte blanc blanche noir noire violet violette mauve'));
const ANIMALS = new Set(tokens('porc pork poulet chicken dinde dindon turkey boeuf beef veau veal agneau lamb saumon salmon thon tuna canard duck'));
const ANIMAL_GROUP = { chicken: new Set(tokens('poulet chicken')), turkey: new Set(tokens('dinde dindon turkey')), beef: new Set(tokens('boeuf beef')), veal: new Set(tokens('veau veal')), pork: new Set(tokens('porc pork')), lamb: new Set(tokens('agneau lamb')), salmon: new Set(tokens('saumon salmon')), tuna: new Set(tokens('thon tuna')), duck: new Set(tokens('canard duck')) };
// Which animal each meat or fish ingredient is, to check it against the animal a product names.
const ANIMAL_OF = (() => {
  const m = {};
  const set = (ids, words) => { for (const id of ids.split(' ')) m[id] = new Set(tokens(words)); };
  set('chicken_breast chicken_thigh chicken_drumstick chicken_whole chicken_wing chicken_ground chicken', 'poulet chicken');
  set('turkey turkey_ground', 'dinde dindon turkey');
  set('beef_ground beef_stew beef_steak beef', 'boeuf beef');
  set('veal', 'veau veal');
  set('pork_ground pork_chop pork_tenderloin pork_loin pork_shoulder pork_ribs pork ham bacon', 'porc pork');
  set('lamb', 'agneau lamb');
  set('salmon salmon_smoked', 'saumon salmon');
  set('tuna_can', 'thon tuna');
  set('duck', 'canard duck');
  return m;
})();
// Ingredient-specific exclusions: forms of a product that are a different thing to cook with.
const NOT_FOR = {
  broth_chicken: /\b(cubes?|poudre|powder|concentre|base|sachets?|granules?|oxo|bovril|pate)\b/,
  broth_beef: /\b(cubes?|poudre|powder|concentre|base|sachets?|granules?|oxo|bovril|pate)\b/,
  broth_veg: /\b(cubes?|poudre|powder|concentre|base|sachets?|granules?|oxo|bovril|pate)\b/,
  butter: /\b(legumes?|vegetables?|vegetale?|margarine|karite|shea|cacao|cocoa)\b/,
  sausage: /\b(wieners?|hot ?dogs?|fumees?|smoked|cocktail|knackwurst)\b/,
  // Italian canned-tomato brands sold without the word "conserve".
  tomato: /\b(pastene|unico|aylmer|primo|hunt'?s|del monte|san marzano|mutti|conserve|en des|broyees|entieres|etuvees|diced|crushed|canned)\b/,
  potato: /\b(wedges?|quartiers?|rissolees?|hash|tater|deshydratees?|instantanees?)\b/,
  milk: /\b(chocolat|chocolate|fouett|evapore|condense|poudre|powder|lait de coco)\b/,
  cream_35: /\b(glacee|ice|sure|sour|fromage|cheese|brie|double creme)\b/,
  sugar: /\b(creme|fudge|bonbon|tire)\b/,
  tuna_can: /\b(surgele|frozen|cubes?|steak|frais|fresh)\b/,
  bread: /\b(bao|chapelure|croutons?|pita|naan|tortilla|bagel|muffin)\b/,
};

/** A generic hit ("bifteck") gives way to a specific member named in the same text ("surlonge"). */
function specific(h, hits) {
  if (h.pk !== h.id) return h;
  return hits.find((o) => o.id === h.id && o.pk !== o.id && o.pos <= h.pos + 3) || h;
}

function findAll(toks) {
  const hits = [];
  for (let i = 0; i < toks.length; i++) {
    const cands = INDEX.get(toks[i]);
    if (!cands) continue;
    for (const c of cands) {
      let ok = true;
      for (let k = 1; k < c.toks.length; k++) if (toks[i + k] !== c.toks[k]) { ok = false; break; }
      if (ok) hits.push({ id: c.id, pk: c.pk, len: c.toks.length, pos: i, toks: c.toks });
    }
  }
  hits.sort((a, b) => b.len - a.len || a.pos - b.pos);
  return hits;
}

/** @returns {string|null} canonical ingredient id for a recipe ingredient line */
export function matchIngredient(text, { flyer = false } = {}) {
  if (flyer) return matchFlyerItem(text)[0] ?? null;
  return findAll(tokens(text))[0]?.id ?? null;
}

/**
 * Ingredients a flyer product can stand in for. Flyer names read "PRODUCT brand, size",
 * often bilingual ("fr | en") and often "X ou Y": each alternative is matched on its own,
 * and the ingredient must be the head of the name (within its first three words) so that
 * "soda gingembre" or "concombre de mer" are not mistaken for ginger or cucumber.
 * @returns {string[]} ingredient ids, the main one first
 */
export function matchFlyerItem(name) {
  return [...new Set(matchFlyerItemFull(name).map((o) => o.id))];
}

/** Same, with the price key and the part of the label that matched: [{ id, pk, seg }]. */
export function matchFlyerItemFull(name) {
  const all = tokens(name);
  const out = [];
  // "fr | en" are two renderings of the same name; inside one, "X ou Y, Z" lists alternatives.
  const parts = deaccent(name).split('|');
  // Mixed products ("boeuf, porc et veau hachés"): one price for a blend is no price for any
  // one of its meats.
  const animals = new Set(all.filter((t) => ANIMALS.has(t)).map((t) => [...Object.entries(ANIMAL_GROUP)].find(([, ws]) => ws.has(t))?.[0] || t));
  if (animals.size >= 2 && /\b(et|and)\b|&|melange|mixed/.test(deaccent(name))) return [];
  let stop = false;
  for (let pi = 0; pi < parts.length && !stop; pi++) {
    const part = parts[pi];
    const segments = part.split(/\s*(?:,|;|\bou\b|\bor\b|\/)\s*/).filter((x) => x.trim());
    for (let i = 0; i < segments.length; i++) {
      const toks = tokens(segments[i]);
      while (toks.length > 1 && LEADING.has(toks[0])) toks.shift(); // "fresh boneless chicken breasts"
      let hit = null;
      // "tomates mélangées ou cerises": a single word after "ou" that, joined to the product
      // just named, is a known variety ("tomates cerises") — that variety, not another product.
      if (i > 0 && toks.length === 1 && out.length) {
        const joined = findAll([out[out.length - 1].head, toks[0]]).filter((h) => h.len === 2);
        if (joined.length) { const j = specific(joined[0], joined); if (!out.some((o) => o.pk === j.pk)) out.push({ id: j.id, pk: j.pk, seg: segments[i].trim(), head: out[out.length - 1].head }); continue; }
      }
      // French names start with the product ("saucisses de canard"), English ones end with it
      // ("o'sole mio frozen pasta"): the English half is read from its last noun.
      const found = findAll(toks);
      if (pi > 0) found.sort((a, b) => b.len - a.len || b.pos - a.pos);
      for (const h of found) {
        if (ING_BY_ID[h.id].ro) continue;
        if (pi === 0 && h.pos > 1) continue;
        // An animal named in the product must be this ingredient's animal: "steak de capicolle
        // de porc" is not beef, "osso buco de veau de lait" is not milk.
        const named = toks.filter((t) => ANIMALS.has(t));
        if (named.length && !named.some((t) => h.toks.includes(t) || ANIMAL_OF[h.id]?.has(t))) {
          // The product's own noun belongs to another animal ("saucisses de canard"): do not fall
          // through to the animal word itself.
          if (h.pos === 0) { stop = true; break; }
          continue;
        }
        // The product IS this ingredient, in a form we must not use (chocolate milk, bouillon
        // cubes): stop here rather than fall through to a later word ("chocolat").
        if (NOT_FOR[h.id]?.test(segments[i]) || NOT_FOR[h.id]?.test(part)) { stop = true; break; }
        // Colour words in a list of varieties ("poivrons jaunes, rouges, orange") are not fruit.
        if (i > 0 && h.toks.length === 1 && COLOURS.has(h.toks[0]) && toks.length <= 3) break;
        const vetoed = all.some((t) => FLYER_VETO.has(t) && !h.toks.includes(t));
        // Alternatives must sit in the same aisle as the main product ("courges … ou spaghettis" is not pasta).
        const sameAisle = !out.length || ING_BY_ID[out[0].id].cat === ING_BY_ID[h.id].cat;
        if (!vetoed && sameAisle) hit = specific(h, findAll(toks));
        if (vetoed) stop = true;
        break;
      }
      // "Poulet rôti barbecue ou ail et fines herbes": when the product itself is unknown,
      // what follows "ou" is a flavour, not a product.
      if (stop || (!hit && i === 0)) break;
      if (hit && !out.some((o) => o.pk === hit.pk)) out.push({ id: hit.id, pk: hit.pk, seg: segments[i].trim(), head: toks[hit.pos] });
    }
    // "fr | en" are two names for ONE product: the English half only helps when the French
    // half named nothing we know.
    if (out.length) break;
  }
  return out;
}

const FRESH_HERBS = new Set(['parsley', 'cilantro', 'basil', 'dill', 'mint', 'chives', 'thyme', 'rosemary']);
const CITRUS_IDS = new Set(['lemon', 'lime', 'orange', 'grapefruit']);
const FILLER = new Set(tokens('can cans boite boites tin jar pot bag sac paquet package pkg box bottle bouteille container contenant lb lbs pound pounds oz ounce ounces cup cups tasse tasses tbsp tsp ml litre liter gram grams boneless skinless desosse sans peau fresh frais fraiche large small medium gros grosse petit petite whole entier chopped hache diced sliced minced about environ plus extra optional optionnel each chacun tablespoon tablespoons teaspoon teaspoons cubed packed cooked cuit cuite cuits cuites peeled pele shredded grated rape finely roughly thinly coarsely day old leftover reste cut coupe drained egoutte rinsed rince reduced sodium low fat free faible'));
const FLAVOURS = new Set(['vanilla', 'chocolate', 'cocoa', 'strawberry', 'coconut']);
const WHOLE = new Set(['tete', 'botte', 'filet']);
const CONTAINER_RE_LINE = /\b(boites?|conserves?|cans?|tins?|paquets?|packages?|pkgs?|sacs?|bags?|pots?|jars?|contenants?|containers?|box(?:es)?|cartons?)\b/;
// Cooked weight / dry weight, and the density of the cooked food (g/ml).
const COOKED_FACTOR = { rice: 3, quinoa: 2.8, pasta: 2.3, rice_noodle: 2.5, lentils: 2.5, chickpeas: 1, black_beans: 1, kidney_beans: 1, white_beans: 1, oats: 2.5 };
const COOKED_DENSITY = 0.75; // units that mean "one whole" of the ingredient

/** Grams of an ingredient used by a recipe line, or null when it cannot be estimated. */
export function gramsFor(ing, q) {
  if (!ing || !q) return null;
  if (q.g != null) return q.g;
  if (q.ml != null) return ing.d ? q.ml * ing.d : null;
  if (q.len != null) return ing.units?.len ? q.len * ing.units.len : null; // "2 inch piece ginger"
  if (q.count != null) {
    if (q.countUnit === 'douzaine') return ing.u ? q.count * 12 * ing.u : null;
    if (q.countUnit === 'goutte') return q.count * 0.05; // drops: a few hundredths of a gram
    if (q.countUnit) {
      // A named unit we have no weight for ("5 feuilles", "1 poignée") is left unpriced
      // rather than guessed from the weight of a whole head or pack.
      const w = ing.units?.[q.countUnit] ?? (WHOLE.has(q.countUnit) ? ing.su ?? ing.u : null);
      return w != null ? q.count * w : null;
    }
    // Bare counts above 24 are almost always a stray number ("375 F"), not a quantity.
    // Small items are counted in larger numbers ("32 asperges", "45 mini-guimauves").
    const unit = ing.ru ?? ing.u;
    const g = unit && (q.count <= 24 || (unit <= 30 && q.count <= 100)) ? q.count * unit : null;
    return g != null && g > 3000 && q.count > 3 ? null : g;
  }
  return null;
}

const HEADING = /(:\s*$)|^[-–—_*\s]+$|^(rendement|yield|makes|donne|pour (la|le|les|l')\b[^,]*:|for the\b[^,]*:)/;
const EQUIPMENT = /\b(sacs? (ziplock|refermables?|de congelation)|ziplocks?|pics? a brochettes?|brochettes? de bois|bamboo skewers?|wooden skewers?|skewers?|lollipop sticks?|batonnets?|cure-dents?|toothpicks?|ficelle|kitchen twine|butcher'?s twine|papier (parchemin|sulfurise|d'aluminium|ciré)|parchment paper|wax paper|aluminum foil|mason jars?|pots? masson|bocaux? (en verre|stérilisés?)|styrofoam|pellets|une rape|grater|spiraleur|spiralizer|chaudron|thermometre|thermometer|moule a|cheesecloth|coton a fromage|etamine|glass jars?|quart (mason )?jar)/;
const OPTIONAL = /\b(optional|optionnel(le)?s?|facultatif|facultative|garnish|garnir|garniture|en garniture|to serve|for serving|pour servir|au service|au gout|to taste|if desired|si desire|au choix|of choice|de votre choix|de ton choix|for decorating|pour decorer|toppings?)\b/;

/** Parse one recipe ingredient line -> { raw, ing, g } */
export function parseIngredientLine(raw, lang) {
  // Brackets hold notes, sizes and tips ("(I cooked my quinoa with curry powder)", "(salt-free)"):
  // the ingredient is named outside them. An unclosed bracket runs to the end of the line.
  // Text after a dash or semicolon is a note too ("cherry tomatoes – smaller tomatoes are better").
  const outside = raw.replace(/\([^()]*(\([^()]*\)[^()]*)*\)/g, ' ').replace(/\([^)]*$/, ' ').replace(/(?<!\d)\s[–—-]\s(?!\d).*$|;.*$/, ' ');
  // When everything outside the brackets is quantity and packaging ("1 can (540 mL diced
  // tomatoes)", "1 1/2 lbs boneless (skinless chicken cutlets)"), the brackets hold the food.
  const words = tokens(outside).some((t) => /[a-z]{3}/.test(t) && !FILLER.has(t));
  let src = words ? outside : raw;
  // "vegetable broth or water", "sherry vinegar or lime juice": the first-named option is the
  // ingredient; the others only compete on price (see `alt` below).
  const optSplit = /\s(?:ou|or)\s|(?<=[a-z])\s*\/\s*(?=[a-z])|,/;
  const fullHits = findAll(tokens(src));
  if (lang === 'en') fullHits.sort((a, b) => b.pos + b.len - (a.pos + a.len) || b.len - a.len);
  else fullHits.sort((a, b) => a.pos - b.pos || b.len - a.len);
  const firstOpt = deaccent(src).split(optSplit)[0];
  let all = findAll(tokens(firstOpt));
  // "avocado or olive oil", "corn or flour tortillas", "chicken or vegetable broth": the options
  // share the last noun, so the first one is "avocado oil", "corn tortillas", "chicken broth".
  if (lang === 'en' && /\s(or|ou)\s/.test(deaccent(src)) && fullHits[0]?.len >= 2) {
    const head = fullHits[0].toks[fullHits[0].toks.length - 1];
    const joined = findAll([...tokens(firstOpt).slice(-2), head]).filter((h) => h.len >= 2 && h.toks[h.toks.length - 1] === head);
    if (joined.length) all = joined;
  }
  // "strawberry or raspberry jam", "red or green lentils": a one-word first option before a
  // last option that ends with the food — the food is that last noun.
  if (lang === 'en' && /\s(or|ou)\s/.test(deaccent(src)) && fullHits[0]) {
    const pieces = deaccent(src).split(/\s(?:or|ou)\s/);
    const content = (x) => tokens(x).filter((t) => /[a-z]/.test(t) && !FILLER.has(t) && !/^\d/.test(t));
    const lastToks = content(pieces[pieces.length - 1]);
    const firstToks = content(pieces[0]);
    const srcToks = tokens(src);
    const headTok = fullHits[0].toks[fullHits[0].toks.length - 1];
    if (firstToks.length === 1 && lastToks.length >= 2 && lastToks[lastToks.length - 1] === headTok && srcToks.lastIndexOf(headTok) === fullHits[0].pos + fullHits[0].len - 1 && !all.some((h) => h.len >= 2)) all = [fullHits[0]];
  }
  if (all.length) src = firstOpt;
  else all = fullHits;
  // "water or chicken broth": water is never the ingredient when the line names another.
  const forAt = lang === 'en' ? deaccent(src).search(/\sfor\s/) : -1;
  const forBefore = forAt > 0 ? tokens(deaccent(src).slice(0, forAt)).length : Infinity;
  if (all[0]?.id === 'water' && fullHits.some((h) => h.id !== 'water' && h.pos < forBefore)) all = fullHits.filter((h) => h.id !== 'water');
  // "300 g d'artichauts dans l'huile", "tuna packed in oil": what follows "dans"/"in" is how the
  // product is packed, not the product.
  const cut = deaccent(src).search(/\s(dans|in|packed in|conserve dans|with|avec)\s/);
  if (cut > 0) {
    const before = tokens(deaccent(src).slice(0, cut)).length;
    all = all.filter((h) => h.pos < before);
  }
  // "4 tablespoons butter for the bread", "oil for frying": what follows "for" is its use.
  if (all.some((h) => h.pos < forBefore)) all = all.filter((h) => h.pos < forBefore);
  // English names end with the food ("dill pickle", "basil pesto", "vanilla yogurt"), French
  // ones start with it ("cornichons à l'aneth"): among equally precise words, take the last in
  // English and the first in French.
  if (lang === 'en') all.sort((a, b) => b.pos + b.len - (a.pos + a.len) || b.len - a.len);
  else all.sort((a, b) => a.pos - b.pos || b.len - a.len);
  // "4 chipotle peppers", "2 serrano peppers": "pepper" after a pepper variety is that variety.
  if (lang === 'en' && all[0]?.id === 'pepper') { const v = all.find((h) => ING_BY_ID[h.id].cat === 'produce' || h.id === 'green_chiles'); if (v) all = [v, ...all.filter((h) => h !== v)]; }
  // "1 cup vanilla protein shake": a flavour word in front of an unknown product is not the product.
  if (all[0] && FLAVOURS.has(all[0].id) && /\b(shakes?|protein|ice cream|creme glacee|pudding|wafers?|cake mix|frosting|cookies?|biscuits?|bars?)\b/.test(deaccent(outside)) && all[0].id !== 'milk') all = all.slice(1);
  // "1 tsp cornstarch + 2 tsp water": water is never the ingredient when there is another one.
  if (all.length > 1 && all[0].id === 'water') all = [...all.slice(1), all[0]];
  let hit = all[0] && specific(all[0], all);
  // "fromage à raclette", "poitrines de poulet": a vague word ("fromage", "poulet") gives way
  // to a precise ingredient of the same aisle named in the same line.
  if (hit && ING_BY_ID[hit.id].ro) {
    const better = all.find((h) => h.id !== hit.id && !ING_BY_ID[h.id].ro && ING_BY_ID[h.id].cat === ING_BY_ID[hit.id].cat);
    if (better) hit = specific(better, all);
  }
  // "2 boîtes de 398 ml de tomates": tomatoes in a can are canned tomatoes.
  if (hit?.id === 'tomato' && CONTAINER_RE_LINE.test(deaccent(raw))) hit = { id: 'canned_tomato', pk: 'canned_tomato' };
  // "1 tsp dried thyme", "origan séché": a jar of dried herbs, not a fresh bunch.
  if (hit && FRESH_HERBS.has(hit.id) && /\b(dried|seche|sechee|seches|sechees|en flocons|flakes?|moulue?|ground)\b/.test(deaccent(raw))) hit = { id: 'spice', pk: 'spice' };
  const id = hit?.id ?? null;
  const ing = id ? ING_BY_ID[id] : null;
  // "1 lime (1 Tbsp juice)", "2 garlic cloves (2 tsp)": what you buy is outside the brackets.
  // But "1 boîte (796 ml) de tomates": a package's size is inside them.
  // Alternatives: "500 g de bœuf, porc ou veau haché", "ground beef or turkey" — each one
  // named is kept, and the line is priced at whichever is cheapest at the chosen store.
  let alt;
  if (hit && /\s(ou|or)\s|[a-z]\s*\/\s*[a-z]/.test(deaccent(outside))) {
    const pieces = deaccent(outside).split(/,|\s(?:ou|or)\s|(?<=[a-z])\s*\/\s*(?=[a-z])/);
    const cat = (x) => (['meat', 'fish'].includes(ING_BY_ID[x]?.cat) ? 'protein' : ING_BY_ID[x]?.cat);
    const pks = [];
    const headTok = lang === 'en' && fullHits[0]?.len >= 2 ? fullHits[0].toks[fullHits[0].toks.length - 1] : null;
    for (const piece of pieces) {
      let hs = findAll(tokens(piece));
      if (headTok) { const j = findAll([...tokens(piece).slice(-2), headTok]).filter((h) => h.len >= 2 && h.toks[h.toks.length - 1] === headTok); if (j.length) hs = j; }
      if (!hs.length) continue;
      const h = specific(hs[0], hs);
      if (ING_BY_ID[h.id].ro && !ING_BY_ID[h.id].fb) continue;
      if (cat(h.id) === cat(hit.id) && !pks.includes(h.pk)) pks.push(h.pk);
    }
    if (pks.length > 1) alt = pks;
  }
  let q = CONTAINER_RE_LINE.test(outside) ? parseQuantity(raw) : parseQuantity(outside);
  if (q.none && outside !== raw) q = parseQuantity(raw);
  // "1 medium eggplant (about 1 pound)", "2 oignons (300 g)": a count whose weight is given in
  // brackets. The stated weight is better than our average size. "Each" multiplies; otherwise
  // the reading (total or each) closest to our average size is used.
  if (ing && q.count != null && q.g == null && q.ml == null) {
    for (const b of raw.match(/\(([^()]*)\)/g) || []) {
      const t = deaccent(b);
      // Only a bracket that IS a weight ("(about 1 pound)", "(600g/1.3 lbs; see note)"), not
      // one that mentions a weight in passing ("(1 ½ avocados yield ~270 g diced)").
      if (/\b(or|ou|sub|substitute|remplacer|alternative|yields?|donne|makes?)\b/.test(t) || !/^\(\s*(?:about|approx\.?|approximately|environ|env\.|roughly|around|total|~|≈)?\s*[\d.,/ ~-]+\s*(g|kg|grammes?|grams?|kilos?|oz|ounces?|lbs?|pounds?|livres?)\b/.test(t.replace(/[½¼¾⅓⅔]/g, '1'))) continue;
      const w = parseQuantity(t.slice(1, -1)).g;
      if (!w) continue;
      const each = /\b(each|chacune?s?|chaque|apiece)\b/.test(t);
      const total = /\b(total|in all|en tout)\b/.test(t);
      const avg = (ing.ru ?? ing.u) * q.count;
      const tot = each || (!total && avg > 0 && q.count > 1 && Math.abs(Math.log((w * q.count) / avg)) < Math.abs(Math.log(w / avg)) - 0.5) ? w * q.count : w;
      q = { g: tot, ml: null };
      break;
    }
  }
  // Cooked grains weigh ~2.5–3x their dry weight: "4 cups cooked rice" is ~250 g of rice to buy.
  if (ing && COOKED_FACTOR[ing.id] && (/\b(cooked|cuite?s?)\b/.test(deaccent(outside)) || /\(\s*(?:cooked|cuite?s?)\s*\)/.test(deaccent(raw))) && !/\b(uncooked|non cuite?s?|crue?s?|dry|sec|seche)\b/.test(deaccent(outside))) {
    q = { ...q, g: q.g != null ? q.g / COOKED_FACTOR[ing.id] : null, ml: q.ml != null ? (q.ml * COOKED_DENSITY) / (ing.d || 1) / COOKED_FACTOR[ing.id] : null };
  }
  // "Juice of 1 lemon, about 2 tbsp", "le jus de 2 limes": what is bought is the fruit.
  if (ing && CITRUS_IDS.has(id)) {
    const m = deaccent(outside).match(/(\d+(?:[.,]\d+)?|\d\/\d|½|¼|une?|one|a|half|demi)\s+(?:(?:gros|grosse|large|small|petit|petite|medium)\s+)?(?:citrons?|limes?|lemons?|oranges?|clementines?|pamplemousses?|grapefruits?)\b(?!\s*(?:wedges?|slices?|quartiers?|tranches?|rondelles?))/);
    if (m) {
      const n = { un: 1, une: 1, one: 1, a: 1, half: 0.5, demi: 0.5, '½': 0.5, '¼': 0.25 }[m[1]] ?? (m[1].includes('/') ? +m[1][0] / +m[1][2] : parseFloat(m[1].replace(',', '.')));
      if (n > 0 && n <= 12) q = { g: null, ml: null, count: n, countUnit: null };
    }
  }
  // A chicken "cuisse" or "leg" is the whole leg (thigh and drumstick), not a drumstick.
  let g = ing ? gramsFor(ing, q) : null;
  if (id === 'chicken_drumstick' && q.count != null && q.g == null && !q.countUnit && /\b(cuisses?|legs?|quarters?)\b/.test(deaccent(outside)) && !/\b(pilons?|drumsticks?)\b/.test(deaccent(outside))) g = q.count * 280;
  // Bouillon concentrate, powder or cubes: what costs money is the broth they make. A spoonful
  // (~5 g) or a cube costs about what 65 g / 110 g of carton broth costs.
  if (id && id.startsWith('broth_') && /\b(poudre|powder|cubes?|concentre|concentrate|better than bouillon|granules?|base|oxo|knorr)\b/.test(deaccent(raw))) {
    g = q.count != null && q.g == null && q.ml == null ? q.count * 110 : g != null ? g * 13 : null;
  }
  // nq: the line gives no quantity at all ("sel et poivre", "olive oil, for drizzling").
  const fm = forms(raw);
  // Canned fruit or vegetables ("1 20 oz can pineapple chunks") are a different product from
  // fresh: without evidence of what the canned one costs, the line is left unpriced.
  const canned = ing && ing.cat === 'produce' && !['canned_tomato', 'corn'].includes(id) && /\b(cans?|canned|tins?|tinned|en conserve|conserves?|jarred|bocal)\b/.test(deaccent(outside));
  // Ready-made pulled pork ("1 contenant de porc effiloché avec sauce") is not raw shoulder.
  const ready = id === 'pork_shoulder' && /\b(effiloche|pulled)\b/.test(deaccent(outside)) && !/\b(epaule|shoulder|butt|soc)\b/.test(deaccent(outside));
  // Not something to buy: section headings ("POUR LA GARNITURE :"), yields ("Rendement : 1 litre"),
  // equipment ("Des sacs ziplock", "16 pics à brochettes", "Parchment paper").
  // Equipment only when no food is named ("grated using a box grater" is still celery).
  const x = HEADING.test(deaccent(raw).trim()) || (!id && EQUIPMENT.test(deaccent(raw))) ? 1 : undefined;
  // Optional or to-serve extras: they count when we can price them, never against the recipe.
  const opt = OPTIONAL.test(deaccent(raw)) ? 1 : undefined;
  return { raw, ing: x ? null : id, x, opt, alt, pk: hit && hit.pk !== id ? hit.pk : undefined, g: g != null ? Math.round(g * 10) / 10 : null, nq: q.none ? 1 : undefined, fm: fm.length ? fm : undefined, np: canned || ready ? 1 : undefined };
}

// ---- Product forms ---------------------------------------------------------------------
// The same ingredient is sold in forms that are not interchangeable: sliced cheese is not
// the grated mozzarella a gratin asks for, smoked or breaded chicken is not raw chicken.
// A flyer item in one of these forms is only used for a recipe line that asks for that form.
const FORMS = {
  sliced: /\b(tranche|tranches|tranchee?s?|slice|slices|sliced|singles)\b/,
  smoked: /\b(fumee?s?|smoked)\b/,
  dried: /\b(sechee?s?|dried|deshydratee?s?)\b/,
  cooked: /\b(cuite?s?|cooked|rotie?s?|roti|rotisserie|roasted|barbecue|bbq|pret a manger|ready to eat)\b/,
  breaded: /\b(panee?s?|breaded|croustillante?s?|crispy|tempura)\b/,
  seasoned: /\b(assaisonnee?s?|marinee?s?|seasoned|marinated|epicee?s?|tandoori|tikka|shawarma|souvlaki|kebab|teriyaki|bbq|barbecue|cajun|buffalo|honey garlic|aux? (?:fines )?herbes|a l ail|saveur|flavou?r(?:ed)?)\b/,
  stuffed: /\b(farcie?s?|stuffed)\b/,
  ball: /\b(bocconcini|perles?|pearls?|burrata)\b/,
  curds: /\b(en grains?|curds?)\b/,
  spread: /\b(tartinade|a tartiner|spread|fondue?|processed|kraft singles|ficello|cheestrings?|babybel|vache qui rit)\b/,
  frozen: /\b(surgelee?s?|frozen|congelee?s?)\b/,
  // Prepared produce: cut, cored, in chunks — sold by the tub at several times the whole price.
  cut: /\b(coupee?s?|en morceaux|morceaux|en des|chunks|en cubes|decortiquee?s?|cored|tidbits|spirales?|spiralized|en riz|riced|pret a manger|ready to eat)\b/,
  drink: /\b(a boire|drinkable|boisson)\b/,
  canned: /\b(en conserve|canned|en boite)\b/,
};
// Ingredients for which a form is the normal way the product is sold.
const FORM_OK = {
  ham: ['sliced', 'smoked', 'cooked'], bacon: ['sliced', 'smoked'], sausage: ['smoked', 'cooked', 'seasoned'],
  pepperoni: ['sliced', 'smoked', 'dried', 'seasoned'], prosciutto: ['sliced', 'dried', 'smoked'], salmon_smoked: ['smoked', 'sliced'],
  bread: ['sliced'], buns: ['sliced'], tuna_can: ['canned'], sardine: ['canned', 'smoked'], canned_tomato: ['canned', 'seasoned'],
  chickpeas: ['canned'], black_beans: ['canned'], kidney_beans: ['canned'], white_beans: ['canned', 'cooked'], corn: ['canned'],
  raisins: ['dried'], sundried_tomato: ['dried'], pasta: ['dried'], rice_noodle: ['dried'], tofu: ['smoked'], soy_milk: ['drink'],
  mozzarella: ['ball'],
  // Commonly sold frozen and interchangeable that way.
  shrimp: ['frozen', 'cooked'], white_fish: ['frozen'], scallop: ['frozen'], mussels: ['frozen'], salmon: ['frozen'], trout: ['frozen'],
  peas: ['frozen'], corn: ['frozen', 'canned'], frozen_veg: ['frozen'], frozen_fruit: ['frozen'], green_beans: ['frozen'], chicken_wing: ['frozen'],
  spinach_frozen: ['frozen'], pie_crust: ['frozen'], blueberry: ['frozen'], raspberry: ['frozen'], strawberry: ['frozen'], edamame: ['frozen'], broth_chicken: ['seasoned'], broth_beef: ['seasoned'], broth_veg: ['seasoned'], pickles: ['seasoned'],
  olives: ['stuffed', 'seasoned'], tomato_sauce: ['seasoned'], hot_sauce: ['seasoned', 'smoked'], dressing: ['seasoned'], crackers: ['seasoned'],
};

export function forms(text) {
  const t = deaccent(text).replace(/[^a-z0-9]+/g, ' ');
  return Object.keys(FORMS).filter((k) => FORMS[k].test(t));
}

/** Can this flyer item (with forms `itemForms`) stand in for a recipe line with forms `lineForms`? */
export function formsCompatible(ingId, itemForms, lineForms) {
  if (!itemForms?.length) return true;
  const ok = FORM_OK[ingId] || [];
  return itemForms.every((f) => ok.includes(f) || lineForms?.includes(f));
}
