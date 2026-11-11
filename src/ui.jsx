import React, { useState } from 'react';
import { useApp } from './store.jsx';
import { MEAL_TYPES } from '../shared/taxonomy.js';
import { L } from './i18n.js';

export function Img({ src, alt = '', className }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div className={`img ph ${className || ''}`} aria-hidden="true">🍽️</div>;
  return <img className={`img ${className || ''}`} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}

export function offerText(o, fmt) {
  const p = `${o.pre ? o.pre + ' ' : ''}${fmt(o.price)}${o.post ? ' ' + o.post : ''}`;
  return p.replace(/\s+/g, ' ');
}

export function Chip({ on, onClick, children, title }) {
  return <button type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={!!on} onClick={onClick} title={title}>{children}</button>;
}

/** Cost badge: per-serving cost, flagged as partial when few ingredients could be priced. */
export function CostTag({ cost, big }) {
  const { fmt, t } = useApp();
  if (!cost || cost.total == null) return <span className="cost none">{t('noPrice')}</span>;
  const partial = cost.coverage < 0.6;
  const v = cost.perServing ?? cost.total;
  return (
    <span className={`cost ${big ? 'big' : ''} ${partial ? 'partial' : ''}`} title={`${cost.priced}/${cost.countable} ${t('coverage')}`}>
      ≈ {fmt(v)}<small> {cost.perServing != null ? t('perServing') : ''}{partial ? ` · ${t('partial')}` : ''}</small>
    </span>
  );
}

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
          <CostTag cost={c} />
          {r.macros && <span className="macro">{Math.round(r.macros.kcal)} kcal{r.macros.protein != null ? ` · ${Math.round(r.macros.protein)} g P` : ''}</span>}
        </div>
      </div>
    </a>
  );
}

export function StoreBar() {
  const { regions, regionId, setRegion, regionStores, selected, toggleStore, setAllStores, t, flyers } = useApp();
  if (!flyers.items.length) return null;
  return (
    <div className="storebar">
      <div className="wrap">
        <label className="region">
          <span>{t('region')}</span>
          <select value={regionId || ''} onChange={(e) => setRegion(e.target.value)}>
            {Object.entries(regions).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
          </select>
        </label>
        <div className="stores" role="group" aria-label={t('myStores')}>
          <span className="lbl">{t('myStores')}</span>
          {regionStores.map((s) => <Chip key={s.id} on={selected.has(s.id)} onClick={() => toggleStore(s.id)}>{s.name}</Chip>)}
          <button type="button" className="link" onClick={() => setAllStores(selected.size < regionStores.length)}>
            {selected.size < regionStores.length ? t('allStores') : '∅'}
          </button>
        </div>
      </div>
      {selected.size === 0 && <div className="wrap warn">{t('noStores')}</div>}
    </div>
  );
}
