import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from './store.jsx';
import { RecipeCard, Img, Store, Icon, IngredientPicker, DealBadge, offerName, mealScale } from './ui.jsx';
import { MEAL_TYPES, CUISINES, PROTEINS, DIETS } from '../shared/taxonomy.js';
import { ING_BY_ID } from '../shared/ingredients.js';
import { deaccent } from '../shared/text.js';
import { reliable as isReliable, bestFor } from '../shared/cost.js';
import { L } from './i18n.js';

const PAGE = 48;
const MEAL_ICON = { main: '🍲', soup: '🥣', salad: '🥗', sandwich: '🥪', pasta: '🍝', side: '🥔', breakfast: '🍳', appetizer: '🧆', preserve: '🫙', sauce: '🥫', bread: '🍞', dessert: '🍰', drink: '🥤' };

function setQuery(query, patch) {
  const q = new URLSearchParams(query);
  for (const [k, v] of Object.entries(patch)) { if (v == null || v === '' || v === false) q.delete(k); else q.set(k, v); }
  const s = q.toString();
  window.location.hash = '#/' + (s ? '?' + s : '');
}

export default function Browse({ query }) {
  const app = useApp();
  const { recipes, costs, t, lang, sourceName } = app;
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(false);
  const f = {
    q: query.get('q') || '', meal: query.get('meal'), cuisine: query.get('cuisine'), protein: query.get('protein'),
    diet: query.get('diet'), source: query.get('source'), time: +query.get('time') || 0, cost: +query.get('cost') || 0,
    macros: query.get('macros') === '1', prep: query.get('prep') === '1', mine: query.get('mine') === '1', minp: +query.get('minp') || 0, maxk: +query.get('maxk') || 0, sale: query.get('sale') === '1', ing: query.get('ing'), sort: query.get('sort') || 'deals',
  };
  const [text, setText] = useState(f.q);
  useEffect(() => { setText(f.q); }, [f.q]);
  useEffect(() => { const id = setTimeout(() => { if (text !== f.q) setQuery(query, { q: text }); }, 250); return () => clearTimeout(id); }, [text]);
  useEffect(() => { setShown(PAGE); }, [query.toString()]);
  const set = (patch) => setQuery(query, patch);

  // Everything except the dish-type filter, so the chips can show live counts.
  const base = useMemo(() => {
    const words = deaccent(f.q).split(/\s+/).filter(Boolean);
    return recipes.filter((r) => {
      const c = costs.get(r.id);
      if (f.cuisine && !r.tax.cuisines.includes(f.cuisine)) return false;
      if (f.protein && r.tax.protein !== f.protein) return false;
      if (f.diet && !r.tax.diets.includes(f.diet)) return false;
      if (f.source && r.source !== f.source) return false;
      if (f.time && !(r.time && r.time <= f.time)) return false;
      if (f.cost && !(isReliable(c) && c.per <= f.cost)) return false;
      if (f.macros && !r.macros) return false;
      if (f.prep && !r.tax.prep) return false;
      if (f.minp && !(r.macros?.protein != null && r.macros.protein * mealScale(r) >= f.minp)) return false;
      if (f.maxk && !(r.macros && r.macros.kcal * mealScale(r) <= f.maxk)) return false;
      if (f.mine && !r.ings.some((l) => app.have.has(l.ing))) return false;
      if (f.sale && !c.deals) return false;
      if (f.ing && !r.ings.some((l) => l.ing === f.ing || ING_BY_ID[l.ing]?.fb === f.ing)) return false;
      if (words.length) {
        const hay = r._hay || (r._hay = deaccent(r.name + ' ' + r.ings.map((l) => l.raw).join(' ') + ' ' + (r.keywords || []).join(' ')));
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [recipes, costs, query.toString(), app.have]);

  const mealCounts = useMemo(() => {
    const m = {};
    for (const r of base) for (const id of r.tax.meals) m[id] = (m[id] || 0) + 1;
    return m;
  }, [base]);

  const list = useMemo(() => {
    const rows = f.meal ? base.filter((r) => r.tax.meals.includes(f.meal)) : base.slice();
    const c = (r) => costs.get(r.id);
    // Cost ranking only trusts recipes that are almost fully priced and whose yield is real servings.
    const reliable = (r) => (isReliable(c(r)) ? c(r).per : Infinity);
    const sorters = {
      deals: (a, b) => dealScore(c(b)) - dealScore(c(a)) || c(b).savings - c(a).savings || reliable(a) - reliable(b),
      cost: (a, b) => reliable(a) - reliable(b),
      protein: (a, b) => ppd(b, c(b)) - ppd(a, c(a)),
      time: (a, b) => (a.time || 1e9) - (b.time || 1e9),
      rating: (a, b) => score(b) - score(a),
    };
    // "Cook with what I have": most pantry ingredients first.
    if (f.mine) { const n = (r) => new Set(r.ings.map((l) => l.ing).filter((g) => app.have.has(g))).size; return rows.sort((a, b) => n(b) - n(a) || sorters.cost(a, b)); }
    return rows.sort(sorters[f.sort] || sorters.deals);
  }, [base, f.meal, f.sort, costs]);

  if (!recipes.length) return <div className="state">{t('noData')}</div>;
  const sources = [...new Set(recipes.map((r) => r.source))];
  const nActive = ['cuisine', 'protein', 'diet', 'source', 'time', 'cost', 'macros', 'sale', 'ing', 'q', 'prep', 'mine', 'minp', 'maxk'].filter((k) => query.get(k)).length;
  const favDeals = app.favs.map((id) => bestFor(app.offers, id)).filter(Boolean);
  const active = ['prep', 'mine', 'minp', 'maxk', 'meal', 'cuisine', 'protein', 'diet', 'source', 'time', 'cost', 'macros', 'sale', 'ing', 'q'].some((k) => query.get(k));

  return (
    <div className="wrap browse">
      {!active && app.ideas.bundles.length > 0 && (
        <section className="hero-deals" aria-label={t('heroTitle')}>
          <div className="hero-head">
            <div><h1>{t('heroTitle')}</h1><p className="note">{t('heroSub')}</p></div>
            <a className="btn" href="#/idees">{t('ideas')} →</a>
          </div>
          <div className="hero-row">
            {app.ideas.bundles.slice(0, 5).map((b) => (
              <a key={b.anchor.id} className="hero-tile" href={`#/idees?a=${b.anchor.id}`}>
                <div className="hero-photo">
                  <Img src={b.anchor.offer.img} alt="" />
                  <Store id={b.anchor.offer.store} />
                  <span className="hero-price">{app.fmt(b.anchor.offer.perG * 1000)}/kg{b.anchor.off ? <em>−{Math.round(b.anchor.off * 100)} %</em> : null}</span>
                </div>
                <div className="hero-info">
                  <b>{ING_BY_ID[b.anchor.id][lang === 'en' ? 'en' : 'fr']}</b>
                  <small>{offerName(b.anchor.offer, lang)}</small>
                  <DealBadge offer={b.anchor.offer} />
                  <span className="go">{b.recipes.length} {t('differentMeals')} →</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
      {!active && favDeals.length > 0 && (
        <p className="favline">★ {t('favsOnSale')} : {favDeals.map((o) => <a key={o.ing} href={`#/?ing=${o.ing}&sale=1`}><b>{ING_BY_ID[o.ing][lang === 'en' ? 'en' : 'fr']}</b> {app.fmt(o.perG * 1000)}/kg <Store id={o.store} /> <DealBadge offer={o} /></a>)}</p>
      )}
      <div className="tiles" role="group" aria-label={t('mealType')}>
        <button type="button" className={`tile ${!f.meal ? 'on' : ''}`} aria-pressed={!f.meal} onClick={() => set({ meal: null })}><span className="em" aria-hidden="true">🍽️</span><span>{t('all')}</span><b>{base.length}</b></button>
        {MEAL_TYPES.filter((m) => mealCounts[m[0]] || f.meal === m[0]).map((m) => (
          <button type="button" key={m[0]} className={`tile ${f.meal === m[0] ? 'on' : ''}`} aria-pressed={f.meal === m[0]} onClick={() => set({ meal: f.meal === m[0] ? null : m[0] })}>
            <span className="em" aria-hidden="true">{MEAL_ICON[m[0]]}</span><span>{L(lang, m).split(/,| et | & /)[0]}</span><b>{mealCounts[m[0]] || 0}</b>
          </button>
        ))}
      </div>
      <div className="cols">
        <aside className={`filters ${open ? 'open' : ''}`}>
          <button type="button" className="filters-toggle" onClick={() => setOpen(true)} aria-expanded={open}><Icon name="sliders" /> {t('filters')}{nActive ? ` (${nActive})` : ''}</button>
          {open && <div className="sheet-backdrop" onClick={() => setOpen(false)} />}
          <div className="filters-body">
            <div className="sheet-head"><b>{t('filters')}</b><button type="button" className="btn primary" onClick={() => setOpen(false)}>{t('showResults')} ({list.length})</button></div>
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
            {f.ing && ING_BY_ID[f.ing] && <div className="ingpill">{t('ingredientFilter')} : <b>{ING_BY_ID[f.ing][lang === 'en' ? 'en' : 'fr']}</b> <button type="button" onClick={() => set({ ing: null })} aria-label={t('remove')}>×</button></div>}
            <label className="check"><input type="checkbox" checked={f.sale} onChange={(e) => set({ sale: e.target.checked ? '1' : null })} /> {t('onSale')}</label>
            <label className="check"><input type="checkbox" checked={f.prep} onChange={(e) => set({ prep: e.target.checked ? '1' : null })} /> {t('prepFilter')}</label>
            <label className="check"><input type="checkbox" checked={f.macros} onChange={(e) => set({ macros: e.target.checked ? '1' : null })} /> {t('withMacros')}</label>
            <Select label={t('cuisine')} value={f.cuisine} onChange={(v) => set({ cuisine: v })} any={t('any')} options={CUISINES.map((c) => [c[0], L(lang, c)])} />
            <Select label={t('protein')} value={f.protein} onChange={(v) => set({ protein: v })} any={t('any')} options={PROTEINS.map((c) => [c[0], L(lang, c)])} />
            <Select label={t('diet')} value={f.diet} onChange={(v) => set({ diet: v })} any={t('any')} options={DIETS.map((c) => [c[0], L(lang, c)])} />
            <Select label={t('minProtein')} value={f.minp || ''} onChange={(v) => set({ minp: v })} any={t('any')} options={[20, 30, 40, 50].map((n) => [n, `≥ ${n} g`])} />
            <Select label={t('maxKcal')} value={f.maxk || ''} onChange={(v) => set({ maxk: v })} any={t('any')} options={[400, 500, 600, 800].map((n) => [n, `≤ ${n} kcal`])} />
            <Select label={t('maxCost')} value={f.cost || ''} onChange={(v) => set({ cost: v })} any={t('any')} options={[2, 3, 4, 5, 7, 10].map((n) => [n, `≤ ${app.fmt(n)}`])} />
            <Select label={t('maxTime')} value={f.time || ''} onChange={(v) => set({ time: v })} any={t('any')} options={[15, 30, 45, 60, 120].map((n) => [n, `≤ ${n} ${t('min')}`])} />
            <Select label={t('source')} value={f.source} onChange={(v) => set({ source: v })} any={t('any')} options={sources.map((s) => [s, sourceName[s] || s])} />
            <div className="mine">
              <label className="check"><input type="checkbox" checked={f.mine} onChange={(e) => set({ mine: e.target.checked ? '1' : null })} /> {t('useMine')}</label>
              <IngredientPicker exclude={app.pantry} onPick={app.togglePantry} placeholder={t('addIngredient')} />
              <div className="pills">{app.pantry.map((id) => ING_BY_ID[id] && <button type="button" key={id} className="pill" onClick={() => app.togglePantry(id)}>{ING_BY_ID[id][lang === 'en' ? 'en' : 'fr']} ×</button>)}</div>
            </div>
            {active && <button type="button" className="link" onClick={() => { window.location.hash = '#/'; }}>{t('clear')}</button>}
          </div>
        </aside>
        <section>
          <div className="listhead">
            <span><b>{list.length}</b> {t('results')}</span>
            <label>{t('sort')} <select value={f.sort} onChange={(e) => set({ sort: e.target.value === 'deals' ? null : e.target.value })}>
              {[['deals', 'sortDeals'], ['cost', 'sortCost'], ['protein', 'sortProtein'], ['time', 'sortTime'], ['rating', 'sortRating']].map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
            </select></label>
          </div>
          <div className="grid">{list.slice(0, shown).map((r) => <RecipeCard key={r.id} r={r} />)}</div>
          {shown < list.length && <div className="morewrap"><button type="button" className="btn" onClick={() => setShown(shown + PAGE)}>{t('more')}</button></div>}
        </section>
      </div>
    </div>
  );
}

// Share of the recipe that is on sale this week (short recipes are not penalised below 6 lines).
// Best deals = biggest saving on the whole recipe versus regular prices; recipes too thinly
// priced to trust go last, and the share of ingredients in the flyer breaks ties.
// Sauces, snacks and other non-meal recipes rank a notch lower so dinners lead the list.
const dealScore = (c) => (c.coverage >= 0.6 ? Math.round(c.savingsPct * 100) + c.deals / Math.max(c.countable, 6) - (c.perKind === 'meal' ? 0 : 15) : -1);
const ppd = (r, c) => (r.macros?.protein != null && r.servings && c.total && c.coverage >= 0.75 ? (r.macros.protein * r.servings) / c.total : -1);
const score = (r) => (r.rating ? r.rating.value * Math.log10((r.rating.count || 1) + 9) : 0);

function Select({ label, value, onChange, options, any }) {
  return (
    <label className="sel"><span>{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{any}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
