// Maps free text (recipe ingredient line, flyer product name, StatCan product label)
// to a canonical ingredient id. Longest synonym phrase wins; ties go to the earliest.
import { INGREDIENTS, ING_BY_ID } from './ingredients.js';
import { tokens, parseQuantity } from './text.js';

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
  'modeler décoration ornement fleur plante bougie chandelle vêtement chandail pyjama monsieur',
  'bébé baby aromatisé flavoured vitamines supplément lotion dentifrice parfum arôme',
].join(' ')));

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

/** @returns {string|null} canonical ingredient id */
export function matchIngredient(text, { flyer = false } = {}) {
  const toks = tokens(text);
  const hits = findAll(toks);
  if (!flyer) return hits[0]?.id ?? null;
  for (const h of hits) {
    if (ING_BY_ID[h.id].ro) continue;
    const vetoed = toks.some((t) => FLYER_VETO.has(t) && !h.toks.includes(t));
    if (vetoed) return null;
    return h.id;
  }
  return null;
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
    return ing.u && q.count <= 24 ? q.count * ing.u : null;
  }
  return null;
}

/** Parse one recipe ingredient line -> { raw, ing, g } */
export function parseIngredientLine(raw) {
  const id = matchIngredient(raw);
  const ing = id ? ING_BY_ID[id] : null;
  const g = ing ? gramsFor(ing, parseQuantity(raw)) : null;
  return { raw, ing: id, g: g != null ? Math.round(g * 10) / 10 : null };
}
