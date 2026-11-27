import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from './store.jsx';
import { RecipeCard, Img, Store, Icon, IngredientPicker, DealBadge, Sparkline, CostTag, mealScale, unitText, savingPct } from './ui.jsx';
import { batchesFor } from '../shared/planner.js';
import { MEAL_TYPES, CUISINES, PROTEINS, DIETS, isMealDish } from '../shared/taxonomy.js';
import { ING_BY_ID } from '../shared/ingredients.js';
import { deaccent } from '../shared/text.js';
import { reliable as isReliable, complete as isComplete, bestFor } from '../shared/cost.js';
import { L } from './i18n.js';

// Staples most kitchens already have (same list as the plan page).
const ESSENTIALS = ['olive_oil', 'veg_oil', 'salt', 'pepper', 'flour', 'sugar', 'garlic', 'onion', 'butter'];
const PAGE = 48;
const FILTER_KEYS = ['cuisine', 'protein', 'diet', 'source', 'time', 'cost', 'macros', 'sale', 'ing', 'q', 'prep', 'mine', 'minp', 'maxk', 'lang'];

// Filters live in the URL. Typing in the search box replaces the current history entry
// instead of adding one per pause, so "Back" leaves the page instead of undoing letters.
function setQuery(query, patch, replace = false) {
  const q = new URLSearchParams(query);
  for (const [k, v] of Object.entries(patch)) { if (v == null || v === '' || v === false) q.delete(k); else q.set(k, v); }
  const s = q.toString();
  const hash = '#/' + (s ? '?' + s : '');
  if (!replace) { window.location.hash = hash; return; }
  window.history.replaceState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export default function Browse({ query }) {
  const app = useApp();
  const { recipes, costs, t, lang, sourceName, fmt } = app;
  const lk = lang === 'en' ? 'en' : 'fr';
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(false);
  const f = {
    q: query.get('q') || '', meal: query.get('meal'), cuisine: query.get('cuisine'), protein: query.get('protein'),
    diet: query.get('diet'), source: query.get('source'), time: +query.get('time') || 0, cost: +query.get('cost') || 0,
    macros: query.get('macros') === '1', prep: query.get('prep') === '1', mine: query.get('mine') === '1', minp: +query.get('minp') || 0, maxk: +query.get('maxk') || 0, sale: query.get('sale') === '1', ing: query.get('ing'), lang: query.get('lang'),
    // "Cook with what I have" sorts by pantry match unless another order was picked.
    sort: query.get('sort') || (query.get('mine') === '1' ? 'pantry' : 'deals'),
  };
  const [text, setText] = useState(f.q);
  useEffect(() => { setText(f.q); }, [f.q]);
  // Re-armed when the URL changes too, so a filter clicked while typing is never overwritten
  // by a stale copy of the query.
  useEffect(() => { const id = setTimeout(() => { if (text !== f.q) setQuery(query, { q: text }, true); }, 250); return () => clearTimeout(id); }, [text, query.toString()]); // eslint-disable-line react-hooks/exhaustive-deps
  // The filter drawer is a modal dialog: Escape closes it and the page behind does not scroll.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);
  useEffect(() => { setShown(PAGE); }, [query.toString()]);
  const set = (patch) => setQuery(query, patch);

  // Everything except the dish-type filter, so the category rail can show live counts.
  const base = useMemo(() => {
    const words = deaccent(f.q).split(/\s+/).filter(Boolean);
    return recipes.filter((r) => {
      const c = costs.get(r.id);
      if (f.cuisine && !r.tax.cuisines.includes(f.cuisine)) return false;
      if (f.protein && r.tax.protein !== f.protein) return false;
      if (f.diet && !r.tax.diets.includes(f.diet)) return false;
      if (f.source && r.source !== f.source) return false;
      if (f.lang && r.lang !== f.lang) return false;
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
  }, [recipes, costs, query.toString(), app.have]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const pantryHits = (r) => new Set(r.ings.map((l) => l.ing).filter((g) => app.have.has(g))).size;
    const sorters = {
      deals: (a, b) => dealScore(c(b)) - dealScore(c(a)) || c(b).savings - c(a).savings || reliable(a) - reliable(b),
      cost: (a, b) => reliable(a) - reliable(b),
      protein: (a, b) => ppd(b, c(b)) - ppd(a, c(a)),
      time: (a, b) => (a.time || 1e9) - (b.time || 1e9),
      rating: (a, b) => score(b) - score(a),
      // Most pantry ingredients first ("cook with what I have").
      pantry: (a, b) => pantryHits(b) - pantryHits(a) || reliable(a) - reliable(b),
    };
    // Fully priced recipes always come first, whatever the sort: a partial price is never on top.
    const done = (r) => (isComplete(c(r)) ? 0 : 1);
    const pick = sorters[f.sort] || sorters.deals;
    return rows.sort((a, b) => done(a) - done(b) || pick(a, b));
  }, [base, f.meal, f.sort, costs, app.have]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!recipes.length) return <div className="state">{t('noData')}</div>;
  const sources = [...new Set(recipes.map((r) => r.source))];
  const nActive = FILTER_KEYS.filter((k) => k !== 'q' && query.get(k)).length;
  const active = ['meal', ...FILTER_KEYS].some((k) => query.get(k));
  const favDeals = app.favs.map((id) => bestFor(app.offers, id)).filter(Boolean);
  const nf = new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'fr-CA');
  const quick = [
    [t('quickCost2'), f.cost === 2, { cost: f.cost === 2 ? null : 2 }],
    [t('quickCost3'), f.cost === 3, { cost: f.cost === 3 ? null : 3 }],
    [t('quickTime30'), f.time === 30, { time: f.time === 30 ? null : 30 }],
    [t('quickFrench'), f.lang === 'fr', { lang: f.lang === 'fr' ? null : 'fr' }],
    [t('quickVeg'), f.diet === 'vegetarian', { diet: f.diet === 'vegetarian' ? null : 'vegetarian' }],
    [t('quickSale'), f.sale, { sale: f.sale ? null : '1' }],
  ];

  return (
    <div className="wrap browse">
      <h1 className="sr">{t('tagline')}</h1>
      {!active && <Bento list={list} />}
      {!active && favDeals.length > 0 && (
        <div className="favstrip"><span>★ {t('favsOnSale')}</span>
          {favDeals.map((o) => <a key={o.ing} href={`#/?ing=${o.ing}&sale=1`}><Store id={o.store} /> <b>{ING_BY_ID[o.ing][lk]}</b> {unitText(o.perG, fmt, o.ing, o.basis)}</a>)}
        </div>
      )}

      <div className="rail" role="group" aria-label={t('mealType')}>
        <button type="button" className={`railpill ${!f.meal ? 'on' : ''}`} aria-pressed={!f.meal} onClick={() => set({ meal: null })}><Icon name="all" size={15} />{t('all')}<b>{nf.format(base.length)}</b></button>
        {MEAL_TYPES.filter((m) => mealCounts[m[0]] || f.meal === m[0]).map((m) => (
          <button type="button" key={m[0]} className={`railpill ${f.meal === m[0] ? 'on' : ''}`} aria-pressed={f.meal === m[0]} onClick={() => set({ meal: f.meal === m[0] ? null : m[0] })}>
            <Icon name={m[0]} size={15} />{L(lang, m).split(/,| et | & /)[0]}<b>{nf.format(mealCounts[m[0]] || 0)}</b>
          </button>
        ))}
      </div>

      <div className="cmdbar">
        <div className="searchbox">
          <Icon name="search" size={17} />
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
          {text ? <button type="button" className="clear" onClick={() => setText('')} aria-label={t('clearSearch')}><Icon name="x" size={15} /></button> : null}
        </div>
        <div className="quick" role="group" aria-label={t('quickFilters')}>
          {quick.map(([label, on, patch]) => <button key={label} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => set(patch)}>{label}</button>)}
        </div>
        <button type="button" className="btn sm filterbtn" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog"><Icon name="sliders" size={15} /> {t('filters')}{nActive ? <span className="count">{nActive}</span> : null}</button>
        <div className="cmd-right">
          <span><b>{nf.format(list.length)}</b> {t('results')}</span>
          <label><span className="sr">{t('sort')} </span><select value={f.sort} aria-label={t('sort')} onChange={(e) => set({ sort: e.target.value === (f.mine ? 'pantry' : 'deals') ? null : e.target.value })}>
            {[['deals', 'sortDeals'], ['cost', 'sortCost'], ['protein', 'sortProtein'], ['time', 'sortTime'], ['rating', 'sortRating'], ...(f.mine ? [['pantry', 'sortPantry']] : [])].map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
          </select></label>
        </div>
      </div>
      {f.ing && ING_BY_ID[f.ing] && <div className="ingpill">{t('ingredientFilter')} : <b>{ING_BY_ID[f.ing][lk]}</b> <button type="button" onClick={() => set({ ing: null })} aria-label={t('remove')}><Icon name="x" size={14} /></button></div>}

      <div className="grid">{list.slice(0, shown).map((r) => <RecipeCard key={r.id} r={r} />)}</div>
      {!list.length && <div className="state">{t('noResults')} {active ? <button type="button" className="link" onClick={() => { window.location.hash = '#/'; }}>{t('clear')}</button> : null}</div>}
      {shown < list.length && <div className="morewrap"><button type="button" className="btn" onClick={() => setShown(shown + PAGE)}>{t('more')}</button></div>}

      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`drawer ${open ? 'open' : ''}`} role={open ? 'dialog' : undefined} aria-modal={open ? 'true' : undefined} aria-label={t('filters')} aria-hidden={!open}>
        <div className="drawer-head"><h2>{t('filters')}</h2><button type="button" className="btn primary" onClick={() => setOpen(false)}>{t('showResults')} ({nf.format(list.length)})</button></div>
        {open && (
          <div className="drawer-body">
            <section className="fgroup">
              <h3>{t('groupRecipe')}</h3>
              <div className="fgrid">
                <Select label={t('recipeLang')} value={f.lang} onChange={(v) => set({ lang: v })} any={t('bothLangs')} options={[['fr', 'Français'], ['en', 'English']]} />
                <Select label={t('cuisine')} value={f.cuisine} onChange={(v) => set({ cuisine: v })} any={t('any')} options={CUISINES.map((c) => [c[0], L(lang, c)])} />
                <Select label={t('protein')} value={f.protein} onChange={(v) => set({ protein: v })} any={t('any')} options={PROTEINS.map((c) => [c[0], L(lang, c)])} />
                <Select label={t('maxTime')} value={f.time || ''} onChange={(v) => set({ time: v })} any={t('any')} options={[15, 30, 45, 60, 120].map((n) => [n, `≤ ${n} ${t('min')}`])} />
                <Select label={t('maxCost')} value={f.cost || ''} onChange={(v) => set({ cost: v })} any={t('any')} options={[2, 3, 4, 5, 7, 10].map((n) => [n, `≤ ${fmt(n)}`])} />
              </div>
              <label className="check"><input type="checkbox" checked={f.sale} onChange={(e) => set({ sale: e.target.checked ? '1' : null })} /> {t('onSale')}</label>
              <label className="check"><input type="checkbox" checked={f.prep} onChange={(e) => set({ prep: e.target.checked ? '1' : null })} /> {t('prepFilter')}</label>
            </section>
            <section className="fgroup">
              <h3>{t('groupNutrition')}</h3>
              <div className="fgrid">
                <Select label={t('diet')} value={f.diet} onChange={(v) => set({ diet: v })} any={t('any')} options={DIETS.map((c) => [c[0], L(lang, c)])} />
                <Select label={t('minProtein')} value={f.minp || ''} onChange={(v) => set({ minp: v })} any={t('any')} options={[20, 30, 40, 50].map((n) => [n, `≥ ${n} g`])} />
                <Select label={t('maxKcal')} value={f.maxk || ''} onChange={(v) => set({ maxk: v })} any={t('any')} options={[400, 500, 600, 800].map((n) => [n, `≤ ${n} kcal`])} />
                <Select label={t('source')} value={f.source} onChange={(v) => set({ source: v })} any={t('any')} options={sources.map((s) => [s, sourceName[s] || s])} />
              </div>
              <label className="check"><input type="checkbox" checked={f.macros} onChange={(e) => set({ macros: e.target.checked ? '1' : null })} /> {t('withMacros')}</label>
            </section>
            <section className="fgroup">
              <h3>{t('pantryTitle')}{app.pantry.length ? ` (${app.pantry.length})` : ''}</h3>
              <label className="check"><input type="checkbox" checked={f.mine} onChange={(e) => set({ mine: e.target.checked ? '1' : null })} /> {t('useMine')}</label>
              <IngredientPicker exclude={app.pantry} onPick={app.togglePantry} placeholder={t('addIngredient')} />
              {ESSENTIALS.some((id) => !app.pantry.includes(id)) && <button type="button" className="btn sm soft" onClick={() => app.setPantryAll(ESSENTIALS)}><Icon name="plus" size={14} /> {t('essentialsShort')}</button>}
              <div className="pills">{app.pantry.map((id) => ING_BY_ID[id] && <button type="button" key={id} className="pill" onClick={() => app.togglePantry(id)}>{ING_BY_ID[id][lk]} ×</button>)}</div>
            </section>
            {active && <button type="button" className="btn" onClick={() => { window.location.hash = '#/'; }}>{t('resetFilters')}</button>}
          </div>
        )}
      </aside>
    </div>
  );
}

/** Home page hero: this week's standout meal, and the deals that feed several recipes. */
function Bento({ list }) {
  const { costs, ideas, t, lang, fmt, plan, storeName, setBatches, people } = useApp();
  const lk = lang === 'en' ? 'en' : 'fr';
  // The spotlight is a main dish that readers rate well (4.5★ or more, from at least 10 votes),
  // fully priced, with a photo, and as cheap thanks to this week's deals as possible (the list is
  // already ranked by deals). Each condition is relaxed in turn only if nothing qualifies.
  const wellRated = (r) => r.rating?.value >= 4.5 && (r.rating.count || 0) >= 10;
  const main = (r) => r.tax.meals.includes('main');
  const ok = (r) => r.image && isComplete(costs.get(r.id));
  const spot = list.find((r) => ok(r) && main(r) && wellRated(r) && costs.get(r.id).deals >= 2)
    || list.find((r) => ok(r) && main(r) && wellRated(r) && costs.get(r.id).deals >= 1)
    || list.find((r) => ok(r) && main(r) && wellRated(r))
    || list.find((r) => ok(r) && isMealDish(r.tax) && costs.get(r.id).deals >= 2)
    || list[0];
  if (!spot) return null;
  const c = costs.get(spot.id);
  const sale = c.lines.filter((l) => l.src === 'flyer');
  // The store that puts this meal on sale (most of its flyer lines).
  const tally = {};
  for (const l of sale) tally[l.offer.store] = (tally[l.offer.store] || 0) + 1;
  const store = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  const names = [...new Set(sale.map((l) => ING_BY_ID[l.via || l.ing]?.[lk]).filter(Boolean))].slice(0, 4);
  const pct = savingPct(c);
  const bundles = ideas.bundles.slice(0, 4);
  return (
    <section className="bento" aria-label={t('heroTitle')}>
      <article className="spot">
        <a className="card-hit" href={`#/r/${spot.id}`} aria-label={spot.name} />
        <Img src={spot.image} alt="" eager />
        <div className="spot-scrim" />
        <div className="spot-kick">
          <span className="kick"><Icon name="star" size={13} /> {t('spotlight')}{store ? ` · ${storeName[store]}` : ''}</span>
          {pct ? <span className="kick dark">−{pct} % {t('vsRegular')}</span> : null}
        </div>
        <div className="spot-body">
          <h2>{spot.name}</h2>
          <div className="spot-ings">
            {spot.rating ? <span><Icon name="star" size={13} /> {spot.rating.value.toFixed(1).replace('.', lang === 'en' ? '.' : ',')}{spot.rating.count ? ` (${spot.rating.count})` : ''}{names.length ? ' · ' : ''}</span> : null}
            {names.length ? `${t('onSaleThisWeek')} : ${names.join(' · ')}` : null}
          </div>
          <div className="spot-row">
            <span className="spot-price"><CostTag cost={c} /></span>
            <button type="button" className={`btn primary ${plan[spot.id] ? 'in' : ''}`} aria-pressed={!!plan[spot.id]} onClick={() => setBatches(spot.id, plan[spot.id] ? 0 : batchesFor(spot, people))}>{plan[spot.id] ? `✓ ${t('inMyPlan')}` : `+ ${t('quickPlanAdd')}`}</button>
            <a className="btn ghost" href={`#/r/${spot.id}`}>{t('seeRecipe')} <Icon name="arrow" size={15} /></a>
          </div>
        </div>
      </article>
      {bundles.length > 0 && (
        <aside className="reuse">
          <div className="reuse-head"><h2>{t('reusableDealsA')} <em>{t('reusableDealsB')}</em></h2><a className="link" href="#/idees">{t('ideasShort')} →</a></div>
          {bundles.map((b) => (
            <a key={b.anchor.id} className="reuse-row" href={`#/idees?a=${b.anchor.id}`}>
              <span>
                <b>{ING_BY_ID[b.anchor.id][lk]}</b>
                <span className="u"><Store id={b.anchor.offer.store} /> {unitText(b.anchor.offer.perG, fmt, b.anchor.offer.ing, b.anchor.offer.basis)} <Sparkline pk={b.anchor.offer.pk} now={b.anchor.offer.perG} /> <DealBadge offer={b.anchor.offer} /></span>
              </span>
              <span className="r">
                {b.anchor.off ? <span className="offpill">−{Math.round(b.anchor.off * 100)} %</span> : null}
                <span className="go">{b.recipes.length} {t('recipesShort')} →</span>
              </span>
            </a>
          ))}
          <a className="btn soft" href="#/idees">{t('exploreCombos')} <Icon name="arrow" size={15} /></a>
        </aside>
      )}
    </section>
  );
}

// Share of the recipe that is on sale this week (short recipes are not penalised below 6 lines).
// Best deals = biggest saving on the whole recipe versus regular prices; recipes too thinly
// priced to trust go last, and the share of ingredients in the flyer breaks ties.
// Sauces, snacks and other non-meal recipes rank a notch lower so dinners lead the list.
const dealScore = (c) => (c.coverage >= 0.6 ? Math.round(c.savingsPct * 100) + c.deals / Math.max(c.countable, 6) - (c.perKind === 'meal' ? 0 : 15) : -1);
const ppd = (r, c) => (r.macros?.protein != null && (r.servings || r.meals) && c.total && c.coverage >= 0.75 ? (r.macros.protein * (r.servings || r.meals)) / c.total : -1);
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
