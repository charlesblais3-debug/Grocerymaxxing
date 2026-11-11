import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { bestOffers, costRecipe } from '../shared/cost.js';
import { t as mkT } from './i18n.js';

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
  const [storeSel, setStoreSel] = usePersisted('stores', null); // null = all stores of the region
  const [plan, setPlan] = usePersisted('plan', {}); // recipeId -> batches
  const [week, setWeek] = useState('now'); // 'now' | 'next' (flyers are published a few days ahead)

  useEffect(() => {
    const get = (f) => fetch(`./data/${f}.json`).then((r) => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
    Promise.all([get('recipes'), get('flyers'), get('meta')])
      .then(([recipes, flyers, meta]) => setData({ recipes, flyers, meta }))
      .catch((e) => setError(String(e.message || e)));
  }, []);
  useEffect(() => { document.documentElement.lang = lang === 'en' ? 'en-CA' : 'fr-CA'; }, [lang]);

  const value = useMemo(() => {
    if (!data) return null;
    const { recipes, flyers, meta } = data;
    const regions = flyers.regions || {};
    const regionId = regions[region] ? region : Object.keys(regions)[0] || null;
    const reg = regionId ? regions[regionId] : { flyers: [], stores: [] };
    const flyerSet = new Set(reg.flyers);
    const today = new Date().toISOString().slice(0, 10);
    const live = flyers.items.filter((i) => flyerSet.has(i.flyer) && (!i.to || i.to >= today));
    // Next flyer week = the most common upcoming start date (Thursday for most banners).
    const starts = {};
    for (const i of live) if (i.from > today) starts[i.from] = (starts[i.from] || 0) + 1;
    const nextStart = Object.keys(starts).sort((a, b) => starts[b] - starts[a])[0] || null;
    const ref = week === 'next' && nextStart ? nextStart : today;
    const regionItems = live.filter((i) => (!i.from || i.from <= ref) && (!i.to || i.to >= ref));
    const regionStores = (flyers.stores || []).filter((s) => reg.stores.includes(s.id));
    const selected = new Set((storeSel ?? regionStores.map((s) => s.id)).filter((id) => reg.stores.includes(id)));
    const offers = bestOffers(regionItems, selected, ref);
    const baseline = meta.baseline?.prices || {};
    const costs = new Map(recipes.map((r) => [r.id, costRecipe(r, offers, baseline)]));
    const byId = new Map(recipes.map((r) => [r.id, r]));
    const storeName = Object.fromEntries((flyers.stores || []).map((s) => [s.id, s.name]));
    const sourceName = Object.fromEntries((meta.sources || []).map((s) => [s.id, s.name]));
    const money = new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD' });
    return {
      recipes, byId, flyers, meta, regions, regionId, regionStores, selected, regionItems, offers, baseline, costs,
      storeName, sourceName, today, ref, nextStart, week: ref === today ? 'now' : 'next', setWeek,
      lang, setLang, t: mkT(lang), fmt: (n) => (n == null ? '—' : money.format(n)),
      setRegion: (id) => { setRegion(id); setStoreSel(null); },
      toggleStore: (id) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setStoreSel([...n]); },
      setAllStores: (on) => setStoreSel(on ? null : []),
      plan,
      setBatches: (id, n) => setPlan((p) => { const q = { ...p }; if (n > 0) q[id] = n; else delete q[id]; return q; }),
    };
  }, [data, lang, region, storeSel, plan, week]);

  if (error) return <div className="state">⚠️ {error}</div>;
  if (!value) return <div className="state">Chargement…</div>;
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
