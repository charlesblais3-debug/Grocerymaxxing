// "Biggest deals" on the Flyers tab: this week's flyer prices ranked by how far they are
// below what the ingredient normally costs (the same reference price used to cost recipes),
// never by the "regular price" a store prints next to its own discount.
import { ING_BY_ID } from './ingredients.js';
import { baseId } from './match.js';

const SNACKS = new Set(['chips', 'crackers', 'chocolate', 'peanuts', 'almonds', 'walnuts', 'seeds', 'granola', 'marshmallow', 'ice_cream', 'raisins', 'croutons', 'hummus', 'guacamole', 'salsa', 'cocoa']);
const PROTEINS = new Set(['egg', 'tofu', 'chickpeas', 'black_beans', 'kidney_beans', 'white_beans', 'lentils', 'refried_beans', 'tuna_can', 'sardine', 'peanut_butter']);
const DRINKS = new Set(['juice', 'orange_juice', 'soy_milk', 'coffee', 'coffee_ground', 'wine', 'spirits']);

/** Shopping sections, in display order: [id, fr, en]. */
export const DEAL_SECTIONS = [
  ['protein', 'Protéines', 'Protein'],
  ['produce', 'Fruits et légumes', 'Produce'],
  ['dairy', 'Produits laitiers', 'Dairy'],
  ['snacks', 'Collations', 'Snacks'],
  ['pantry', 'Garde-manger', 'Pantry'],
  ['bakery', 'Boulangerie', 'Bakery'],
  ['frozen', 'Surgelés', 'Frozen'],
  ['drinks', 'Boissons', 'Drinks'],
];

/** Shopping section of an ingredient id. */
export function dealSection(id) {
  const ing = ING_BY_ID[id];
  if (!ing) return null;
  if (SNACKS.has(id)) return 'snacks';
  if (DRINKS.has(id)) return 'drinks';
  if (PROTEINS.has(id) || ing.cat === 'meat' || ing.cat === 'fish') return 'protein';
  if (ing.cat === 'spices' || ing.cat === 'other') return 'pantry';
  return ing.cat;
}

/**
 * @param {object[]} items flyer items valid today in the region
 * @param {{stores:Set<string>, section?:string, baseline:object}} o
 * @returns {{item:object, pk:string, ing:string, off:number, perG:number, ref:number}[]} best first
 */
export function topDeals(items, { stores, section = '', baseline }) {
  const out = [];
  const seen = new Set();
  for (const it of items) {
    if (!it.pg || !stores.has(it.store)) continue;
    // A product listed in several flyers of the same store counts once.
    const key = `${it.store}|${it.name}|${it.price}`;
    if (seen.has(key)) continue;
    let best = null;
    for (const [pk, perG] of Object.entries(it.pg)) {
      const ref = baseline[pk];
      if (!ref?.perG) continue;
      // Only prices we trust as a comparison: a solid reference (Statistics Canada, Walmart's
      // shelf price, or at least two flyer products), and no "deal" so deep it is a misread size.
      const solid = ref.kind === 'statcan' || ref.kind === 'shelf' || (ref.n || 0) >= 2;
      const off = 1 - perG / ref.perG;
      if (!solid || off <= 0.05 || perG < ref.perG * 0.4) continue;
      const ing = baseId(pk);
      if (section && dealSection(ing) !== section) continue;
      if (!best || off > best.off) best = { item: it, pk, ing, off, perG, ref: ref.perG };
    }
    if (best) { seen.add(key); out.push(best); }
  }
  return out.sort((a, b) => b.off - a.off || a.perG - b.perG);
}
