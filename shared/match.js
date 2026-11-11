// Maps free text (recipe ingredient line, flyer product name, StatCan product label)
// to a canonical ingredient id. Longest synonym phrase wins; ties go to the earliest.
import { INGREDIENTS, ING_BY_ID } from './ingredients.js';
import { tokens, parseQuantity, deaccent } from './text.js';

const INDEX = new Map(); // first token -> [{ toks, id }]
for (const ing of INGREDIENTS) {
  for (const syn of ing.syn) {
    const toks = tokens(syn);
    if (!toks.length) continue;
    if (!INDEX.has(toks[0])) INDEX.set(toks[0], []);
    INDEX.get(toks[0]).push({ toks, id: ing.id });
  }
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
].join(' ')));

const LEADING = new Set(tokens('frais fraîche fresh boneless désossé skinless lean maigre extra mini gros grosse petit petite large small surgelé frozen bio biologique organic vrai real whole entier jeune baby nouveau new'));
const ANIMALS = new Set(tokens('porc pork poulet chicken dinde dindon turkey boeuf beef veau veal agneau lamb saumon salmon thon tuna canard duck'));

function findAll(toks) {
  const hits = [];
  for (let i = 0; i < toks.length; i++) {
    const cands = INDEX.get(toks[i]);
    if (!cands) continue;
    for (const c of cands) {
      let ok = true;
      for (let k = 1; k < c.toks.length; k++) if (toks[i + k] !== c.toks[k]) { ok = false; break; }
      if (ok) hits.push({ id: c.id, len: c.toks.length, pos: i, toks: c.toks });
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
  const all = tokens(name);
  const out = [];
  // "fr | en" are two renderings of the same name; inside one, "X ou Y, Z" lists alternatives.
  for (const part of deaccent(name).split('|')) {
    const segments = part.split(/\s*(?:,|;|\bou\b|\bor\b|\/)\s*/).filter((x) => x.trim());
    for (let i = 0; i < segments.length; i++) {
      const toks = tokens(segments[i]);
      while (toks.length > 1 && LEADING.has(toks[0])) toks.shift(); // "fresh boneless chicken breasts"
      let hit = null;
      for (const h of findAll(toks)) {
        if (ING_BY_ID[h.id].ro) continue;
        if (h.pos > 1) continue;
        // "steak de capicolle de porc" is not beef: another animal named in the product rules the match out.
        const cat = ING_BY_ID[h.id].cat;
        if ((cat === 'meat' || cat === 'fish') && !h.toks.some((t) => ANIMALS.has(t)) && toks.some((t) => ANIMALS.has(t))) continue;
        const vetoed = all.some((t) => FLYER_VETO.has(t) && !h.toks.includes(t));
        // Alternatives must sit in the same aisle as the main product ("courges … ou spaghettis" is not pasta).
        const sameAisle = !out.length || ING_BY_ID[out[0]].cat === ING_BY_ID[h.id].cat;
        if (!vetoed && sameAisle) hit = h.id;
        break;
      }
      // "Poulet rôti barbecue ou ail et fines herbes": when the product itself is unknown,
      // what follows "ou" is a flavour, not a product.
      if (!hit && i === 0) break;
      if (hit && !out.includes(hit)) out.push(hit);
    }
  }
  return out;
}

const WHOLE = new Set(['tete', 'botte', 'filet']); // units that mean "one whole" of the ingredient

/** Grams of an ingredient used by a recipe line, or null when it cannot be estimated. */
export function gramsFor(ing, q) {
  if (!ing || !q) return null;
  if (q.g != null) return q.g;
  if (q.ml != null) return ing.d ? q.ml * ing.d : null;
  if (q.count != null) {
    if (q.countUnit === 'douzaine') return ing.u ? q.count * 12 * ing.u : null;
    if (q.countUnit) {
      // A named unit we have no weight for ("5 feuilles", "1 poignée") is left unpriced
      // rather than guessed from the weight of a whole head or pack.
      const w = ing.units?.[q.countUnit] ?? (WHOLE.has(q.countUnit) ? ing.u : null);
      return w != null ? q.count * w : null;
    }
    // Bare counts above 24 are almost always a stray number ("375 F"), not a quantity.
    const unit = ing.ru ?? ing.u;
    const g = unit && q.count <= 24 ? q.count * unit : null;
    return g != null && g > 3000 && q.count > 3 ? null : g;
  }
  return null;
}

/** Parse one recipe ingredient line -> { raw, ing, g } */
export function parseIngredientLine(raw) {
  const id = matchIngredient(raw);
  const ing = id ? ING_BY_ID[id] : null;
  const q = parseQuantity(raw);
  const g = ing ? gramsFor(ing, q) : null;
  // nq: the line gives no quantity at all ("sel et poivre", "olive oil, for drizzling").
  const fm = forms(raw);
  return { raw, ing: id, g: g != null ? Math.round(g * 10) / 10 : null, nq: q.none ? 1 : undefined, fm: fm.length ? fm : undefined };
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
  seasoned: /\b(assaisonnee?s?|marinee?s?|seasoned|marinated|epicee?s?|aux? (?:fines )?herbes|a l ail|saveur|flavou?r(?:ed)?)\b/,
  stuffed: /\b(farcie?s?|stuffed)\b/,
  ball: /\b(bocconcini|perles?|pearls?|burrata)\b/,
  curds: /\b(en grains?|curds?)\b/,
  spread: /\b(tartinade|a tartiner|spread|fondue?|processed|kraft singles|ficello|cheestrings?|babybel|vache qui rit)\b/,
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
  mozzarella: ['ball'], broth_chicken: ['seasoned'], broth_beef: ['seasoned'], broth_veg: ['seasoned'], pickles: ['seasoned'],
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
