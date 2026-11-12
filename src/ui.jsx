import React, { useState } from 'react';
import { useApp } from './store.jsx';
import { MEAL_TYPES } from '../shared/taxonomy.js';
import { L } from './i18n.js';

export function Img({ src, alt = '', className }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div className={`img ph ${className || ''}`} aria-hidden="true"><Icon name="plate" size={36} /></div>;
  return <img className={`img ${className || ''}`} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}

/** Small stroke icons (inline SVG so they follow the text colour and need no network). */
const PATHS = {
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-14v2m0 16v2M2 12h2m16 0h2M5 5l1.500 1.500m11 11L19 19M19 5l-1.500 1.500m-11 11L5 19',
  moon: 'M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500Z',
  plate: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  flame: 'M12 22c4 0 7-2.7 7-6.6 0-3-1.8-5-3.3-6.8-.5 1.6-1.3 2.5-2.4 3C13.6 8 12.5 4.600 9.500 2c.2 3-1.300 4.800-2.600 6.600C5.700 10.300 5 12 5 15.400 5 19.300 8 22 12 22Z',
  protein: 'M6.500 6.500 17.500 17.500M4 9l5-5m6 16 5-5M3 6l3-3m12 18 3-3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm4 2h7M8 11h7',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.500 2.500m7 7L18 18M18 6l-2.500 2.500m-7 7L6 18',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5-4.500a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  sliders: 'M4 7h9m4 0h3M4 17h3m4 0h9M15 4v6M9 14v6',
  users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m6.500-9a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7Zm11.500 9v-1a4 4 0 0 0-3-3.870M15 3.130a3.500 3.500 0 0 1 0 6.740',
};
export function Icon({ name, size = 16 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Logo() {
  return (
    <svg className="logo" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path d="M8 13.500V8h7.500L24 16.500 16.500 24 8 13.500Z" fill="var(--deal)" />
      <circle cx="12" cy="12" r="1.600" fill="var(--brand)" />
      <path d="M14.500 17.500l2 2 4-4.500" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

// Banner colours (not logos): enough to recognise a store at a glance in a list.
const STORE_COLORS = {
  maxi: ['#ffd400', '#1a2a6c'], superc: ['#ffe600', '#d0021b'], iga: ['#e2231a', '#fff'], metro: ['#fff', '#d3122a'],
  provigo: ['#d3122a', '#ffe14d'], walmart: ['#0071dc', '#fff'], adonis: ['#1f7a3d', '#fff'],
};
export function Store({ id }) {
  const { storeName } = useApp();
  const [bg, fg] = STORE_COLORS[id] || ['var(--soft)', 'var(--ink)'];
  return <span className="store" style={{ background: bg, color: fg, borderColor: bg === '#fff' ? fg : 'transparent' }}>{storeName[id] || id}</span>;
}

export function Chip({ on, onClick, children, title }) {
  return <button type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={!!on} onClick={onClick} title={title}>{children}</button>;
}

/** Cost: per meal / serving / unit, flagged as partial when too few ingredients could be priced. */
export function CostTag({ cost, big }) {
  const { fmt, t } = useApp();
  if (!cost || cost.total == null) return <span className="cost none">{t('noPrice')}</span>;
  const partial = cost.coverage < 0.75 || cost.missing?.length > 0;
  const v = cost.per ?? cost.total;
  const unit = { meal: t('perMeal'), serving: t('perServing'), unit: t('perUnit') }[cost.perKind] || t('wholeRecipe');
  return (
    <span className={`cost ${big ? 'big' : ''} ${partial ? 'partial' : ''}`} title={`${cost.priced}/${cost.countable} ${t('coverage')}`}>
      <span className="approx">≈</span> {fmt(v)}<small> {unit}{partial ? ` · ${t('partial')}` : ''}</small>
    </span>
  );
}

/** Regular price vs this week's price for the whole recipe. */
export function SavingBar({ cost, label }) {
  const { fmt, t } = useApp();
  if (!cost?.total || cost.savings < 0.25) return null;
  const regular = cost.total + cost.savings;
  const pct = Math.round((cost.savings / regular) * 100);
  if (pct < 3) return null;
  return (
    <div className="saving" title={`${t('regularShort')} ${fmt(regular)} → ${fmt(cost.total)}`}>
      <div className="saving-bar"><span style={{ width: `${100 - pct}%` }} /></div>
      <span className="saving-lbl">−{pct} %{label ? ` · ${t('youSave')} ${fmt(cost.savings)}` : ''}</span>
    </div>
  );
}

/** Published nutrition is per source serving; scale it when the recipe is quoted per meal. */
export const mealScale = (r) => (r.meals && r.servings && !r.unitYield ? r.servings / r.meals : 1);

export function RecipeCard({ r }) {
  const { costs, sourceName, t, lang } = useApp();
  const c = costs.get(r.id);
  const meal = r.tax.meals[0] && MEAL_TYPES.find((m) => m[0] === r.tax.meals[0]);
  const k = mealScale(r);
  return (
    <a className="card" href={`#/r/${r.id}`}>
      <div className="card-img">
        <Img src={r.image} alt="" />
        {c.deals > 0 && <span className="deal-flag"><Icon name="tag" size={12} /> {c.deals} {t('deals')}</span>}
        <span className="price-tag"><CostTag cost={c} /></span>
      </div>
      <div className="card-body">
        <div className="meta">{meal ? L(lang, meal) + ' · ' : ''}{sourceName[r.source] || r.source}</div>
        <h3>{r.name}</h3>
        <SavingBar cost={c} />
        <div className="card-foot">
          {r.time ? <span><Icon name="clock" size={14} /> {r.time} {t('min')}</span> : null}
          {r.macros ? <span><Icon name="flame" size={14} /> {Math.round(r.macros.kcal * k)}</span> : null}
          {r.macros?.protein != null ? <span><Icon name="protein" size={14} /> {Math.round(r.macros.protein * k)} g</span> : null}
        </div>
      </div>
    </a>
  );
}

/** Donut of where the calories come from (4 kcal/g protein and carbs, 9 kcal/g fat). */
export function MacroRing({ m, k = 1 }) {
  const { t } = useApp();
  const parts = [['prot', (m.protein || 0) * 4, 'var(--m-prot)'], ['carbs', (m.carbs || 0) * 4, 'var(--m-carb)'], ['fat', (m.fat || 0) * 9, 'var(--m-fat)']];
  const sum = parts.reduce((n, p) => n + p[1], 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="ring">
      <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label={`${Math.round(m.kcal * k)} kcal`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line)" strokeWidth="14" />
        {sum > 0 && parts.map(([key, v, color]) => {
          const len = (v / sum) * C;
          const el = <circle key={key} cx="70" cy="70" r={R} fill="none" stroke={color} strokeWidth="14" strokeDasharray={`${Math.max(len - 2, 0)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />;
          acc += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" className="ring-kcal">{Math.round(m.kcal * k)}</text>
        <text x="70" y="86" textAnchor="middle" className="ring-unit">kcal</text>
      </svg>
      <dl className="ring-legend">
        {[['prot', m.protein, 'g', 'var(--m-prot)'], ['carbs', m.carbs, 'g', 'var(--m-carb)'], ['fat', m.fat, 'g', 'var(--m-fat)'], ['fiber', m.fiber, 'g'], ['sodium', m.sodium, 'mg']].map(([key, v, u, color]) => v != null && (
          <div key={key}><dt>{color ? <i style={{ background: color }} /> : <i className="blank" />}{t(key)}</dt><dd>{Math.round(v * k * 10) / 10} {u}</dd></div>
        ))}
      </dl>
    </div>
  );
}

export function StoreBar() {
  const { regions, regionId, setRegion, regionStores, selected, pickStore, multi, setMulti, t, flyers, week, setWeek, nextStart, lang } = useApp();
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
        {nextStart && (
          <div className="weeks" role="group" aria-label={t('week')}>
            <Chip on={week === 'now'} onClick={() => setWeek('now')}>{t('thisWeek')}</Chip>
            <Chip on={week === 'next'} onClick={() => setWeek('next')}>{t('nextWeek')} {new Date(nextStart + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' })}</Chip>
          </div>
        )}
      </div>
      <div className="wrap storepick">
        <span className="lbl" id="storepick-lbl">{multi ? t('myStores') : t('myStore')}</span>
        <div className="stores" role={multi ? 'group' : 'radiogroup'} aria-labelledby="storepick-lbl">
          {regionStores.map((s) => {
            const on = selected.has(s.id);
            const [bg, fg] = STORE_COLORS[s.id] || ['var(--brand)', 'var(--brand-ink)'];
            return (
              <button key={s.id} type="button" role={multi ? undefined : 'radio'} aria-checked={multi ? undefined : on} aria-pressed={multi ? on : undefined}
                className={`storechip ${on ? 'on' : ''}`} style={on ? { background: bg, color: fg, borderColor: bg === '#fff' ? fg : bg } : undefined} onClick={() => pickStore(s.id)}>
                {s.name}
              </button>
            );
          })}
        </div>
        <label className="check multi"><input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} /> {t('multiStores')}</label>
        <a className="link" href="#/circulaires">{t('whichStore')}</a>
      </div>
    </div>
  );
}
