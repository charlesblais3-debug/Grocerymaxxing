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
  const segments = deaccent(name).split(/\s*(?:\||,|;|\bou\b|\bor\b|\/)\s*/).filter(Boolean);
  for (const seg of segments) {
    const toks = tokens(seg);
    for (const h of findAll(toks)) {
      if (ING_BY_ID[h.id].ro) continue;
      if (h.pos > 1) continue;
      // "steak de capicolle de porc" is not beef: another animal named in the product rules the match out.
      const cat = ING_BY_ID[h.id].cat;
      if ((cat === 'meat' || cat === 'fish') && !h.toks.some((t) => ANIMALS.has(t)) && toks.some((t) => ANIMALS.has(t))) continue;
      const vetoed = all.some((t) => FLYER_VETO.has(t) && !h.toks.includes(t));
      // Alternatives must sit in the same aisle as the main product ("courges … ou spaghettis" is not pasta).
      const sameAisle = !out.length || ING_BY_ID[out[0]].cat === ING_BY_ID[h.id].cat;
      if (!vetoed && sameAisle && !out.includes(h.id)) out.push(h.id);
      break;
    }
  }
  return out;
}

/** Grams of an ingredient used by a recipe line, or null when it cannot be estimated. */
export function gramsFor(ing, q) {
  if (!ing || !q) return null;
  if (q.g != null) return q.g;
  if (q.ml != null) return ing.d ? q.ml * ing.d : null;
  if (q.count != null) {
    if (q.countUnit === 'douzaine') return ing.u ? q.count * 12 * ing.u : null;
    if (q.countUnit) return ing.units?.[q.countUnit] != null ? q.count * ing.units[q.countUnit] : null;
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
  return { raw, ing: id, g: g != null ? Math.round(g * 10) / 10 : null, nq: q.none ? 1 : undefined };
}
