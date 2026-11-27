import React, { useMemo, useState } from 'react';
import { useApp, useRoute } from './store.jsx';
import { costRecipe, complete } from '../shared/cost.js';
import { Img, Store, Icon, IngredientPicker, offerText, nice, mealScale, offerName } from './ui.jsx';
import { AISLES, ING_BY_ID, memberLabel } from '../shared/ingredients.js';
import { BUNCH } from '../shared/price.js';
import { suggestPlan, batchesFor, encodePlan, decodePlan } from '../shared/planner.js';
import { DIETS } from '../shared/taxonomy.js';
import { localDate } from '../shared/text.js';

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Liquids are bought by volume: their list quantity is shown in ml or litres.
const LIQUID = new Set(['milk', 'cream_35', 'cream_10', 'soy_milk', 'coconut_milk', 'orange_juice', 'juice', 'tomato_sauce', 'broth_chicken', 'broth_beef', 'broth_veg', 'broth_fish', 'olive_oil', 'veg_oil', 'sesame_oil', 'vinegar', 'soy_sauce', 'fish_sauce', 'hot_sauce', 'wine', 'maple_syrup', 'honey', 'buttermilk', 'water']);

// Staples most kitchens already have: one tap adds them to the pantry.
export const ESSENTIALS = ['olive_oil', 'veg_oil', 'salt', 'pepper', 'flour', 'sugar', 'garlic', 'onion', 'butter'];


const DAYS = [['Lundi', 'Monday'], ['Mardi', 'Tuesday'], ['Mercredi', 'Wednesday'], ['Jeudi', 'Thursday'], ['Vendredi', 'Friday'], ['Samedi', 'Saturday'], ['Dimanche', 'Sunday']];

export default function Plan() {
  const app = useApp();
  const { plan, setBatches, byId, costs, recipes, t, lang, fmt, storeName, days, setDay, people, setPeople, budget, setBudget, checks, toggleCheck, clearChecks, pantry, togglePantry, setPantryAll, setPlanAll, left, setLeftDay, recent, remember, replaceInPlan, targets, setTargets, extras, toggleExtra, clearExtras, storeOffers, baseline, have, selected, pickStore } = app;
  const { query } = useRoute();
  const shared = decodePlan(query.get('p')).filter((x) => byId.has(x.id));
  const [linkCopied, setLinkCopied] = useState(false);
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
        // One line per product: balsamic and rice vinegar, naan and corn tortillas are
        // different things to buy even though they share an aisle and an ingredient group.
        const key = l.pk || l.ing;
        const a = (agg[key] ||= { key, ing: l.ing, g: 0, cost: 0, lines: [], offer: null, pantryOnly: true });
        if (l.offer && !a.offer) a.offer = l.offer;
        if (l.g != null) a.g += l.g * n;
        a.cost += (l.cost || 0) * n;
        if (l.src !== 'pantry') a.pantryOnly = false;
        a.lines.push({ raw: l.raw, recipe: r.name, n });
      }
    }
    const list = Object.values(agg).map((a) => ({ ...a, def: ING_BY_ID[a.ing], name: memberLabel(a.key, lang), store: a.offer?.store || '' }));
    return { total, meals, list, others, saved };
  }, [rows.map((x) => x.r.id + x.n).join(), costs, lang]);

  const goals = { minProtein: targets.minp || 0, maxKcal: targets.maxk || 0, diet: targets.diet || null, lang: targets.lang || null, maxTime: targets.maxt || 0 };
  const dinners = targets.n || 5;
  const propose = () => {
    if (rows.length && !window.confirm(t('replacePlan'))) return;
    // Not the same dinners as last time: what was just planned or proposed is set aside.
    const avoid = new Set([...recent, ...rows.map((x) => x.r.id)]);
    let list = suggestPlan(recipes, costs, { budget: budget || null, people, avoid, dinners, ...goals });
    if (list.length < Math.min(3, dinners)) list = suggestPlan(recipes, costs, { budget: budget || null, people, dinners, ...goals });
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
    // Dates are Québec calendar days (not UTC); each event's UID carries its date so next
    // week's export adds events instead of overwriting this week's. Text is escaped per RFC 5545
    // and the recipe link also goes in DESCRIPTION, since Google Calendar ignores URL.
    const day = (d) => localDate(d).replace(/-/g, '');
    const esc = (x) => String(x).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const today = new Date(localDate(now) + 'T12:00:00');
    const ev = byDay.slice(0, 7).flatMap((d, i) => d.items.map(({ r, isLeft }) => {
      const date = new Date(today); date.setDate(today.getDate() + ((i + 1 - today.getDay() + 7) % 7));
      const end = new Date(date); end.setDate(date.getDate() + 1);
      return `BEGIN:VEVENT\r\nUID:${r.id}-${day(date)}-${i}@grocerymaxxing\r\nDTSTAMP:${dtstamp}\r\nDTSTART;VALUE=DATE:${day(date)}\r\nDTEND;VALUE=DATE:${day(end)}\r\nSUMMARY:${esc((isLeft ? t('leftovers') + ' — ' : '') + r.name)}\r\nDESCRIPTION:${esc(r.url)}\r\nURL:${r.url}\r\nEND:VEVENT`;
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

  // Seasonings and unmeasured staples ("salt", "oil for the pan") go to a separate
  // "check your pantry" section, out of the way of what must be bought.
  const groups = {};
  const pantryCheck = list.filter((a) => a.pantryOnly).sort((a, b) => a.name.localeCompare(b.name));
  for (const a of list) if (!a.pantryOnly) (groups[mode === 'aisle' ? a.def.cat : a.store] ||= []).push(a);
  const order = mode === 'aisle' ? Object.keys(AISLES) : Object.keys(groups).sort((a, b) => (a === '' ? 1 : b === '' ? -1 : groups[b].length - groups[a].length));
  const title = (k) => (mode === 'aisle' ? AISLES[k][lk] : k ? storeName[k] || k : t('anyStore'));
  const weight = (g) => (g >= 1000 ? `${num((g / 1000).toFixed(g >= 10000 ? 0 : 1))} kg` : `${Math.round(g / 5) * 5 || Math.round(g)} g`);
  // In shopping units: eggs and onions by the piece, milk and broth by volume, the rest by weight.
  const qty = (a) => {
    if (!a.g) return '';
    const d = a.def;
    if (LIQUID.has(a.ing)) { const ml = a.g / (d.d || 1); return ml >= 1000 ? `${num((ml / 1000).toFixed(1))} L` : `${Math.max(5, Math.round(ml / 5) * 5)} ml`; }
    if (d.u && (a.ing === 'egg' || (d.cat === 'produce' && d.u >= 40 && !BUNCH.has(a.ing)))) {
      const n = Math.max(1, Math.ceil(a.g / d.u - 0.2));
      return a.ing === 'egg' ? `${n}` : `${n} (${weight(a.g)})`;
    }
    return weight(a.g);
  };
  const sorted = (k) => [...groups[k]].sort((a, b) => a.name.localeCompare(b.name));
  const text = () => order.filter((k) => groups[k]).map((k) => `${title(k)}\n` + sorted(k).map((a) => `${checks[a.key] ? '✓' : '-'} ${a.name}${qty(a) ? ` (≈ ${qty(a)})` : ''}${a.offer ? ` — ${storeName[a.offer.store]}: ${offerText(a.offer, fmt)}` : ''}`).join('\n')).join('\n\n')
    + (others.length ? `\n\n${t('others')}\n` + others.map((o) => '- ' + o).join('\n') : '')
    + (pantryCheck.length ? `\n\n${t('checkPantry')}\n` + pantryCheck.map((a) => `- ${a.name}`).join('\n') : '')
    + (extras.length ? `\n\n${t('addedDeals')}\n` + extras.map((e) => `${checks['x:' + e.id] ? '✓' : '-'} ${nice(e.name, lang)} — ${storeName[e.store] || e.store}: ${offerText(e, fmt)}`).join('\n') : '');
  const copy = async () => { try { await navigator.clipboard.writeText(text()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ } };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: t('groceryList'), text: text() }); else await copy(); } catch { /* cancelled */ } };

  const byDay = [...DAYS.map((d, i) => ({ label: d[li], items: [...rows.filter((x) => days[x.r.id] === i), ...rows.filter((x) => left[x.r.id] === i && days[x.r.id] !== i).map((x) => ({ ...x, isLeft: true }))] })), { label: t('unassigned'), items: rows.filter((x) => !(days[x.r.id] >= 0 && days[x.r.id] <= 6)) }];
  const over = budget && total > budget;

  // The same plan at each store on its own: worth switching when one is clearly cheaper.
  const byStore = useMemo(() => {
    if (!rows.length) return [];
    const out = [];
    for (const [id, offers] of storeOffers) {
      let sum = 0; let ok = true;
      for (const { r, n } of rows) { const c = costRecipe(r, offers, baseline, have); if (!complete(c)) { ok = false; break; } sum += c.total * n; }
      if (ok) out.push({ id, total: sum });
    }
    return out.sort((a, b) => a.total - b.total);
  }, [rows.map((x) => x.r.id + x.n).join(), storeOffers, baseline, have]); // eslint-disable-line react-hooks/exhaustive-deps
  const cheapest = byStore[0];
  const here = selected.size === 1 ? byStore.find((x) => selected.has(x.id)) : null;
  const switchTip = cheapest && here && cheapest.id !== here.id && here.total - cheapest.total >= 1 ? { to: cheapest, from: here } : null;

  // At the checkout: a flyer product sold by the package is bought whole ("1 kg bag" for 300 g),
  // the rest as needed. An estimate; the plan total stays prorated so recipes compare fairly.
  const checkout = useMemo(() => list.reduce((sum, a) => {
    const o = a.offer;
    if (o && o.basis === 'size' && o.perG > 0 && a.g > 0) { const pack = o.price / o.perG; return sum + Math.ceil(a.g / pack - 0.05) * o.price; }
    return sum + a.cost;
  }, 0), [list]);

  const shareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/plan?p=${encodePlan(plan, days)}`;
    try { if (navigator.share) await navigator.share({ title: t('plan'), url }); else { await navigator.clipboard.writeText(url); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500); } } catch { /* cancelled */ }
  };
  const importShared = () => {
    if (rows.length && !window.confirm(t('replacePlan'))) return;
    setPlanAll(shared.map((x, i) => ({ ...x, day: x.day ?? i })));
    window.history.replaceState(null, '', '#/plan');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  return (
    <div className="wrap plan">
      <section className="plan-setup noprint">
        <label><span>{t('household')}</span>
          <span className="stepper"><button type="button" onClick={() => setPeople(Math.max(1, people - 1))} aria-label="−">−</button><b>{people}</b><button type="button" onClick={() => setPeople(Math.min(10, people + 1))} aria-label="+">+</button></span>
        </label>
        <label><span>{t('weeklyBudget')}</span>
          <input type="number" min="0" step="5" inputMode="decimal" value={budget ?? ''} placeholder="—" onChange={(e) => setBudget(e.target.value ? Math.max(0, +e.target.value) : null)} /> $
        </label>
        <label><span>{t('dinnersCount')}</span><select value={dinners} onChange={(e) => setTargets({ ...targets, n: +e.target.value })}>{[3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <details className="goals">
          <summary>{t('goals')}{targets.minp || targets.maxk || targets.diet || targets.lang || targets.maxt ? ' ✓' : ''}</summary>
          <label><span>{t('dietPref')}</span><select value={targets.diet || ''} onChange={(e) => setTargets({ ...targets, diet: e.target.value || null })}><option value="">—</option>{DIETS.map(([id, fr, en]) => <option key={id} value={id}>{(lang === 'en' ? en : fr).replace(/ \(.*\)$/, '')}</option>)}</select></label>
          <label><span>{t('recipeLang')}</span><select value={targets.lang || ''} onChange={(e) => setTargets({ ...targets, lang: e.target.value || null })}><option value="">{t('bothLangs')}</option><option value="fr">Français</option><option value="en">English</option></select></label>
          <label><span>{t('maxTime')}</span><select value={targets.maxt || ''} onChange={(e) => setTargets({ ...targets, maxt: +e.target.value || 0 })}><option value="">—</option>{[20, 30, 45, 60].map((n) => <option key={n} value={n}>≤ {n} min</option>)}</select></label>
          <label><span>{t('minProtein')}</span><select value={targets.minp || ''} onChange={(e) => setTargets({ ...targets, minp: +e.target.value || 0 })}><option value="">—</option>{[20, 30, 40, 50].map((n) => <option key={n} value={n}>≥ {n} g</option>)}</select></label>
          <label><span>{t('maxKcal')}</span><select value={targets.maxk || ''} onChange={(e) => setTargets({ ...targets, maxk: +e.target.value || 0 })}><option value="">—</option>{[400, 500, 600, 800].map((n) => <option key={n} value={n}>≤ {n} kcal</option>)}</select></label>
        </details>
        <button type="button" className="btn primary" onClick={propose}><Icon name="spark" /> {t('proposePlan')}</button>
      </section>

      {shared.length > 0 && (
        <div className="shared-plan noprint" role="status">
          <span>{t('sharedPlan')} : <b>{shared.length}</b> {t('dinners')} ({shared.slice(0, 3).map((x) => byId.get(x.id).name).join(', ')}{shared.length > 3 ? '…' : ''})</span>
          <span><button type="button" className="btn primary" onClick={importShared}>{t('importPlan')}</button> <a className="link" href="#/plan">{t('ignore')}</a></span>
        </div>
      )}
      {extras.length > 0 && <AddedDeals />}
      {!rows.length ? <div className="state">{t('planEmpty')} <a className="link" href="#/">{t('recipes')} →</a></div> : (
        <>
          {switchTip && (
            <div className="switch-tip noprint">
              <span>{t('planCosts')} <b>{fmt(switchTip.to.total)}</b> {t('at')} {storeName[switchTip.to.id]}, {fmt(switchTip.from.total)} {t('at')} {storeName[switchTip.from.id]} — {t('save')} <b>{fmt(switchTip.from.total - switchTip.to.total)}</b></span>
              <button type="button" className="btn" onClick={() => pickStore(switchTip.to.id, true)}>{t('shopAt')} {storeName[switchTip.to.id]}</button>
            </div>
          )}
          <div className="plan-top">
            <div className={`stat ${over ? 'over' : ''}`}>
              <small>{t('planTotal')}{budget ? ` / ${fmt(budget)}` : ''}</small><b>≈ {fmt(total)}</b>
              {budget ? <div className="budget-bar"><span style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} /></div> : null}
              {budget ? <small>{over ? `${t('overBudget')} ${fmt(total - budget)}` : `${t('leftBudget')} ${fmt(budget - total)}`}</small> : null}
              {checkout - total >= 0.5 ? <small title={t('atCheckoutTitle')}>{t('atCheckout')} ≈ {fmt(checkout)}</small> : null}
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
              <button type="button" className="btn" onClick={shareLink}>{linkCopied ? t('copied') : t('planLink')}</button>{' '}
              {Object.keys(checks).length ? <button type="button" className="link" onClick={clearChecks}>{t('uncheckAll')}</button> : null}
            </span>
          </div>
          <div className="glist">
            {order.filter((k) => groups[k]).map((k) => (
              <section key={k || 'none'}>
                <h3>{title(k)}</h3>
                <ul>{sorted(k).map((a) => (
                  <li key={a.key} className={checks[a.key] ? 'done' : ''}>
                    <label><input type="checkbox" checked={!!checks[a.key]} onChange={() => toggleCheck(a.key)} /> <b>{a.name}</b>{qty(a) ? <span className="meta"> ≈ {qty(a)}</span> : null}</label>
                    {a.offer ? <div className="offer"><Store id={a.offer.store} /> {offerName(a.offer, lang)} — <b>{offerText(a.offer, fmt)}</b></div> : null}
                    <details className="src-lines">
                      <summary>{a.lines.length === 1 ? a.lines[0].recipe : `${a.lines.length} ${t('recipeLines')}`}</summary>
                      <ul>{a.lines.map((x, i) => <li key={i}>{x.raw}{x.n !== 1 ? ` (×${num(x.n)})` : ''} — <i>{x.recipe}</i></li>)}</ul>
                    </details>
                    <div className="row-tools noprint"><button type="button" className="link" onClick={() => togglePantry(a.ing)}>{t('haveIt')}</button></div>
                  </li>
                ))}</ul>
              </section>
            ))}
            {others.length > 0 && <section><h3>{t('others')}</h3><ul>{others.map((o, i) => <li key={i}>{o}</li>)}</ul></section>}
            {pantryCheck.length > 0 && (
              <details className="pantry-check">
                <summary>{t('checkPantry')} ({pantryCheck.length})</summary>
                <ul>{pantryCheck.map((a) => (
                  <li key={a.key} className={checks[a.key] ? 'done' : ''}>
                    <label><input type="checkbox" checked={!!checks[a.key]} onChange={() => toggleCheck(a.key)} /> {a.name}</label>
                    <span className="meta"> — {[...new Set(a.lines.map((x) => x.recipe))].join(', ')}</span>
                  </li>
                ))}</ul>
              </details>
            )}
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
        {ESSENTIALS.some((id) => !pantry.includes(id)) && <button type="button" className="link" onClick={() => setPantryAll(ESSENTIALS)}>+ {t('essentials')}</button>}
        <div className="pills">{pantry.map((id) => ING_BY_ID[id] && <button type="button" key={id} className="pill" onClick={() => togglePantry(id)}>{ING_BY_ID[id][lk]} ×</button>)}</div>
      </section>
    </div>
  );
}

/** Flyer deals added to the list by hand from the Flyers tab. */
function AddedDeals() {
  const { extras, toggleExtra, clearExtras, checks, toggleCheck, storeName, fmt, t, lang, today } = useApp();
  const groups = {};
  for (const e of extras) (groups[e.store] ||= []).push(e);
  return (
    <section className="added-deals">
      <div className="listhead">
        <h2>{t('addedDeals')}</h2>
        <span className="noprint"><a className="link" href="#/circulaires">{t('moreDeals')} →</a> <button type="button" className="link" onClick={() => window.confirm(t('clearAddedConfirm')) && clearExtras()}>{t('clearAdded')}</button></span>
      </div>
      <div className="glist">
        {Object.entries(groups).map(([store, list]) => (
          <section key={store}>
            <h3><Store id={store} /></h3>
            <ul>{list.map((e) => (
              <li key={e.id} className={checks['x:' + e.id] ? 'done' : ''}>
                <label><input type="checkbox" checked={!!checks['x:' + e.id]} onChange={() => toggleCheck('x:' + e.id)} /> <b>{nice(e.name, lang)}</b> — {offerText(e, fmt)}</label>
                {e.to && e.to.slice(0, 10) < today ? <div className="meta">{t('dealExpired')}</div> : null}
                <div className="row-tools noprint"><button type="button" className="link" onClick={() => toggleExtra(e)}>{t('remove')}</button></div>
              </li>
            ))}</ul>
          </section>
        ))}
      </div>
    </section>
  );
}

