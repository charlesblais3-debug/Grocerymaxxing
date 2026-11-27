import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from './store.jsx';
import { INGREDIENTS, ING_BY_ID } from '../shared/ingredients.js';
import { deaccent } from '../shared/text.js';
import { dealScore } from '../shared/score.js';
import { complete } from '../shared/cost.js';
import { isMemberPrice } from '../shared/deals.js';
import { batchesFor } from '../shared/planner.js';

export function Img({ src, alt = '', className }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div className={`img ph ${className || ''}`} aria-hidden="true"><Icon name="plate" size={36} /></div>;
  return <img className={`img ${className || ''}`} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}

/** Stroke icons drawn for this site (inline SVG: they follow the text colour and need no network). */
const PATHS = {
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-14v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  plate: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  flame: 'M12 22c4 0 7-2.7 7-6.6 0-3-1.8-5-3.3-6.8-.5 1.6-1.3 2.5-2.4 3C13.6 8 12.5 4.6 9.5 2c.2 3-1.3 4.8-2.6 6.6C5.7 10.3 5 12 5 15.4 5 19.3 8 22 12 22Z',
  protein: 'M6.5 6.5 17.5 17.5M4 9l5-5m6 16 5-5M3 6l3-3m12 18 3-3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm4 2h7M8 11h7',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M18 6l-2.5 2.5m-7 7L6 18',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5-4.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  sliders: 'M4 7h9m4 0h3M4 17h3m4 0h9M15 4v6M9 14v6',
  users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m6.5-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm11.5 9v-1a4 4 0 0 0-3-3.87M15 3.13a3.5 3.5 0 0 1 0 6.74',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5 10 17.5 19 7',
  chevron: 'M6 9l6 6 6-6',
  x: 'M6 6l12 12M18 6 6 18',
  swap: 'M4 7h13l-3-3M20 17H7l3 3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5-5-5 5 5 5',
  pin: 'M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  cart: 'M3 4h2l2.4 11h10.2L20 7H6.2M9 20h.01M17 20h.01',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5',
  printer: 'M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7Z',
  calendar: 'M4 6h16v15H4ZM4 10h16M8 3v4M16 3v4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L12 6.3M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  // Dish types
  all: 'M5 3v6a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1.5-3 4-3 7 0 2 1 3 3 3',
  main: 'M4 11h16v2a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-2ZM2 11h20M9 7.5c0-1.2 1-1.6 1-2.8M14 7.5c0-1.2 1-1.6 1-2.8',
  soup: 'M3 12h18a9 9 0 0 1-18 0ZM8 3.5c0 1.5 1.5 1.5 1.5 3M13 3.5c0 1.5 1.5 1.5 1.5 3M8 21h8',
  salad: 'M3 12h18a9 9 0 0 1-18 0ZM12 12c0-4 2-7 6-8-.5 4-2.5 6.5-6 8Zm0 0C11 8.5 8.5 6.5 5 6.5c.5 3 3 5 7 5.5',
  sandwich: 'M3 10l9-6 9 6H3Zm0 3.5h18M4 17h16c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3Z',
  pasta: 'M4 13h16a8 8 0 0 1-16 0ZM8 13c0-3 2-5 4-5s3 1.5 3 3-1 2-2 2M11 4l5 8M14 3l4 8',
  side: 'M7 15c-2-2-2-6 1-8s7-2 9 1 2 7-1 9-7 0-9-2ZM10 10h.01M14 13h.01M12 16h.01',
  breakfast: 'M3 13a7 7 0 1 0 14 0 7 7 0 1 0-14 0Zm13 4 5 4M10 15.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  appetizer: 'M3 21 21 3M8.5 11.5a2.5 2.5 0 1 0 4 4M12.5 7.5a2.5 2.5 0 1 0 4 4',
  preserve: 'M8 3h8v3H8ZM7 6h10l1 3v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9l1-3Zm-1 6h12',
  sauce: 'M10 2h4v4l2 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-3V2Zm-2 11h8',
  bread: 'M5 20v-9a4 4 0 0 1-1-7h16a4 4 0 0 1-1 7v9H5Zm4-9v5m6-5v5',
  dessert: 'M3 20h18M4 20v-8l16-7v15M4 12h16M8 5.5 7 3',
  drink: 'M6 8h12l-1.5 13h-9L6 8Zm6 0 3-6h3M5 8h14',
};
export function Icon({ name, size = 16 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] || PATHS.plate} />
    </svg>
  );
}

export function Logo() {
  return (
    <svg className="logo" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="var(--brand)" />
      <path d="M8 13.5V8h7.5L24 16.5 16.5 24 8 13.5Z" fill="var(--accent)" />
      <circle cx="12" cy="12" r="1.6" fill="var(--brand)" />
      <path d="M14.5 17.5l2 2 4-4.5" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

/**
 * Name of an offer as it applies to the ingredient it was matched for. A flyer line such as
 * "mangue rouge, fruit de la passion" is one price for either fruit: for a mango we show
 * "Mangue rouge", not the whole label.
 */
export function offerName(o, lang) {
  const seg = o.seg?.[o.pk];
  return nice(seg || o.name, seg ? 'fr' : lang);
}

/**
 * Unit price as Québec shoppers read it: per kilogram everywhere, and per pound too for meat,
 * fish and produce, which flyers price by the pound. A price per piece is marked as approximate.
 */
export function unitText(perG, fmt, ing, basis) {
  if (perG == null) return '';
  const cat = ING_BY_ID[ing]?.cat;
  const lb = ['meat', 'fish', 'produce'].includes(cat) && basis !== 'each' ? ` · ${fmt(perG * 453.592)}/lb` : '';
  return `${basis === 'each' ? '≈ ' : ''}${fmt(perG * 1000)}/kg${lb}`;
}

/**
 * The lowest flyer price per week for this product over the weeks on record, as a tiny line:
 * makes "lowest in N weeks" visible at a glance. The last point is this week.
 */
export function Sparkline({ pk, now }) {
  const { hist, t, fmt } = useApp();
  const weeks = hist?.[pk];
  if (!weeks) return null;
  const pts = Object.keys(weeks).sort().map((w) => Math.min(...Object.values(weeks[w])));
  if (now != null) pts.push(now);
  if (pts.length < 3) return null;
  const lo = Math.min(...pts); const hi = Math.max(...pts);
  const W = 64; const H = 18; const span = hi - lo || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * (W - 4) + 2, H - 2 - ((v - lo) / span) * (H - 4)]);
  const last = xy[xy.length - 1];
  const label = `${t('priceTrend')} : ${fmt(lo * 1000)}–${fmt(hi * 1000)}/kg`;
  return (
    <svg className="spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <title>{label}</title>
      <polyline points={xy.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill="var(--save)" />
    </svg>
  );
}

/** A loyalty-card or app-only price ("prix membre", "Scène+"). */
export function MemberBadge({ item }) {
  const { t } = useApp();
  return item && isMemberPrice(item) ? <span className="memberbadge" title={t('memberPriceTitle')}>{t('memberPrice')}</span> : null;
}

export function offerText(o, fmt) {
  const p = `${o.pre ? o.pre + ' ' : ''}${fmt(o.price)}${o.post ? ' ' + o.post : ''}`;
  return p.replace(/\s+/g, ' ');
}

// Each banner keeps a small dot of its colour on a calm neutral pill: recognisable at a glance
// without seven loud stickers fighting the food photos.
export const STORE_DOT = {
  superc: '#d0021b', maxi: '#d4a500', iga: '#e2231a', metro: '#c8102e',
  provigo: '#9e1b32', walmart: '#0071dc', adonis: '#1f7a3d',
};
export function Store({ id }) {
  const { storeName } = useApp();
  return <span className="store"><i style={{ background: STORE_DOT[id] || 'var(--brand)' }} />{storeName[id] || id}</span>;
}

export function Chip({ on, onClick, children, title }) {
  return <button type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={!!on} onClick={onClick} title={title}>{children}</button>;
}

/** Cost: per meal / serving / unit, flagged as partial when too few ingredients could be priced. */
export function CostTag({ cost, big }) {
  const { fmt, t } = useApp();
  if (!cost || cost.total == null) return <span className="cost none">{t('noPrice')}</span>;
  const partial = !complete(cost);
  const v = cost.per ?? cost.total;
  const unit = { meal: t('perMeal'), serving: t('perServing'), unit: t('perUnit') }[cost.perKind] || t('wholeRecipe');
  return (
    <span className={`cost ${big ? 'big' : ''} ${partial ? 'partial' : ''}`} title={`${cost.priced}/${cost.countable} ${t('coverage')}`}>
      <span className="approx">≈</span> {fmt(v)}<small> {unit}{partial ? ` · ${t('partial')}` : ''}</small>
    </span>
  );
}

/** Share of the whole recipe saved this week against regular prices (0 when not worth saying). */
export function savingPct(c) {
  if (!c?.total || !(c.savings >= 0.25)) return 0;
  const pct = Math.round((c.savings / (c.total + c.savings)) * 100);
  return pct >= 3 ? pct : 0;
}

/** Published nutrition is per source serving; scale it when the recipe is quoted per meal. */
export const mealScale = (r) => (r.meals && r.servings && !r.unitYield ? r.servings / r.meals : 1);

/** One tap adds a recipe to the week (batches sized for the household) or takes it out. */
export function QuickAdd({ r, className = 'quickadd' }) {
  const { plan, setBatches, people, t } = useApp();
  const on = !!plan[r.id];
  return (
    <button type="button" className={`${className} ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`${on ? t('quickPlanRemove') : t('quickPlanAdd')} — ${r.name}`} title={on ? t('quickPlanRemove') : t('quickPlanAdd')}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBatches(r.id, on ? 0 : batchesFor(r, people)); }}>
      <Icon name={on ? 'check' : 'plus'} size={17} />
    </button>
  );
}

export function RecipeCard({ r, className = '' }) {
  const { costs, sourceName, t, fmt } = useApp();
  const c = costs.get(r.id);
  const k = mealScale(r);
  const pct = savingPct(c);
  return (
    <article className={`card rcard ${className}`}>
      <a className="card-hit" href={`#/r/${r.id}`} aria-label={r.name} />
      <div className="card-img">
        <Img src={r.image} alt="" />
        {c.deals > 0 && <span className="dealpill"><Icon name="tag" size={12} /> {pct ? `−${pct} % · ` : ''}{c.deals} {t('deals')}</span>}
        <QuickAdd r={r} />
        <span className="pricepill"><CostTag cost={c} /></span>
      </div>
      <div className="card-body">
        <div className="kicker">{sourceName[r.source] || r.source}{r.tax.prep ? <span className="prep-pill">Meal prep</span> : null}</div>
        <h3>{r.name}</h3>
        <div className="rcard-foot">
          <span className="facts-mini">
            {r.time ? <span><Icon name="clock" size={13} /> {r.time} {t('min')}</span> : null}
            {r.macros ? <span title={r.macros.calc ? t('calcShort') : undefined}><Icon name="flame" size={13} /> {r.macros.calc ? '~' : ''}{Math.round(r.macros.kcal * k)}</span> : null}
            {r.macros?.protein != null ? <span><Icon name="protein" size={13} /> {Math.round(r.macros.protein * k)} g</span> : null}
          </span>
          {c.savings >= 0.25 && c.total ? <span className="savepill" title={t('youSave')}>−{fmt(c.savings)}</span> : null}
        </div>
      </div>
    </article>
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
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface)" strokeWidth="14" />
        {sum > 0 && parts.map(([key, v, color]) => {
          const len = (v / sum) * C;
          // Rounded caps overlap the next arc by about a stroke width: leave that much gap.
          const el = len > 16 ? <circle key={key} cx="70" cy="70" r={R} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${Math.max(len - 16, 0.1)} ${C}`} strokeDashoffset={-(acc + 8)} transform="rotate(-90 70 70)" /> : null;
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

/**
 * The store switcher in the header: one pill ("● Super C · Montréal ▾") that opens a card
 * (a bottom sheet on phones) with the region, the flyer week, the stores and the price options.
 */
export function StoreMenu() {
  const { regions, regionId, setRegion, regionStores, selected, pickStore, multi, setMulti, noMember, setNoMember, guide, week, setWeek, nextStart, storeName, lang, t } = useApp();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const box = useRef(null);
  const panel = useRef(null);
  // The panel is rendered on <body> (the frosted header would otherwise trap a fixed-position
  // sheet inside its own 64 px): on wide screens it is placed under the pill by coordinates.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => { const r = box.current?.getBoundingClientRect(); if (r) setPos({ top: r.bottom + 10, right: Math.max(12, window.innerWidth - r.right) }); };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); box.current?.querySelector('button')?.focus(); } };
    const onDown = (e) => { if (!box.current?.contains(e.target) && !panel.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    const phone = window.matchMedia('(max-width: 860px)').matches;
    const prev = document.body.style.overflow;
    if (phone) document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); document.body.style.overflow = prev; };
  }, [open]);
  const ids = [...selected];
  const date = nextStart ? new Date(nextStart + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' }) : '';
  const label = ids.length > 1 ? `${ids.length} ${t('storesWord')}` : storeName[ids[0]] || '—';
  return (
    <div className="storemenu" ref={box}>
      <button type="button" className="storepill" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)} title={t('storeMenuTitle')}>
        <span className="dots">{ids.slice(0, 3).map((id) => <i key={id} style={{ background: STORE_DOT[id] || 'var(--brand)' }} />)}</span>
        <span>{label}</span>
        {regions[regionId] ? <span className="where">· {regions[regionId].label}</span> : null}
        {week === 'next' ? <span className="nextdot" title={`${t('nextWeek')} ${date}`} /> : null}
        <Icon name="chevron" size={15} />
      </button>
      {open && createPortal(<div className="pop-backdrop" onClick={() => setOpen(false)} />, document.body)}
      {open && createPortal(
        <div className="popover" role="dialog" aria-modal="true" aria-label={t('storeMenuTitle')} tabIndex={-1} ref={panel} style={pos ? { '--pop-top': `${pos.top}px`, '--pop-right': `${pos.right}px` } : undefined}>
          <h3>{t('storeMenuTitle')}</h3>
          <label className="pop-row"><span>{t('region')}</span>
            <select value={regionId || ''} onChange={(e) => setRegion(e.target.value)}>
              {Object.entries(regions).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
            </select>
          </label>
          {nextStart && (
            <div className="pop-row"><span>{t('week')}</span>
              <div className="seg" role="group" aria-label={t('week')}>
                <button type="button" className={week === 'now' ? 'on' : ''} aria-pressed={week === 'now'} onClick={() => setWeek('now')}>{t('thisWeek')}</button>
                <button type="button" className={week === 'next' ? 'on' : ''} aria-pressed={week === 'next'} onClick={() => setWeek('next')}>{t('nextWeek')} {date}</button>
              </div>
            </div>
          )}
          <div className="pop-row"><span>{multi ? t('myStores') : t('myStore')}</span>
            <div className="storegrid" role={multi ? 'group' : 'radiogroup'}>
              {regionStores.map((s) => {
                const on = selected.has(s.id);
                const deals = guide.find((g) => g.id === s.id)?.deals ?? 0;
                return (
                  <button key={s.id} type="button" className={`storeopt ${on ? 'on' : ''}`} role={multi ? undefined : 'radio'} aria-checked={multi ? undefined : on} aria-pressed={multi ? on : undefined} onClick={() => pickStore(s.id)}>
                    <i style={{ background: STORE_DOT[s.id] || 'var(--brand)' }} /><b>{s.name}</b><small>{deals} {t('dealsShort')}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pop-toggles">
            <label className="check"><input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} /> {t('multiStores')}</label>
            <label className="check" title={t('memberPriceTitle')}><input type="checkbox" checked={noMember} onChange={(e) => setNoMember(e.target.checked)} /> {t('excludeMember')}</label>
          </div>
          <div className="pop-foot"><a className="link" href="#/circulaires?tab=guide" onClick={() => setOpen(false)}>{t('whichStore')} →</a></div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Type-ahead to pick a canonical ingredient (pantry, favourites). */
export function IngredientPicker({ onPick, exclude = [], placeholder }) {
  const { lang } = useApp();
  const [q, setQ] = useState('');
  const lk = lang === 'en' ? 'en' : 'fr';
  const needle = deaccent(q.trim());
  const hits = needle.length < 2 ? [] : INGREDIENTS.filter((i) => !i.free && !exclude.includes(i.id) && (deaccent(i[lk]).includes(needle) || i.syn.some((x) => deaccent(x).startsWith(needle)))).slice(0, 8);
  return (
    <div className="picker">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {hits.length > 0 && <div className="picker-list">{hits.map((i) => <button type="button" key={i.id} onClick={() => { onPick(i.id); setQ(''); }}>{i[lk]}</button>)}</div>}
    </div>
  );
}

/**
 * What the price history says about an offer: the lowest price seen in N weeks, or an
 * ingredient that was not in this store's flyer the week before.
 */
export function dealNote(hist, offer) {
  const weeks = hist?.[offer.pk || offer.ing];
  if (!weeks || !offer.from) return null;
  const prior = Object.keys(weeks).filter((w) => w < offer.from).sort();
  if (!prior.length) return null;
  const min = Math.min(...prior.flatMap((w) => Object.values(weeks[w])));
  if (prior.length >= 3 && offer.perG <= min * 1.001) return { kind: 'low', weeks: prior.length };
  const last = prior[prior.length - 1];
  if (weeks[last][offer.store] == null) return { kind: 'new' };
  return null;
}
export function DealBadge({ offer }) {
  const { hist, t } = useApp();
  const n = dealNote(hist, offer);
  if (!n) return null;
  return <span className={`dealbadge ${n.kind}`}>{n.kind === 'low' ? `${t('lowestIn')} ${n.weeks} ${t('weeksWord')}` : t('newThisWeek')}</span>;
}

/** Deal score out of 10 (see shared/score.js): how good the price is, not how big the claimed discount. */
export function Score({ offer }) {
  const { baseline, hist, t } = useApp();
  const s = dealScore(offer, baseline, hist);
  if (s == null) return null;
  return <span className={`score ${s >= 8 ? 'hi' : s >= 5 ? 'mid' : 'lo'}`} title={t('scoreTitle')}>{s}/10</span>;
}
