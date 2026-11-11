import React, { useMemo } from 'react';
import { useApp } from './store.jsx';
import { RecipeCard, offerText, nice } from './ui.jsx';
import { buildIdeas } from '../shared/synergy.js';
import { ING_BY_ID } from '../shared/ingredients.js';

const kg = (g) => (g >= 1000 ? `${(g / 1000).toFixed(1).replace('.0', '')} kg` : `${Math.round(g / 10) * 10} g`);

export default function Ideas() {
  const { recipes, costs, offers, baseline, t, lang, fmt, storeName, plan, setBatches, selected } = useApp();
  const { anchors, bundles } = useMemo(() => buildIdeas(recipes, costs, offers, baseline), [recipes, costs, offers, baseline]);
  const lk = lang === 'en' ? 'en' : 'fr';
  const name = (id) => ING_BY_ID[id][lk];
  if (!recipes.length) return <div className="state">{t('noData')}</div>;
  if (!selected.size || !bundles.length) return <div className="state">{t('noIdeas')}</div>;
  return (
    <div className="wrap ideas">
      <header className="ideas-head">
        <h1>{t('ideasTitle')}</h1>
        <p className="note">{t('ideasIntro')}</p>
        <div className="anchors">
          {anchors.slice(0, 14).map((a) => (
            <a key={a.id} className="anchor" href={`#/?ing=${a.id}&sale=1`}>
              <b>{name(a.id)}</b>
              <span>{fmt(a.offer.perG * 1000)}/kg · {storeName[a.offer.store]}</span>
              {a.off ? <em>−{Math.round(a.off * 100)} %</em> : null}
            </a>
          ))}
        </div>
      </header>
      {bundles.map((b) => {
        const all = b.recipes.every((r) => plan[r.id]);
        return (
          <section className="bundle" key={b.anchor.id}>
            <div className="bundle-head">
              <div>
                <h2>{name(b.anchor.id)} <small>× {b.recipes.length} {t('differentMeals')}</small></h2>
                <div className="offer"><span className="store">{storeName[b.anchor.offer.store]}</span> {nice(b.anchor.offer.name, lang)} — <b>{offerText(b.anchor.offer, fmt)}</b>{b.anchor.off ? <em className="off"> −{Math.round(b.anchor.off * 100)} % {t('vsRegular')}</em> : null}</div>
              </div>
              <div className="bundle-stats">
                <div><small>{t('planTotal')}</small><b>≈ {fmt(b.total)}</b></div>
                {b.meals > 0 && <div><small>{String(b.meals).replace('.', lang === 'en' ? '.' : ',')} {t('mealsWord')}</small><b>≈ {fmt(b.total / b.meals)} {t('perMeal')}</b></div>}
                <button type="button" className={`btn ${all ? '' : 'primary'}`} onClick={() => b.recipes.forEach((r) => setBatches(r.id, all ? 0 : plan[r.id] || 1))}>{all ? `✓ ${t('inPlan')}` : `+ ${t('addAll')}`}</button>
              </div>
            </div>
            <ul className="shared">
              <li className="lbl">{t('sharedBuys')}</li>
              {b.shared.map((s) => (
                <li key={s.id}><b>{name(s.id)}</b>{s.grams ? ` ≈ ${kg(s.grams)}` : ''} · {s.count} {t('recipes').toLowerCase()} · <span className="store">{storeName[s.offer.store]}</span></li>
              ))}
            </ul>
            <div className="grid">{b.recipes.map((r) => <RecipeCard key={r.id} r={r} />)}</div>
          </section>
        );
      })}
    </div>
  );
}
