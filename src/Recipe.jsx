import React from 'react';
import { useApp } from './store.jsx';
import { Img, CostTag, offerText, nice, mealScale } from './ui.jsx';
import { MEAL_TYPES, CUISINES } from '../shared/taxonomy.js';
import { ING_BY_ID } from '../shared/ingredients.js';
import { L } from './i18n.js';

export default function Recipe({ id }) {
  const { byId, costs, t, lang, fmt, sourceName, storeName, plan, setBatches, meta } = useApp();
  const r = byId.get(id);
  if (!r) return <div className="state">404</div>;
  const c = costs.get(id);
  const m = r.macros;
  const tags = [...r.tax.meals.map((x) => MEAL_TYPES.find((y) => y[0] === x)), ...r.tax.cuisines.map((x) => CUISINES.find((y) => y[0] === x))].filter(Boolean);
  const ppd = m?.protein != null && r.servings && c.total && c.coverage >= 0.75 ? (m.protein * r.servings) / c.total : null;
  const k = mealScale(r);
  const adjusted = r.meals && r.mealBasis !== 'source';
  const date = (d) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' });
  return (
    <article className="wrap recipe">
      <a className="link" href="#/" onClick={(e) => { if (window.history.length > 1) { e.preventDefault(); window.history.back(); } }}>{t('back')}</a>
      <header className="rhead">
        <Img src={r.image} alt="" className="hero" />
        <div>
          <div className="meta">{sourceName[r.source] || r.source}{r.author ? ` · ${r.author}` : ''}{r.rating ? ` · ★ ${r.rating.value.toFixed(1)}${r.rating.count ? ` (${r.rating.count})` : ''}` : ''}</div>
          <h1>{r.name}</h1>
          <div className="tags">{tags.map((x) => <span key={x[0]} className="tag">{L(lang, x)}</span>)}</div>
          <div className="facts">
            {r.time ? <span>⏱ {r.time} {t('min')}</span> : null}
            {r.yield || r.servings ? <span>🍽 {r.yield || `${r.servings} ${t('servings')}`}</span> : null}
            {r.steps ? <span>{r.steps} {t('steps')}</span> : null}
          </div>
          <div className="costbox">
            <div><CostTag cost={c} big recipe={r} /></div>
            {c.total != null && <div className="sub">{t('total')} : ≈ {fmt(c.total)} · {c.priced}/{c.countable} {t('coverage')}</div>}
            {adjusted && <div className="sub mealnote">{lang === 'en'
              ? `Counted as ${r.meals} meals (${r.mealBasis === 'kcal' ? 'about 550 kcal each, from the published nutrition' : 'about 450 g of food each'})${r.servings ? ` — the source says ${r.yield || r.servings + ' servings'}` : ''}.`
              : `Compté comme ${String(r.meals).replace('.', ',')} repas (${r.mealBasis === 'kcal' ? 'environ 550 kcal chacun, selon les valeurs publiées' : 'environ 450 g de nourriture chacun'})${r.servings ? ` — la source indique ${r.yield || r.servings + ' portions'}` : ''}.`}</div>}
            {c.savings > 0.05 && <div className="save">{t('savings')} : {fmt(c.savings)}</div>}
            {ppd != null && <div className="sub">{ppd.toFixed(1)} {t('proteinPerDollar')}</div>}
          </div>
          <div className="actions">
            <a className="btn primary" href={r.url} target="_blank" rel="noopener noreferrer">{t('method')} {sourceName[r.source] || r.source} ↗</a>
            <button type="button" className="btn" onClick={() => setBatches(id, plan[id] ? 0 : 1)}>{plan[id] ? `✓ ${t('inPlan')}` : `+ ${t('addPlan')}`}</button>
          </div>
          <p className="note">{t('methodNote')}</p>
        </div>
      </header>

      <div className="rcols">
        <section>
          <h2>{t('ingredients')}</h2>
          <table className="ings">
            <thead><tr><th>{t('ingredients')}</th><th>{t('priceUsed')}</th><th className="num">{t('ingredientCost')}</th></tr></thead>
            <tbody>
              {c.lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.raw}</td>
                  <td className="src">
                    {l.src === 'flyer' && (
                      <span className="offer">
                        <span className="store">{storeName[l.offer.store] || l.offer.store}</span> {nice(l.offer.name, lang)} — <b>{offerText(l.offer, fmt)}</b>
                        {l.offer.to ? <small> · {t('until')} {date(l.offer.to)}</small> : null}
                        {l.via ? <small> · ≈ {ING_BY_ID[l.via][lang === 'en' ? 'en' : 'fr']}</small> : null}
                      </span>
                    )}
                    {l.src === 'base' && <span className="base" title={t('regular')}>{t('regularShort')}</span>}
                    {l.src == null && <span className="none">{l.odd ? t('oddQty') : t('notPriced')}</span>}
                    {l.src === 'pantry' && <span className="none">{t('pantryItem')}</span>}
                  </td>
                  <td className="num">{l.cost ? fmt(l.cost) : l.src === 'free' || l.src === 'pantry' ? '' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note">{t('estimate')} : {lang === 'en'
            ? 'cost is prorated to the quantity used, with approximate weight conversions. Regular prices: '
            : 'le coût est calculé au prorata de la quantité utilisée, avec des conversions de poids approximatives. Prix courants : '}
            {meta.baseline?.source ? <a href={meta.baseline.url} target="_blank" rel="noopener noreferrer">{meta.baseline.source} ({meta.baseline.refDate})</a> : '—'}.
          </p>
        </section>
        <aside>
          <h2>{t('nutrition')}</h2>
          {m ? (
            <>
              <dl className="macros">
                <div className="k"><dt>{t('kcal')}</dt><dd>{Math.round(m.kcal * k)}</dd></div>
                {[['prot', m.protein, 'g'], ['carbs', m.carbs, 'g'], ['fat', m.fat, 'g'], ['fiber', m.fiber, 'g'], ['sodium', m.sodium, 'mg']].map(([k, v, u]) => v != null && (
                  <div key={k}><dt>{t(k)}</dt><dd>{Math.round(v * k * 10) / 10} {u}</dd></div>
                ))}
              </dl>
              <p className="note">{k !== 1 ? t('nutritionMealNote') : t('nutritionNote')}{k === 1 && m.serving ? ` (${m.serving})` : ''}</p>
            </>
          ) : <p className="note">{t('noNutrition')}</p>}
        </aside>
      </div>
    </article>
  );
}
