import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { bestOffers, costRecipe } from '../shared/cost.js';
import { t as mkT } from './i18n.js';
import { buildIdeas } from '../shared/synergy.js';
import { storeGuide } from '../shared/stores.js';
import { localDate } from '../shared/text.js';
import { isMemberPrice } from '../shared/deals.js';

// Most people shop at one store: the app starts on a single store and switches when another
// is picked. Comparing several stores at once is an explicit option.
const PREFERRED = ['superc', 'maxi', 'iga', 'metro', 'provigo', 'walmart', 'adonis'];
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const load = (k, d) => { try { return JSON.parse(localStorage.getItem('gm.' + k)) ?? d; } catch { return d; } };
function usePersisted(key, initial) {
  const [v, set] = useState(() => load(key, initial));
  useEffect(() => { try { localStorage.setItem('gm.' + key, JSON.stringify(v)); } catch { /* private mode */ } }, [key, v]);
  return [v, set];
}

export function AppProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lang, setLang] = usePersisted('lang', (navigator.language || 'fr').startsWith('en') ? 'en' : 'fr');
  const [region, setRegion] = usePersisted('region', 'montreal');
  const [storeSel, setStoreSel] = usePersisted('stores3', null); // null = all stores of the region
  const [plan, setPlan] = usePersisted('plan', {}); // recipeId -> batches
  const [multi, setMultiRaw] = usePersisted('multi', false);
  const [days, setDays] = usePersisted('days', {}); // recipeId -> 0..6 (Mon..Sun)
  const [people, setPeople] = usePersisted('people', 2);
  const [budget, setBudget] = usePersisted('budget', null);
  const [checks, setChecks] = usePersisted('checks', {}); // grocery list ticks, by ingredient
  const [pantry, setPantry] = usePersisted('pantry', []); // ingredients already at home
  const [favs, setFavs] = usePersisted('favs', []);
  const [extras, setExtras] = usePersisted('extras', []); // flyer deals added to the grocery list by hand
  const [left, setLeft] = usePersisted('left', {}); // recipeId -> day its leftovers are eaten
  const [recent, setRecent] = usePersisted('recent', []); // recipes proposed lately, not to repeat
  const [targets, setTargets] = usePersisted('targets', { minp: 0, maxk: 0 }); // ingredients to watch for deals
  const [theme, setTheme] = usePersisted('theme', 'light'); // light unless the visitor asks for dark
  const [noMember, setNoMember] = usePersisted('noMember', false); // leave out loyalty-card / app-only prices
  const [week, setWeek] = useState('now'); // 'now' | 'next' (flyers are published a few days ahead)
  const [attempt, setAttempt] = useState(0); // bumped by "Retry" after a failed download

  // Recipes, reference prices and the flyer index first; then the flyer items of the visitor's
  // region only (one file per region), fetched again when the region changes.
  const [items, setItems] = useState({}); // regionId -> flyer items
  const get = (f) => fetch(`./data/${f}.json`).then((r) => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
  useEffect(() => {
    setError(null);
    // The saved region's flyers come in the same round trip (no waterfall); if that region no
    // longer exists the effect below fetches the first one once the index is known.
    Promise.all([get('recipes'), get('flyers-index'), get('meta'), get(`flyers-${region}`).catch(() => null)])
      .then(([recipes, flyers, meta, own]) => { if (own && flyers.regions?.[region]) setItems((x) => ({ ...x, [region]: own.items })); setData({ recipes, flyers, meta }); })
      .catch((e) => setError(String(e.message || e)));
  }, [attempt]);
  const regionId = data ? (data.flyers.regions?.[region] ? region : Object.keys(data.flyers.regions || {})[0] || null) : null;
  useEffect(() => {
    if (!regionId || items[regionId]) return;
    get(`flyers-${regionId}`).then((d) => setItems((x) => ({ ...x, [regionId]: d.items }))).catch((e) => setError(String(e.message || e)));
  }, [regionId, attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  // While another region's flyers download, keep showing the region already loaded (the
  // page, and the store menu that triggered the change, stay on screen).
  const shownRef = useRef(null);
  if (regionId && items[regionId]) shownRef.current = regionId;
  const shown = regionId && items[regionId] ? regionId : shownRef.current;
  useEffect(() => { document.documentElement.lang = lang === 'en' ? 'en-CA' : 'fr-CA'; }, [lang]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  // The derived data is layered so that each piece is recomputed only when its own inputs
  // change: ticking the grocery list, typing a budget or switching the theme no longer re-costs
  // 1,380 recipes. Costing depends on the region, week, chosen stores and pantry only.
  const base = useMemo(() => {
    if (!data || !items[shown]) return null;
    const { recipes, meta } = data;
    const flyers = { ...data.flyers, items: items[shown] };
    return {
      recipes, flyers, meta,
      byId: new Map(recipes.map((r) => [r.id, r])),
      baseline: meta.baseline?.prices || {},
      hist: meta.baseline?.hist || {},
      regions: flyers.regions || {},
      storeName: Object.fromEntries((flyers.stores || []).map((s) => [s.id, s.name])),
      sourceName: Object.fromEntries((meta.sources || []).map((s) => [s.id, s.name])),
    };
  }, [data, items, shown]);

  const area = useMemo(() => {
    if (!base) return null;
    const { flyers, regions } = base;
    const reg = shown ? regions[shown] : { flyers: [], stores: [] };
    const flyerSet = new Set(reg.flyers);
    const today = localDate();
    const live = flyers.items.filter((i) => i.flyers.some((f) => flyerSet.has(f)) && (!i.to || i.to >= today));
    // Next flyer week = the most common upcoming start date (Thursday for most banners), and
    // only once a real flyer is out: one stray Sunday promo is not a next week.
    const starts = {};
    for (const i of live) if (i.from > today && i.ing) starts[i.from] = (starts[i.from] || 0) + 1;
    const nextStart = Object.keys(starts).filter((d) => starts[d] >= 20).sort((a, b) => starts[b] - starts[a])[0] || null;
    const ref = week === 'next' && nextStart ? nextStart : today;
    const regionItems = live.filter((i) => (!i.from || i.from <= ref) && (!i.to || i.to >= ref) && !(noMember && isMemberPrice(i)));
    const regionStores = (flyers.stores || []).filter((s) => reg.stores.includes(s.id));
    return { regionId, loadingRegion: regionId !== shown, today, nextStart, ref, regionItems, regionStores, available: regionStores.map((s) => s.id) };
  }, [base, regionId, shown, week, noMember]);

  // Per-store offers and the store guide: only when the region or week changes.
  const perStore = useMemo(() => {
    if (!area) return null;
    const { regionItems, available, ref } = area;
    const { baseline } = base;
    return {
      guide: storeGuide(bestOffers(regionItems, new Set(available), ref, baseline), baseline, available),
      // Each store's own offers, for "this recipe at each store" on the recipe page.
      storeOffers: new Map(available.map((id) => [id, bestOffers(regionItems, new Set([id]), ref, baseline)])),
    };
  }, [base, area]);

  const selected = useMemo(() => {
    if (!area) return new Set();
    const { available } = area;
    let chosen = (storeSel || []).filter((id) => available.includes(id));
    if (!chosen.length) chosen = [PREFERRED.find((id) => available.includes(id)) || available[0]].filter(Boolean);
    return new Set(multi ? chosen : chosen.slice(0, 1));
  }, [area, storeSel, multi]);

  const offers = useMemo(() => (area ? bestOffers(area.regionItems, selected, area.ref, base.baseline) : null), [base, area, selected]);
  const have = useMemo(() => new Set(pantry), [pantry]);
  const costs = useMemo(() => (offers ? new Map(base.recipes.map((r) => [r.id, costRecipe(r, offers, base.baseline, have)])) : null), [base, offers, have]);
  const ideas = useMemo(() => (costs ? buildIdeas(base.recipes, costs, offers, base.baseline) : null), [base, costs, offers]);

  // Setters and actions never change identity, so the context below stays cheap to rebuild.
  const actions = useMemo(() => ({
    setTheme, setPeople, setBudget, setTargets, setWeek, setLang, setNoMember,
    // A deal is kept with what the list needs to show it, even after the flyer has expired.
    toggleExtra: (i) => setExtras((x) => (x.some((e) => e.id === i.id) ? x.filter((e) => e.id !== i.id) : [...x, { id: i.id, name: i.name, store: i.store, price: i.price, pre: i.pre, post: i.post, to: i.to }])),
    clearExtras: () => setExtras([]),
    setDay: (id, d) => setDays((x) => ({ ...x, [id]: d })),
    setLeftDay: (id, d) => setLeft((x) => ({ ...x, [id]: d })),
    remember: (ids) => setRecent((x) => [...new Set([...ids, ...x])].slice(0, 20)),
    replaceInPlan: (oldId, item) => { setPlan((p) => { const q = { ...p }; delete q[oldId]; q[item.id] = item.batches; return q; }); setDays((d) => ({ ...d, [item.id]: d[oldId] })); },
    setPlanAll: (list) => { setPlan(Object.fromEntries(list.map((x) => [x.id, x.batches]))); setDays(Object.fromEntries(list.map((x) => [x.id, x.day]))); },
    toggleCheck: (id) => setChecks((x) => { const y = { ...x }; if (y[id]) delete y[id]; else y[id] = 1; return y; }),
    clearChecks: () => setChecks({}),
    togglePantry: (id) => setPantry((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id])),
    setPantryAll: (ids) => setPantry((x) => [...new Set([...x, ...ids])]),
    toggleFav: (id) => setFavs((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id])),
    setRegion: (id) => { setRegion(id); setStoreSel(null); },
    setBatches: (id, n) => setPlan((p) => { const q = { ...p }; if (n > 0) q[id] = n; else delete q[id]; return q; }),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const storeActions = useMemo(() => ({
    setMulti: (on) => { setMultiRaw(on); if (!on) setStoreSel([...selected].slice(0, 1)); },
    // One store: picking another switches to it. Several stores: picking toggles (never empty).
    pickStore: (id, only) => {
      if (!multi || only) return setStoreSel([id]);
      const n = new Set(selected);
      if (n.has(id) && n.size > 1) n.delete(id); else n.add(id);
      setStoreSel([...n]);
    },
  }), [multi, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const words = useMemo(() => {
    const money = new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD' });
    return { t: mkT(lang), fmt: (n) => (n == null ? '—' : money.format(n)) };
  }, [lang]);

  const value = useMemo(() => {
    if (!base || !costs) return null;
    return {
      ...base, ...area, ...perStore, ...actions, ...storeActions, ...words,
      selected, offers, costs, ideas, have, multi, theme, lang, noMember,
      days, people, budget, checks, pantry, favs, extras, left, recent, targets, plan,
      week: area.ref === area.today ? 'now' : 'next',
    };
  }, [base, area, perStore, actions, storeActions, words, selected, offers, costs, ideas, have, multi, theme, lang, noMember, days, people, budget, checks, pantry, favs, extras, left, recent, targets, plan]);

  if (error) {
    const fr = lang !== 'en';
    return (
      <div className="state" role="alert">
        <p>⚠️ {fr ? 'Les données n’ont pas pu être chargées' : 'The data could not be loaded'} ({error}).</p>
        <button type="button" className="btn" onClick={() => setAttempt((n) => n + 1)}>{fr ? 'Réessayer' : 'Retry'}</button>
      </div>
    );
  }
  if (!value) {
    return (
      <div aria-busy="true" aria-label="Chargement">
        <div className="skel-top" />
        <div className="wrap">
          <div className="skel skel-title" />
          <div className="grid">{Array.from({ length: 8 }, (_, i) => <div className="skel-card" key={i}><div className="skel" /><i className="skel" /><i className="skel" /></div>)}</div>
        </div>
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Tiny hash router: "#/path?query". */
export function useRoute() {
  const parse = () => {
    const h = window.location.hash.replace(/^#/, '') || '/';
    const [path, qs = ''] = h.split('?');
    return { path, query: new URLSearchParams(qs) };
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
