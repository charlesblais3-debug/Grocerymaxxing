import React, { useEffect, useState } from 'react';
import { useApp } from './store.jsx';
import { Img, CostTag, MacroRing, Store, Icon, DealBadge, MemberBadge, Sparkline, STORE_DOT, offerText, mealScale, offerName, unitText, savingPct } from './ui.jsx';
import { MEAL_TYPES, CUISINES } from '../shared/taxonomy.js';
import { ING_BY_ID } from '../shared/ingredients.js';
import { L } from './i18n.js';
import { batchesFor } from '../shared/planner.js';
import { complete, costRecipe } from '../shared/cost.js';

export default function Recipe({ id }) {
  const { byId, costs, t, lang, fmt, sourceName, plan, setBatches, meta, have: pantry, togglePantry, people } = useApp();
  const [have, setHave] = useState({});
  const [batch, setBatch] = useState(null);
  // Ticks and the batch stepper belong to one recipe: start fresh on another.
  useEffect(() => { setHave({}); setBatch(null); }, [id]);
  const r = byId.get(id);
  if (!r) return <div className="state">404</div>;
  const c = costs.get(id);
  const m = r.macros;
  const lk = lang === 'en' ? 'en' : 'fr';
  const tags = [...r.tax.meals.map((x) => MEAL_TYPES.find((y) => y[0] === x)), ...r.tax.cuisines.map((x) => CUISINES.find((y) => y[0] === x))].filter(Boolean);
  // Macros are per serving, or per meal when the source gives no serving count.
  const ppd = m?.protein != null && (r.servings || r.meals) && c.total && c.coverage >= 0.75 ? (m.protein * (r.servings || r.meals)) / c.total : null;
  const k = mealScale(r);
  const adjusted = r.meals && r.mealBasis !== 'source';
  const b = batch ?? plan[id] ?? batchesFor(r, people);
  const num = (x) => String(x).replace('.', lang === 'en' ? '.' : ',');
  const date = (d) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' });
  const src = sourceName[r.source] || r.source;
  const validTo = c.lines.filter((l) => l.src === 'flyer' && l.offer.to).map((l) => l.offer.to).sort()[0];
  const pct = savingPct(c);
  return (
    <article className="wrap recipe">
      <a className="link back" href="#/" onClick={(e) => { if (window.history.length > 1) { e.preventDefault(); window.history.back(); } }}><Icon name="back" size={15} /> {t('back').replace(/^←\s*/, '')}</a>
      <header className="rhead">
        <Img src={r.image} alt="" className="hero" eager />
        <div className="rhead-text">
          <div className="kicker">{src}{r.author ? ` · ${r.author}` : ''}{r.rating ? <span>· <Icon name="star" size={13} /> {r.rating.value.toFixed(1)}{r.rating.count ? ` (${r.rating.count})` : ''}</span> : null}</div>
          <h1>{r.name}</h1>
          {tags.length > 0 && <div className="tags">{tags.map((x) => <span key={x[0]} className="tag">{L(lang, x)}</span>)}</div>}
          <div className="facts">
            {r.time ? <span><Icon name="clock" /> {r.time} {t('min')}</span> : null}
            {r.yield || r.servings ? <span><Icon name="users" /> {r.yield || `${r.servings} ${t('servings')}`}</span> : null}
            {r.steps ? <span><Icon name="list" /> {r.steps} {t('steps')}</span> : null}
          </div>
          <div className="costcard">
            <CostTag cost={c} big />
            {pct ? <span className="savepill lg">−{pct} % · {t('youSave')} {fmt(c.savings)}</span> : null}
            {c.total != null && <div className="sub">{t('total')} : ≈ {fmt(c.total)} · {c.priced}/{c.countable} {t('coverage')}{validTo ? ` · ${t('flyersUntil')} ${date(validTo)}` : ''} · <a href="#/a-propos">{t('howPriced')}</a></div>}
            {r.collection && <div className="warnbox">{t('collectionNote')}</div>}
            {c.total != null && !complete(c) && <div className="warnbox">{t('incomplete')} {[...new Set(c.lines.filter((l) => l.src === null).map((l) => (l.ing ? ING_BY_ID[l.ing][lk].toLowerCase() : l.raw.replace(/\s*\(.*$/, '').slice(0, 40))))].join(', ')}. {t('incompleteNote')}</div>}
            {adjusted && <div className="sub">{lang === 'en'
              ? `Counted as ${r.meals} meals (${r.mealBasis === 'kcal' ? 'about 550 kcal each, from the published nutrition' : 'about 350 g of food each'})${r.servings ? ` — the source says ${r.yield || r.servings + ' servings'}` : ''}.`
              : `Compté comme ${String(r.meals).replace('.', ',')} repas (${r.mealBasis === 'kcal' ? 'environ 550 kcal chacun, selon les valeurs publiées' : 'environ 350 g de nourriture chacun'})${r.servings ? ` — la source indique ${r.yield || r.servings + ' portions'}` : ''}.`}</div>}
            <ByStore r={r} />
            {c.total != null && (
              <div className="batch">
                <span className="stepper" aria-label={t('batches')}><button type="button" onClick={() => setBatch(Math.max(0.5, b - 0.5))} aria-label="−">−</button><b>{num(b)}×</b><button type="button" onClick={() => setBatch(b + 0.5)} aria-label="+">+</button></span>
                <span>{t('batchCost')} <b className="tnum">≈ {fmt(c.total * b)}</b>{r.meals || r.servings ? ` · ${num((r.meals || r.servings) * b)} ${r.meals ? t('mealsWord') : t('servings')}` : ''}</span>
              </div>
            )}
            <div className="actions">
              <a className="btn" href={r.url} target="_blank" rel="noopener noreferrer"><Icon name="book" /> {t('method')} {src} <Icon name="external" size={14} /></a>
              {plan[id] && batch != null && batch !== plan[id]
                ? <button type="button" className="btn primary" onClick={() => { setBatches(id, b); setBatch(null); }}>{t('updatePlan')} ({num(b)}×)</button>
                : <button type="button" className={`btn ${plan[id] ? 'on' : 'primary'}`} onClick={() => setBatches(id, plan[id] ? 0 : b)}>{plan[id] ? `✓ ${t('inPlan')} (${num(plan[id])}×)` : `+ ${t('addPlan')}`}</button>}
            </div>
            <p className="note">{t('methodNote')}</p>
          </div>
        </div>
      </header>

      <div className="rcols">
        <section className="ingcard">
          <h2>{t('ingredients')}</h2>
          <p className="note">{t('tickHave')}</p>
          <ul className="ings">
            {c.lines.map((l, i) => (
              <li key={i} className={`${l.src === 'flyer' ? 'sale' : ''} ${have[i] || l.src === 'have' ? 'have' : ''}`}>
                <label title={t('haveIt')}>
                  <input type="checkbox" checked={l.ing && !ING_BY_ID[l.ing].free ? pantry.has(l.ing) : !!have[i]} onChange={(e) => (l.ing && !ING_BY_ID[l.ing].free ? togglePantry(l.ing) : setHave({ ...have, [i]: e.target.checked }))} />
                  <span className="raw">{l.raw}</span>
                </label>
                <span className="num">{l.cost ? fmt(l.cost) : ['free', 'pantry', 'have', 'optional'].includes(l.src) ? '' : '—'}</span>
                <div className="src">
                  {l.src === 'flyer' && (
                    <span className="offer">
                      <Store id={l.offer.store} /> <DealBadge offer={l.offer} /> <MemberBadge item={l.offer} /> {offerName(l.offer, lang)} — <b>{offerText(l.offer, fmt)}</b>
                      {l.offer.to ? <small> · {t('until')} {date(l.offer.to)}</small> : null}
                      {l.via ? <small> · ≈ {ING_BY_ID[l.via][lk]}</small> : null}
                      {' '}<Sparkline pk={l.offer.pk} now={l.offer.perG} />
                    </span>
                  )}
                  {l.src === 'base' && <span className="base">{t(l.ref?.kind === 'statcan' ? 'refStatcan' : l.ref?.kind === 'shelf' ? 'refShelf' : l.ref?.kind === 'flyer-regular' ? 'refFlyerRegular' : 'refFlyer')} · {unitText(l.cost / l.g, fmt, l.ing)}</span>}
                  {l.src == null && <span className="none">{l.odd ? t('oddQty') : t('notPriced')}</span>}
                  {l.src === 'pantry' && <span className="none">{t('pantryItem')}</span>}
                  {l.src === 'optional' && <span className="none">{t('optionalItem')}</span>}
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
            <div className="nutri-head">
              <h2>{t('nutrition')}{m?.calc ? <small className="calc"> {t('calcShort')}</small> : null}</h2>
              {ppd != null && <span className="ppdpill">{num(ppd.toFixed(1))} {t('ppdShort')}</span>}
            </div>
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

/** The same recipe priced at each store this week, as bars (only when every store prices it fully). */
function ByStore({ r }) {
  const { storeOffers, baseline, have, selected, pickStore, fmt, t, storeName } = useApp();
  const rows = [...storeOffers].map(([id, offers]) => [id, costRecipe(r, offers, baseline, have)]);
  if (rows.length < 2 || !rows.every(([, c]) => complete(c) && c.per != null)) return null;
  rows.sort((a, b) => a[1].per - b[1].per);
  const best = rows[0][1].per;
  const worst = rows[rows.length - 1][1].per;
  return (
    <div className="sbars" role="group" aria-label={t('atEachStore')}>
      <span>{t('atEachStore')}</span>
      {rows.map(([id, c]) => (
        <button key={id} type="button" className={`sbar ${selected.has(id) ? 'on' : ''} ${c.per <= best + 0.005 ? 'best' : ''}`} aria-pressed={selected.has(id)}
          onClick={() => pickStore(id, true)} title={t('shopHere')}>
          <span className="n"><i style={{ background: STORE_DOT[id] || 'var(--brand)' }} />{storeName[id] || id}</span>
          <span className="track"><span className="fill" style={{ width: `${Math.max(12, (c.per / (worst || 1)) * 100)}%` }} /></span>
          <span className="v">{fmt(c.per)}</span>
        </button>
      ))}
    </div>
  );
}
