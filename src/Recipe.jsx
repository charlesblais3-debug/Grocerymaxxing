import React, { useState } from 'react';
import { useApp } from './store.jsx';
import { Img, CostTag, SavingBar, MacroRing, Store, Icon, DealBadge, offerText, nice, mealScale } from './ui.jsx';
import { MEAL_TYPES, CUISINES } from '../shared/taxonomy.js';
import { ING_BY_ID } from '../shared/ingredients.js';
import { L } from './i18n.js';
import { batchesFor } from '../shared/planner.js';

export default function Recipe({ id }) {
  const { byId, costs, t, lang, fmt, sourceName, plan, setBatches, meta, baseline, have: pantry, togglePantry, people } = useApp();
  const [have, setHave] = useState({});
  const [batch, setBatch] = useState(null);
  const r = byId.get(id);
  if (!r) return <div className="state">404</div>;
  const c = costs.get(id);
  const m = r.macros;
  const tags = [...r.tax.meals.map((x) => MEAL_TYPES.find((y) => y[0] === x)), ...r.tax.cuisines.map((x) => CUISINES.find((y) => y[0] === x))].filter(Boolean);
  const ppd = m?.protein != null && r.servings && c.total && c.coverage >= 0.75 ? (m.protein * r.servings) / c.total : null;
  const k = mealScale(r);
  const adjusted = r.meals && r.mealBasis !== 'source';
  const b = batch ?? plan[id] ?? batchesFor(r, people);
  const num = (x) => String(x).replace('.', lang === 'en' ? '.' : ',');
  const date = (d) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' });
  const src = sourceName[r.source] || r.source;
  return (
    <article className="wrap recipe">
      <a className="link" href="#/" onClick={(e) => { if (window.history.length > 1) { e.preventDefault(); window.history.back(); } }}>{t('back')}</a>
      <header className="rhead">
        <Img src={r.image} alt="" className="hero" />
        <div className="rhead-text">
          <div className="meta">{src}{r.author ? ` · ${r.author}` : ''}{r.rating ? ` · ★ ${r.rating.value.toFixed(1)}${r.rating.count ? ` (${r.rating.count})` : ''}` : ''}</div>
          <h1>{r.name}</h1>
          <div className="tags">{tags.map((x) => <span key={x[0]} className="tag">{L(lang, x)}</span>)}</div>
          <div className="facts">
            {r.time ? <span><Icon name="clock" /> {r.time} {t('min')}</span> : null}
            {r.yield || r.servings ? <span><Icon name="users" /> {r.yield || `${r.servings} ${t('servings')}`}</span> : null}
            {r.steps ? <span><Icon name="list" /> {r.steps} {t('steps')}</span> : null}
          </div>
          <div className="costbox">
            <CostTag cost={c} big />
            {c.total != null && <div className="sub">{t('total')} : ≈ {fmt(c.total)} · {c.priced}/{c.countable} {t('coverage')}</div>}
            {c.missing.length > 0 && <div className="warnbox">{t('incomplete')} {[...new Set(c.missing)].map((id) => ING_BY_ID[id][lang === 'en' ? 'en' : 'fr'].toLowerCase()).join(', ')}.</div>}
            <SavingBar cost={c} label />
            {adjusted && <div className="sub mealnote">{lang === 'en'
              ? `Counted as ${r.meals} meals (${r.mealBasis === 'kcal' ? 'about 550 kcal each, from the published nutrition' : 'about 450 g of food each'})${r.servings ? ` — the source says ${r.yield || r.servings + ' servings'}` : ''}.`
              : `Compté comme ${String(r.meals).replace('.', ',')} repas (${r.mealBasis === 'kcal' ? 'environ 550 kcal chacun, selon les valeurs publiées' : 'environ 450 g de nourriture chacun'})${r.servings ? ` — la source indique ${r.yield || r.servings + ' portions'}` : ''}.`}</div>}
            {ppd != null && <div className="sub">{ppd.toFixed(1)} {t('proteinPerDollar')}</div>}
            {c.total != null && (
              <div className="batch">
                <span className="stepper" aria-label={t('batches')}><button type="button" onClick={() => setBatch(Math.max(0.5, b - 0.5))} aria-label="−">−</button><b>{num(b)}×</b><button type="button" onClick={() => setBatch(b + 0.5)} aria-label="+">+</button></span>
                <span>{t('batchCost')} <b>≈ {fmt(c.total * b)}</b>{r.meals || r.servings ? ` · ${num((r.meals || r.servings) * b)} ${r.meals ? t('mealsWord') : t('servings')}` : ''}</span>
              </div>
            )}
            <div className="actions">
              <a className="btn primary" href={r.url} target="_blank" rel="noopener noreferrer"><Icon name="book" /> {t('method')} {src} ↗</a>
              <button type="button" className="btn" onClick={() => setBatches(id, plan[id] ? 0 : b)}>{plan[id] ? `✓ ${t('inPlan')} (${num(plan[id])}×)` : `+ ${t('addPlan')}`}</button>
            </div>
            <p className="note">{t('methodNote')}</p>
          </div>
        </div>
      </header>

      <div className="rcols">
        <section>
          <h2>{t('ingredients')}</h2>
          <p className="note">{t('tickHave')}</p>
          <ul className="ings">
            {c.lines.map((l, i) => (
              <li key={i} className={`${l.src === 'flyer' ? 'sale' : ''} ${have[i] || l.src === 'have' ? 'have' : ''}`}>
                <label title={t('haveIt')}>
                  <input type="checkbox" checked={l.ing ? pantry.has(l.ing) : !!have[i]} onChange={(e) => (l.ing && !ING_BY_ID[l.ing].free ? togglePantry(l.ing) : setHave({ ...have, [i]: e.target.checked }))} />
                  <span className="raw">{l.raw}</span>
                </label>
                <span className="num">{l.cost ? fmt(l.cost) : l.src === 'free' || l.src === 'pantry' || l.src === 'have' ? '' : '—'}</span>
                <div className="src">
                  {l.src === 'flyer' && (
                    <span className="offer">
                      <Store id={l.offer.store} /> <DealBadge offer={l.offer} /> {nice(l.offer.name, lang)} — <b>{offerText(l.offer, fmt)}</b>
                      {l.offer.to ? <small> · {t('until')} {date(l.offer.to)}</small> : null}
                      {l.via ? <small> · ≈ {ING_BY_ID[l.via][lang === 'en' ? 'en' : 'fr']}</small> : null}
                    </span>
                  )}
                  {l.src === 'base' && <span className="base">{t(baseline[l.via || l.ing]?.kind === 'statcan' ? 'refStatcan' : baseline[l.via || l.ing]?.kind === 'flyer-regular' ? 'refFlyerRegular' : 'refFlyer')} · {fmt((l.cost / l.g) * 1000)}/kg</span>}
                  {l.src == null && <span className="none">{l.odd ? t('oddQty') : t('notPriced')}</span>}
                  {l.src === 'pantry' && <span className="none">{t('pantryItem')}</span>}
                  {l.src === 'have' && <span className="none">{t('atHome')}</span>}
                </div>
              </li>
            ))}
          </ul>
          <p className="note">{t('estimate')} : {lang === 'en'
            ? 'cost is prorated to the quantity used, with approximate weight conversions. Regular prices: '
            : 'le coût est calculé au prorata de la quantité utilisée, avec des conversions de poids approximatives. Prix courants : '}
            {meta.baseline?.source ? <a href={meta.baseline.url} target="_blank" rel="noopener noreferrer">{meta.baseline.source} ({meta.baseline.refDate})</a> : '—'}.
          </p>
        </section>

        <aside className="rside">
          <div className="nutri">
            <h2>{t('nutrition')}{m?.calc ? <small className="calc"> {t('calcShort')}</small> : null}</h2>
            {m ? (
              <>
                <MacroRing m={m} k={k} />
                <p className="note">{m.calc ? t('nutritionCalc') : k !== 1 ? t('nutritionMealNote') : t('nutritionNote')}{!m.calc && k === 1 && m.serving ? ` (${m.serving})` : ''}</p>
              </>
            ) : <p className="note">{t('noNutrition')}</p>}
          </div>
        </aside>
      </div>
    </article>
  );
}
