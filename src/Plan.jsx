import React, { useMemo, useState } from 'react';
import { useApp } from './store.jsx';
import { Img, Store, Icon, IngredientPicker, offerText, nice, mealScale, offerName } from './ui.jsx';
import { AISLES, ING_BY_ID } from '../shared/ingredients.js';
import { suggestPlan, batchesFor } from '../shared/planner.js';

const DAYS = [['Lundi', 'Monday'], ['Mardi', 'Tuesday'], ['Mercredi', 'Wednesday'], ['Jeudi', 'Thursday'], ['Vendredi', 'Friday'], ['Samedi', 'Saturday'], ['Dimanche', 'Sunday']];

export default function Plan() {
  const app = useApp();
  const { plan, setBatches, byId, costs, recipes, t, lang, fmt, storeName, days, setDay, people, setPeople, budget, setBudget, checks, toggleCheck, clearChecks, pantry, togglePantry, setPlanAll } = app;
  const [mode, setMode] = useState('aisle');
  const [copied, setCopied] = useState(false);
  const li = lang === 'en' ? 1 : 0;
  const lk = lang === 'en' ? 'en' : 'fr';
  const rows = Object.entries(plan).map(([id, n]) => ({ r: byId.get(id), n })).filter((x) => x.r);
  const num = (x) => String(x).replace('.', lang === 'en' ? '.' : ',');

  const { total, meals, list, others } = useMemo(() => {
    let total = 0; let meals = 0;
    const agg = {}; const others = [];
    for (const { r, n } of rows) {
      const c = costs.get(r.id);
      total += (c.total || 0) * n;
      meals += (r.meals || r.servings || 0) * n;
      for (const l of c.lines) {
        if (l.src === 'free' || l.src === 'have') continue;
        if (!l.ing) { others.push(`${l.raw}${n !== 1 ? ` (×${num(n)})` : ''}`); continue; }
        const a = (agg[l.ing] ||= { ing: l.ing, g: 0, cost: 0, lines: [], offer: null });
        if (l.offer && !a.offer) a.offer = l.offer;
        if (l.g != null) a.g += l.g * n;
        a.cost += (l.cost || 0) * n;
        a.lines.push(l.raw);
      }
    }
    const list = Object.values(agg).map((a) => ({ ...a, def: ING_BY_ID[a.ing], store: a.offer?.store || '' }));
    return { total, meals, list, others };
  }, [rows.map((x) => x.r.id + x.n).join(), costs]);

  const propose = () => {
    if (rows.length && !window.confirm(t('replacePlan'))) return;
    setPlanAll(suggestPlan(recipes, costs, { budget: budget || null, people }));
  };

  const groups = {};
  for (const a of list) (groups[mode === 'aisle' ? a.def.cat : a.store] ||= []).push(a);
  const order = mode === 'aisle' ? Object.keys(AISLES) : Object.keys(groups).sort((a, b) => (a === '' ? 1 : b === '' ? -1 : groups[b].length - groups[a].length));
  const title = (k) => (mode === 'aisle' ? AISLES[k][lk] : k ? storeName[k] || k : t('anyStore'));
  const qty = (a) => (a.g ? (a.g >= 1000 ? `${num((a.g / 1000).toFixed(a.g >= 10000 ? 0 : 1))} kg` : `${Math.round(a.g / 5) * 5 || Math.round(a.g)} g`) : '');
  const text = () => order.filter((k) => groups[k]).map((k) => `${title(k)}\n` + groups[k].map((a) => `${checks[a.ing] ? '✓' : '-'} ${a.def[lk]}${qty(a) ? ` (≈ ${qty(a)})` : ''}${a.offer ? ` — ${storeName[a.offer.store]}: ${offerText(a.offer, fmt)}` : ''}`).join('\n')).join('\n\n')
    + (others.length ? `\n\n${t('others')}\n` + others.map((o) => '- ' + o).join('\n') : '');
  const copy = async () => { try { await navigator.clipboard.writeText(text()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ } };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: t('groceryList'), text: text() }); else await copy(); } catch { /* cancelled */ } };

  const byDay = [...DAYS.map((d, i) => ({ label: d[li], items: rows.filter((x) => days[x.r.id] === i) })), { label: t('unassigned'), items: rows.filter((x) => !(days[x.r.id] >= 0 && days[x.r.id] <= 6)) }];
  const over = budget && total > budget;

  return (
    <div className="wrap plan">
      <section className="plan-setup noprint">
        <label><span>{t('household')}</span>
          <span className="stepper"><button type="button" onClick={() => setPeople(Math.max(1, people - 1))} aria-label="−">−</button><b>{people}</b><button type="button" onClick={() => setPeople(Math.min(10, people + 1))} aria-label="+">+</button></span>
        </label>
        <label><span>{t('weeklyBudget')}</span>
          <input type="number" min="0" step="5" inputMode="decimal" value={budget ?? ''} placeholder="—" onChange={(e) => setBudget(e.target.value ? Math.max(0, +e.target.value) : null)} /> $
        </label>
        <button type="button" className="btn primary" onClick={propose}><Icon name="spark" /> {t('proposePlan')}</button>
      </section>

      {!rows.length ? <div className="state">{t('planEmpty')} <a className="link" href="#/">{t('recipes')} →</a></div> : (
        <>
          <div className="plan-top">
            <div className={`stat ${over ? 'over' : ''}`}>
              <small>{t('planTotal')}{budget ? ` / ${fmt(budget)}` : ''}</small><b>≈ {fmt(total)}</b>
              {budget ? <div className="budget-bar"><span style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} /></div> : null}
              {budget ? <small>{over ? `${t('overBudget')} ${fmt(total - budget)}` : `${t('leftBudget')} ${fmt(budget - total)}`}</small> : null}
            </div>
            <div className="stat"><small>{t('planned')}</small><b>{meals ? num(meals) : '—'}</b><small>{meals ? `${num((meals / people).toFixed(1))} ${t('perPerson')}` : ''}</small></div>
            <div className="stat"><small>{t('avgServing')}</small><b>{meals ? '≈ ' + fmt(total / meals) : '—'}</b></div>
          </div>

          <h2>{t('week')}</h2>
          <div className="week">
            {byDay.filter((d, i) => d.items.length || i < 7).map((d, i) => {
              const m = d.items.reduce((acc, { r }) => { if (r.macros) { const k = mealScale(r); acc.kcal += r.macros.kcal * k; acc.p += (r.macros.protein || 0) * k; acc.n++; } return acc; }, { kcal: 0, p: 0, n: 0 });
              return (
                <section key={i} className={`day ${d.items.length ? '' : 'empty'}`}>
                  <header><b>{d.label}</b>{m.n ? <small>{Math.round(m.kcal)} kcal · {Math.round(m.p)} g P {t('perPersonShort')}</small> : null}</header>
                  {d.items.map(({ r, n }) => {
                    const c = costs.get(r.id);
                    return (
                      <div className="plan-item" key={r.id}>
                        <Img src={r.image} alt="" />
                        <div className="grow">
                          <a href={`#/r/${r.id}`}>{r.name}</a>
                          <div className="meta">{c.total != null ? `≈ ${fmt(c.total * n)}` : t('noPrice')}{r.meals || r.servings ? ` · ${num((r.meals || r.servings) * n)} ${r.meals ? t('mealsWord') : t('servings')}` : ''}{c.missing.length ? ` · ${t('partial')}` : ''}</div>
                          <div className="plan-ctl noprint">
                            <select value={days[r.id] >= 0 ? days[r.id] : ''} onChange={(e) => setDay(r.id, e.target.value === '' ? null : +e.target.value)} aria-label={t('day')}>
                              <option value="">{t('unassigned')}</option>
                              {DAYS.map((x, j) => <option key={j} value={j}>{x[li]}</option>)}
                            </select>
                            <span className="stepper" aria-label={t('batches')}>
                              <button type="button" onClick={() => setBatches(r.id, n - 0.5)} aria-label="−">−</button><span>{num(n)}×</span><button type="button" onClick={() => setBatches(r.id, n + 0.5)} aria-label="+">+</button>
                            </span>
                            {batchesFor(r, people) !== n ? <button type="button" className="link" onClick={() => setBatches(r.id, batchesFor(r, people))}>{t('fitHousehold')} ({num(batchesFor(r, people))}×)</button> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>

          <div className="listhead">
            <h2>{t('groceryList')}</h2>
            <span className="noprint">
              <button type="button" className={`chip ${mode === 'aisle' ? 'on' : ''}`} onClick={() => setMode('aisle')}>{t('byAisle')}</button>{' '}
              <button type="button" className={`chip ${mode === 'store' ? 'on' : ''}`} onClick={() => setMode('store')}>{t('byStore')}</button>{' '}
              <button type="button" className="btn" onClick={share}>{copied ? t('copied') : t('share')}</button>{' '}
              <button type="button" className="btn" onClick={() => window.print()}>{t('print')}</button>{' '}
              {Object.keys(checks).length ? <button type="button" className="link" onClick={clearChecks}>{t('uncheckAll')}</button> : null}
            </span>
          </div>
          <div className="glist">
            {order.filter((k) => groups[k]).map((k) => (
              <section key={k || 'none'}>
                <h3>{title(k)}</h3>
                <ul>{groups[k].sort((a, b) => a.def[lk].localeCompare(b.def[lk])).map((a) => (
                  <li key={a.ing} className={checks[a.ing] ? 'done' : ''}>
                    <label><input type="checkbox" checked={!!checks[a.ing]} onChange={() => toggleCheck(a.ing)} /> <b>{a.def[lk]}</b>{qty(a) ? <span className="meta"> ≈ {qty(a)}</span> : null}</label>
                    {a.offer ? <div className="offer"><Store id={a.offer.store} /> {offerName(a.offer, lang)} — <b>{offerText(a.offer, fmt)}</b></div> : null}
                    <div className="row-tools noprint"><button type="button" className="link" onClick={() => togglePantry(a.ing)}>{t('haveIt')}</button></div>
                  </li>
                ))}</ul>
              </section>
            ))}
            {others.length > 0 && <section><h3>{t('others')}</h3><ul>{others.map((o, i) => <li key={i}>{o}</li>)}</ul></section>}
          </div>
        </>
      )}

      <section className="pantry noprint">
        <h2>{t('pantryTitle')}</h2>
        <p className="note">{t('pantryIntro')}</p>
        <IngredientPicker exclude={pantry} onPick={togglePantry} placeholder={t('addIngredient')} />
        <div className="pills">{pantry.map((id) => ING_BY_ID[id] && <button type="button" key={id} className="pill" onClick={() => togglePantry(id)}>{ING_BY_ID[id][lk]} ×</button>)}</div>
      </section>
    </div>
  );
}
