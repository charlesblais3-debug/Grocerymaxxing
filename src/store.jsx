import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { bestOffers, costRecipe } from '../shared/cost.js';
import { t as mkT } from './i18n.js';
import { buildIdeas } from '../shared/synergy.js';
import { storeGuide } from '../shared/stores.js';

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
  const [left, setLeft] = usePersisted('left', {}); // recipeId -> day its leftovers are eaten
  const [recent, setRecent] = usePersisted('recent', []); // recipes proposed lately, not to repeat
  const [targets, setTargets] = usePersisted('targets', { minp: 0, maxk: 0 }); // ingredients to watch for deals
  const [theme, setTheme] = usePersisted('theme', 'light'); // light unless the visitor asks for dark
  const [week, setWeek] = useState('now'); // 'now' | 'next' (flyers are published a few days ahead)

  useEffect(() => {
    const get = (f) => fetch(`./data/${f}.json`).then((r) => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
    Promise.all([get('recipes'), get('flyers'), get('meta')])
      .then(([recipes, flyers, meta]) => setData({ recipes, flyers, meta }))
      .catch((e) => setError(String(e.message || e)));
  }, []);
  useEffect(() => { document.documentElement.lang = lang === 'en' ? 'en-CA' : 'fr-CA'; }, [lang]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const value = useMemo(() => {
    if (!data) return null;
    const { recipes, flyers, meta } = data;
    const regions = flyers.regions || {};
    const regionId = regions[region] ? region : Object.keys(regions)[0] || null;
    const reg = regionId ? regions[regionId] : { flyers: [], stores: [] };
    const flyerSet = new Set(reg.flyers);
    const today = new Date().toISOString().slice(0, 10);
    const live = flyers.items.filter((i) => i.flyers.some((f) => flyerSet.has(f)) && (!i.to || i.to >= today));
    // Next flyer week = the most common upcoming start date (Thursday for most banners).
    const starts = {};
    for (const i of live) if (i.from > today) starts[i.from] = (starts[i.from] || 0) + 1;
    const nextStart = Object.keys(starts).sort((a, b) => starts[b] - starts[a])[0] || null;
    const ref = week === 'next' && nextStart ? nextStart : today;
    const regionItems = live.filter((i) => (!i.from || i.from <= ref) && (!i.to || i.to >= ref));
    const regionStores = (flyers.stores || []).filter((s) => reg.stores.includes(s.id));
    const available = regionStores.map((s) => s.id);
    let chosen = (storeSel || []).filter((id) => available.includes(id));
    if (!chosen.length) chosen = [PREFERRED.find((id) => available.includes(id)) || available[0]].filter(Boolean);
    const selected = new Set(multi ? chosen : chosen.slice(0, 1));
    const baseline = meta.baseline?.prices || {};
    const offers = bestOffers(regionItems, selected, ref, baseline);
    const have = new Set(pantry);
    const costs = new Map(recipes.map((r) => [r.id, costRecipe(r, offers, baseline, have)]));
    const ideas = buildIdeas(recipes, costs, offers, baseline);
    const guide = storeGuide(bestOffers(regionItems, new Set(available), ref, baseline), baseline, available);
    const byId = new Map(recipes.map((r) => [r.id, r]));
    const storeName = Object.fromEntries((flyers.stores || []).map((s) => [s.id, s.name]));
    const sourceName = Object.fromEntries((meta.sources || []).map((s) => [s.id, s.name]));
    const money = new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD' });
    return {
      recipes, byId, flyers, meta, regions, regionId, regionStores, selected, regionItems, offers, baseline, costs,
      ideas, guide, multi, theme, setTheme,
      days, people, setPeople, budget, setBudget, checks, pantry, have, favs, hist: meta.baseline?.hist || {},
      setDay: (id, d) => setDays((x) => ({ ...x, [id]: d })),
      left, recent, targets, setTargets,
      setLeftDay: (id, d) => setLeft((x) => ({ ...x, [id]: d })),
      remember: (ids) => setRecent((x) => [...new Set([...ids, ...x])].slice(0, 20)),
      replaceInPlan: (oldId, item) => { setPlan((p) => { const q = { ...p }; delete q[oldId]; q[item.id] = item.batches; return q; }); setDays((d) => ({ ...d, [item.id]: d[oldId] })); },
      setPlanAll: (list) => { setPlan(Object.fromEntries(list.map((x) => [x.id, x.batches]))); setDays(Object.fromEntries(list.map((x) => [x.id, x.day]))); },
      toggleCheck: (id) => setChecks((x) => { const y = { ...x }; if (y[id]) delete y[id]; else y[id] = 1; return y; }),
      clearChecks: () => setChecks({}),
      togglePantry: (id) => setPantry((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id])),
      toggleFav: (id) => setFavs((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id])),
      setMulti: (on) => { setMultiRaw(on); if (!on) setStoreSel([...selected].slice(0, 1)); },
      storeName, sourceName, today, ref, nextStart, week: ref === today ? 'now' : 'next', setWeek,
      lang, setLang, t: mkT(lang), fmt: (n) => (n == null ? '—' : money.format(n)),
      setRegion: (id) => { setRegion(id); setStoreSel(null); },
      // One store: picking another switches to it. Several stores: picking toggles (never empty).
      pickStore: (id, only) => {
        if (!multi || only) return setStoreSel([id]);
        const n = new Set(selected);
        if (n.has(id) && n.size > 1) n.delete(id); else n.add(id);
        setStoreSel([...n]);
      },
      plan,
      setBatches: (id, n) => setPlan((p) => { const q = { ...p }; if (n > 0) q[id] = n; else delete q[id]; return q; }),
    };
  }, [data, lang, region, storeSel, plan, week, multi, theme, days, people, budget, checks, pantry, favs, left, recent, targets]);

  if (error) return <div className="state">⚠️ {error}</div>;
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
