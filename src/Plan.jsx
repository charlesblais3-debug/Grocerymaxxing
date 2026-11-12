import React, { useMemo, useState } from 'react';
import { useApp } from './store.jsx';
import { Img, Store, Icon, IngredientPicker, offerText, nice, mealScale, offerName } from './ui.jsx';
import { AISLES, ING_BY_ID } from '../shared/ingredients.js';
import { suggestPlan, batchesFor } from '../shared/planner.js';

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const DAYS = [['Lundi', 'Monday'], ['Mardi', 'Tuesday'], ['Mercredi', 'Wednesday'], ['Jeudi', 'Thursday'], ['Vendredi', 'Friday'], ['Samedi', 'Saturday'], ['Dimanche', 'Sunday']];

export default function Plan() {
  const app = useApp();
  const { plan, setBatches, byId, costs, recipes, t, lang, fmt, storeName, days, setDay, people, setPeople, budget, setBudget, checks, toggleCheck, clearChecks, pantry, togglePantry, setPlanAll, left, setLeftDay, recent, remember, replaceInPlan, targets, setTargets } = app;
  const [mode, setMode] = useState('aisle');
  const [copied, setCopied] = useState(false);
  const li = lang === 'en' ? 1 : 0;
  const lk = lang === 'en' ? 'en' : 'fr';
  const rows = Object.entries(plan).map(([id, n]) => ({ r: byId.get(id), n })).filter((x) => x.r);
  const num = (x) => String(x).replace('.', lang === 'en' ? '.' : ',');

  const { total, meals, list, others, saved } = useMemo(() => {
    let total = 0; let meals = 0; let saved = 0;
    const agg = {}; const others = [];
    for (const { r, n } of rows) {
      const c = costs.get(r.id);
      total += (c.total || 0) * n;
      saved += (c.savings || 0) * n;
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
    return { total, meals, list, others, saved };
  }, [rows.map((x) => x.r.id + x.n).join(), costs]);

  const goals = { minProtein: targets.minp || 0, maxKcal: targets.maxk || 0 };
  const propose = () => {
    if (rows.length && !window.confirm(t('replacePlan'))) return;
    // Not the same dinners as last time: what was just planned or proposed is set aside.
    const avoid = new Set([...recent, ...rows.map((x) => x.r.id)]);
    let list = suggestPlan(recipes, costs, { budget: budget || null, people, avoid, ...goals });
    if (list.length < 3) list = suggestPlan(recipes, costs, { budget: budget || null, people, ...goals });
    remember(rows.map((x) => x.r.id));
    setPlanAll(list);
  };
  // Swap one dinner for the next best one, keeping the rest of the week and the budget.
  const swap = (r, n) => {
    const others = rows.filter((x) => x.r !== r).map((x) => x.r);
    const spent = total - (costs.get(r.id).total || 0) * n;
    const [next] = suggestPlan(recipes, costs, { budget: budget ? Math.max(0, budget - spent) : null, people, dinners: 1, keep: others, avoid: new Set([...recent, r.id, ...others.map((x) => x.id)]), ...goals });
    if (!next) return window.alert(t('noSwap'));
    remember([r.id]);
    replaceInPlan(r.id, next);
  };
  const ics = () => {
    const stamp = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const today = new Date();
    const ev = byDay.slice(0, 7).flatMap((d, i) => d.items.map(({ r, isLeft }) => {
      const date = new Date(today); date.setDate(today.getDate() + ((i + 1 - today.getDay() + 7) % 7));
      const end = new Date(date); end.setDate(date.getDate() + 1);
      return `BEGIN:VEVENT\r\nUID:${r.id}-${i}@grocerymaxxing\r\nDTSTAMP:${stamp(today)}T000000Z\r\nDTSTART;VALUE=DATE:${stamp(date)}\r\nDTEND;VALUE=DATE:${stamp(end)}\r\nSUMMARY:${(isLeft ? t('leftovers') + ' — ' : '') + r.name.replace(/[,;]/g, ' ')}\r\nURL:${r.url}\r\nEND:VEVENT`;
    }));
    download('semaine.ics', `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Grocerymaxxing//FR\r\n${ev.join('\r\n')}\r\nEND:VCALENDAR\r\n`, 'text/calendar');
  };
  const backup = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('gm.')) data[k] = localStorage.getItem(k); }
    download('grocerymaxxing-sauvegarde.json', JSON.stringify(data, null, 1), 'application/json');
  };
  const restore = async (file) => {
    try {
      const data = JSON.parse(await file.text());
      const keys = Object.keys(data).filter((k) => k.startsWith('gm.') && typeof data[k] === 'string');
      if (!keys.length) throw new Error('empty');
      for (const k of keys) { JSON.parse(data[k]); localStorage.setItem(k, data[k]); }
      window.location.reload();
    } catch { window.alert(t('badBackup')); }
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

  const byDay = [...DAYS.map((d, i) => ({ label: d[li], items: [...rows.filter((x) => days[x.r.id] === i), ...rows.filter((x) => left[x.r.id] === i && days[x.r.id] !== i).map((x) => ({ ...x, isLeft: true }))] })), { label: t('unassigned'), items: rows.filter((x) => !(days[x.r.id] >= 0 && days[x.r.id] <= 6)) }];
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
        <details className="goals">
          <summary>{t('goals')}{targets.minp || targets.maxk ? ' ✓' : ''}</summary>
          <label><span>{t('minProtein')}</span><select value={targets.minp || ''} onChange={(e) => setTargets({ ...targets, minp: +e.target.value || 0 })}><option value="">—</option>{[20, 30, 40, 50].map((n) => <option key={n} value={n}>≥ {n} g</option>)}</select></label>
          <label><span>{t('maxKcal')}</span><select value={targets.maxk || ''} onChange={(e) => setTargets({ ...targets, maxk: +e.target.value || 0 })}><option value="">—</option>{[400, 500, 600, 800].map((n) => <option key={n} value={n}>≤ {n} kcal</option>)}</select></label>
        </details>
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
            <div className="stat"><small>{t('planned')}</small><b>{meals ? num(meals) : '—'}</b><small>{meals ? `≈ ${fmt(total / meals)} ${t('perMeal')} · ${num((meals / people).toFixed(1))} ${t('perPerson')}` : ''}</small></div>
            <div className="stat saved"><small>{t('savedWeek')}</small><b>{saved > 0.05 ? fmt(saved) : '—'}</b><small>{saved > 0.05 ? `${Math.round((saved / (total + saved)) * 100)} % ${t('vsRegular')}` : ''}</small></div>
          </div>

          <h2>{t('week')}</h2>
          <div className="week">
            {byDay.filter((d, i) => d.items.length || i < 7).map((d, i) => {
              const m = d.items.reduce((acc, { r }) => { if (r.macros) { const k = mealScale(r); acc.kcal += r.macros.kcal * k; acc.p += (r.macros.protein || 0) * k; acc.n++; } return acc; }, { kcal: 0, p: 0, n: 0 });
              return (
                <section key={i} className={`day ${d.items.length ? '' : 'empty'}`}>
                  <header><b>{d.label}</b>{m.n ? <small>{Math.round(m.kcal)} kcal · {Math.round(m.p)} g P {t('perPersonShort')}</small> : null}</header>
                  {d.items.map(({ r, n, isLeft }) => {
                    const c = costs.get(r.id);
                    if (isLeft) return <div className="plan-item leftover" key={r.id + 'l'}><Img src={r.image} alt="" /><div className="grow"><a href={`#/r/${r.id}`}>{t('leftovers')} — {r.name}</a><div className="meta">{t('noExtraCost')}</div></div></div>;
                    const enough = (r.meals || r.servings || 0) * n >= people * 2;
                    return (
                      <div className="plan-item" key={r.id}>
                        <Img src={r.image} alt="" />
                        <div className="grow">
                          <a href={`#/r/${r.id}`}>{r.name}</a>
                          <div className="meta">{c.total != null ? `≈ ${fmt(c.total * n)}` : t('noPrice')}{r.meals || r.servings ? ` · ${num((r.meals || r.servings) * n)} ${r.meals ? t('mealsWord') : t('servings')}` : ''}{c.missing.length ? ` · ${t('partial')}` : ''}</div>
                          <details className="plan-ctl noprint"><summary>{t('edit')}</summary><div>
                            <select value={days[r.id] >= 0 ? days[r.id] : ''} onChange={(e) => setDay(r.id, e.target.value === '' ? null : +e.target.value)} aria-label={t('day')}>
                              <option value="">{t('unassigned')}</option>
                              {DAYS.map((x, j) => <option key={j} value={j}>{x[li]}</option>)}
                            </select>
                            <span className="stepper" aria-label={t('batches')}>
                              <button type="button" onClick={() => setBatches(r.id, n - 0.5)} aria-label="−">−</button><span>{num(n)}×</span><button type="button" onClick={() => setBatches(r.id, n + 0.5)} aria-label="+">+</button>
                            </span>
                            {batchesFor(r, people) !== n ? <button type="button" className="link" onClick={() => setBatches(r.id, batchesFor(r, people))}>{t('fitHousehold')} ({num(batchesFor(r, people))}×)</button> : null}
                            {enough ? (
                              <select value={left[r.id] >= 0 ? left[r.id] : ''} onChange={(e) => setLeftDay(r.id, e.target.value === '' ? null : +e.target.value)} aria-label={t('leftovers')}>
                                <option value="">{t('leftoversOn')}</option>
                                {DAYS.map((x, j) => <option key={j} value={j}>{t('leftovers')} : {x[li]}</option>)}
                              </select>
                            ) : null}
                            <button type="button" className="link" onClick={() => swap(r, n)}>↻ {t('swap')}</button>
                            <button type="button" className="link" onClick={() => setBatches(r.id, 0)}>{t('remove')}</button>
                          </div></details>
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
              <button type="button" className="btn" onClick={ics}>{t('calendar')}</button>{' '}
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

      <details className="mydata noprint">
        <summary>{t('myData')}</summary>
        <p className="note">{t('myDataIntro')}</p>
        <button type="button" className="btn" onClick={backup}>{t('backup')}</button>{' '}
        <label className="btn">{t('restore')}<input type="file" accept="application/json" hidden onChange={(e) => e.target.files[0] && restore(e.target.files[0])} /></label>
      </details>

      <section className="pantry noprint">
        <h2>{t('pantryTitle')}</h2>
        <p className="note">{t('pantryIntro')}</p>
        <IngredientPicker exclude={pantry} onPick={togglePantry} placeholder={t('addIngredient')} />
        <div className="pills">{pantry.map((id) => ING_BY_ID[id] && <button type="button" key={id} className="pill" onClick={() => togglePantry(id)}>{ING_BY_ID[id][lk]} ×</button>)}</div>
      </section>
    </div>
  );
}
