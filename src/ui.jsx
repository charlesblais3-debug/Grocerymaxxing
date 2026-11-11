import React, { useState } from 'react';
import { useApp } from './store.jsx';
import { MEAL_TYPES } from '../shared/taxonomy.js';
import { L } from './i18n.js';

export function Img({ src, alt = '', className }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div className={`img ph ${className || ''}`} aria-hidden="true">🍽️</div>;
  return <img className={`img ${className || ''}`} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}

/** Flyer names are often ALL CAPS and bilingual ("fr | en"): show one readable line. */
export function nice(name, lang) {
  const parts = String(name).split(/\s*\|\s*/);
  let n = (lang === 'en' && parts[1]) || parts[0];
  if (n === n.toUpperCase()) n = n.toLowerCase();
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export function offerText(o, fmt) {
  const p = `${o.pre ? o.pre + ' ' : ''}${fmt(o.price)}${o.post ? ' ' + o.post : ''}`;
  return p.replace(/\s+/g, ' ');
}

export function Chip({ on, onClick, children, title }) {
  return <button type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={!!on} onClick={onClick} title={title}>{children}</button>;
}

/** Cost badge: per-serving cost, flagged as partial when few ingredients could be priced. */
export function CostTag({ cost, big, recipe }) {
  const { fmt, t } = useApp();
  if (!cost || cost.total == null) return <span className="cost none">{t('noPrice')}</span>;
  const partial = cost.coverage < 0.75;
  const v = cost.per ?? cost.total;
  const unit = { meal: t('perMeal'), serving: t('perServing'), unit: t('perUnit') }[cost.perKind] || t('wholeRecipe');
  return (
    <span className={`cost ${big ? 'big' : ''} ${partial ? 'partial' : ''}`} title={`${cost.priced}/${cost.countable} ${t('coverage')}`}>
      ≈ {fmt(v)}<small> {unit}{partial ? ` · ${t('partial')}` : ''}</small>
    </span>
  );
}

/** Published nutrition is per source serving; scale it when the recipe is quoted per meal. */
export const mealScale = (r) => (r.meals && r.servings && !r.unitYield ? r.servings / r.meals : 1);

export function RecipeCard({ r }) {
  const { costs, sourceName, t, lang } = useApp();
  const c = costs.get(r.id);
  const meal = r.tax.meals[0] && MEAL_TYPES.find((m) => m[0] === r.tax.meals[0]);
  return (
    <a className="card" href={`#/r/${r.id}`}>
      <div className="card-img">
        <Img src={r.image} alt="" />
        {c.deals > 0 && <span className="deal-flag">{c.deals} {t('deals')}</span>}
      </div>
      <div className="card-body">
        <div className="meta">{meal ? L(lang, meal) + ' · ' : ''}{sourceName[r.source] || r.source}{r.time ? ` · ${r.time} ${t('min')}` : ''}</div>
        <h3>{r.name}</h3>
        <div className="card-foot">
          <CostTag cost={c} recipe={r} />
          {r.macros && <span className="macro">{Math.round(r.macros.kcal * mealScale(r))} kcal{r.macros.protein != null ? ` · ${Math.round(r.macros.protein * mealScale(r))} g P` : ''}</span>}
        </div>
      </div>
    </a>
  );
}

export function StoreBar() {
  const { regions, regionId, setRegion, regionStores, selected, toggleStore, setAllStores, t, flyers, week, setWeek, nextStart, lang } = useApp();
  const [open, setOpen] = useState(false);
  if (!flyers.items.length) return null;
  const names = regionStores.filter((s) => selected.has(s.id)).map((s) => s.name);
  return (
    <div className="storebar">
      <div className="wrap">
        <label className="region">
          <span>{t('region')}</span>
          <select value={regionId || ''} onChange={(e) => setRegion(e.target.value)}>
            {Object.entries(regions).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
          </select>
        </label>
        {nextStart && (
          <div className="weeks" role="group" aria-label={t('week')}>
            <Chip on={week === 'now'} onClick={() => setWeek('now')}>{t('thisWeek')}</Chip>
            <Chip on={week === 'next'} onClick={() => setWeek('next')}>{t('nextWeek')} {new Date(nextStart + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' })}</Chip>
          </div>
        )}
        <button type="button" className="storesum" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="lbl">{t('myStores')} ({selected.size}/{regionStores.length})</span>
          <span className="names">{names.slice(0, 4).join(', ')}{names.length > 4 ? ` +${names.length - 4}` : ''}</span>
          <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
      </div>
      {open && (
        <div className="wrap stores" role="group" aria-label={t('myStores')}>
          {regionStores.map((s) => <Chip key={s.id} on={selected.has(s.id)} onClick={() => toggleStore(s.id)}>{s.name}</Chip>)}
          <button type="button" className="link" onClick={() => setAllStores(selected.size < regionStores.length)}>
            {selected.size < regionStores.length ? t('allStores') : t('noneStores')}
          </button>
        </div>
      )}
      {selected.size === 0 && <div className="wrap warn">{t('noStores')}</div>}
    </div>
  );
}
