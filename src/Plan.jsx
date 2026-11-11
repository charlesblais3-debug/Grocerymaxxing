import React, { useMemo, useState } from 'react';
import { useApp } from './store.jsx';
import { Img, offerText, nice } from './ui.jsx';
import { AISLES, ING_BY_ID } from '../shared/ingredients.js';

export default function Plan() {
  const { plan, setBatches, byId, costs, t, lang, fmt, storeName, offers, baseline } = useApp();
  const [mode, setMode] = useState('aisle');
  const [copied, setCopied] = useState(false);
  const lk = lang === 'en' ? 'en' : 'fr';
  const rows = Object.entries(plan).map(([id, n]) => ({ r: byId.get(id), n })).filter((x) => x.r);

  const { total, servings, list, others, macros } = useMemo(() => {
    let total = 0; let servings = 0;
    const agg = {}; const others = [];
    const macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, n: 0 };
    for (const { r, n } of rows) {
      const c = costs.get(r.id);
      total += (c.total || 0) * n;
      servings += (r.meals || r.servings || 0) * n;
      if (r.macros && r.servings) {
        const s = r.servings * n;
        macros.kcal += (r.macros.kcal || 0) * s; macros.protein += (r.macros.protein || 0) * s;
        macros.carbs += (r.macros.carbs || 0) * s; macros.fat += (r.macros.fat || 0) * s; macros.n += s;
      }
      for (const l of c.lines) {
        if (l.src === 'free') continue;
        if (!l.ing) { others.push(`${l.raw}${n > 1 ? ` (×${n})` : ''}`); continue; }
        const a = (agg[l.ing] ||= { ing: l.ing, g: 0, unknown: 0, cost: 0, lines: [], offer: null });
        if (l.offer && !a.offer) a.offer = l.offer;
        if (l.g != null) a.g += l.g * n; else a.unknown++;
        a.cost += (l.cost || 0) * n;
        a.lines.push(l.raw);
      }
    }
    const list = Object.values(agg).map((a) => {
      const def = ING_BY_ID[a.ing];
      const offer = a.offer;
      return { ...a, def, offer, store: offer?.store || '', hasBase: !!baseline[a.ing] };
    });
    return { total, servings, list, others, macros };
  }, [rows.map((x) => x.r.id + x.n).join(), costs]);

  if (!rows.length) return <div className="state">{t('planEmpty')} <a className="link" href="#/">{t('recipes')} →</a></div>;

  const groups = {};
  for (const a of list) {
    const k = mode === 'aisle' ? a.def.cat : a.store;
    (groups[k] ||= []).push(a);
  }
  const order = mode === 'aisle' ? Object.keys(AISLES) : Object.keys(groups).sort((a, b) => (a === '' ? 1 : b === '' ? -1 : groups[b].length - groups[a].length));
  const title = (k) => (mode === 'aisle' ? AISLES[k][lk] : k ? storeName[k] || k : t('anyStore'));
  const qty = (a) => (a.g ? (a.g >= 1000 ? `${(a.g / 1000).toFixed(a.g >= 10000 ? 0 : 1)} kg` : `${Math.round(a.g / 5) * 5 || Math.round(a.g)} g`) : '');

  const copy = async () => {
    const txt = order.filter((k) => groups[k]).map((k) => `${title(k)}\n` + groups[k].map((a) => `- ${a.def[lk]}${qty(a) ? ` (≈ ${qty(a)})` : ''}${a.offer ? ` — ${storeName[a.offer.store]}: ${offerText(a.offer, fmt)}` : ''}`).join('\n')).join('\n\n')
      + (others.length ? `\n\n${t('others')}\n` + others.map((o) => '- ' + o).join('\n') : '');
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="wrap plan">
      <div className="plan-top">
        <div className="stat"><small>{t('planTotal')}</small><b>≈ {fmt(total)}</b></div>
        <div className="stat"><small>{t('planned')}</small><b>{servings || '—'}</b></div>
        <div className="stat"><small>{t('avgServing')}</small><b>{servings ? '≈ ' + fmt(total / servings) : '—'}</b></div>
        {macros.n > 0 && <div className="stat"><small>{t('nutrition')} {t('perServing')}</small><b>{Math.round(macros.kcal / macros.n)} kcal · {Math.round(macros.protein / macros.n)} g P</b></div>}
      </div>
      <ul className="plan-list">
        {rows.map(({ r, n }) => {
          const c = costs.get(r.id);
          return (
            <li key={r.id}>
              <Img src={r.image} alt="" />
              <div className="grow"><a href={`#/r/${r.id}`}>{r.name}</a><div className="meta">{c.total != null ? `≈ ${fmt(c.total * n)}` : t('noPrice')}{r.meals ? ` · ${r.meals * n} ${t('mealsWord')}` : r.servings ? ` · ${r.servings * n} ${t('servings')}` : ''}{c.deals ? ` · ${c.deals} ${t('deals')}` : ''}</div></div>
              <div className="stepper" aria-label={t('batches')}>
                <button type="button" onClick={() => setBatches(r.id, n - 1)} aria-label="−">−</button><span>{n}×</span><button type="button" onClick={() => setBatches(r.id, n + 1)} aria-label="+">+</button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="listhead">
        <h2>{t('groceryList')}</h2>
        <span>
          <button type="button" className={`chip ${mode === 'aisle' ? 'on' : ''}`} onClick={() => setMode('aisle')}>{t('byAisle')}</button>{' '}
          <button type="button" className={`chip ${mode === 'store' ? 'on' : ''}`} onClick={() => setMode('store')}>{t('byStore')}</button>{' '}
          <button type="button" className="btn" onClick={copy}>{copied ? t('copied') : t('copy')}</button>
        </span>
      </div>
      <div className="glist">
        {order.filter((k) => groups[k]).map((k) => (
          <section key={k || 'none'}>
            <h3>{title(k)}</h3>
            <ul>{groups[k].sort((a, b) => a.def[lk].localeCompare(b.def[lk])).map((a) => (
              <li key={a.ing}>
                <label><input type="checkbox" /> <b>{a.def[lk]}</b>{qty(a) ? <span className="meta"> ≈ {qty(a)}</span> : null}</label>
                {a.offer ? <div className="offer"><span className="store">{storeName[a.offer.store]}</span> {nice(a.offer.name, lang)} — <b>{offerText(a.offer, fmt)}</b></div> : null}
                <details><summary className="meta">{a.lines.length} × {t('ingredients').toLowerCase()}</summary>{a.lines.map((x, i) => <div key={i} className="meta">{x}</div>)}</details>
              </li>
            ))}</ul>
          </section>
        ))}
        {others.length > 0 && <section><h3>{t('others')}</h3><ul>{others.map((o, i) => <li key={i}><label><input type="checkbox" /> {o}</label></li>)}</ul></section>}
      </div>
    </div>
  );
}
