import React, { useEffect } from 'react';
import { useApp } from './store.jsx';
import { RecipeCard, Store, offerText, nice } from './ui.jsx';
import { ING_BY_ID } from '../shared/ingredients.js';

const LINK_COLORS = ['#15803d', '#e0a100', '#c75b39', '#2f6fd0', '#8b5cf6'];
const kg = (g) => (g >= 1000 ? `${(g / 1000).toFixed(1).replace('.0', '')} kg` : `${Math.round(g / 10) * 10} g`);

export default function Ideas() {
  const { recipes, ideas, costs, t, lang, fmt, storeName, plan, setBatches, selected } = useApp();
  const { anchors, bundles } = ideas;
  useEffect(() => {
    const a = new URLSearchParams(window.location.hash.split('?')[1] || '').get('a');
    if (a) document.getElementById('b-' + a)?.scrollIntoView({ block: 'start' });
  }, []);
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
          <section className="bundle" key={b.anchor.id} id={`b-${b.anchor.id}`}>
            <div className="bundle-head">
              <div>
                <h2>{name(b.anchor.id)} <small>× {b.recipes.length} {t('differentMeals')}</small></h2>
                <div className="offer"><Store id={b.anchor.offer.store} /> {nice(b.anchor.offer.name, lang)} — <b>{offerText(b.anchor.offer, fmt)}</b>{b.anchor.off ? <em className="off"> −{Math.round(b.anchor.off * 100)} % {t('vsRegular')}</em> : null}</div>
              </div>
              <div className="bundle-stats">
                <div><small>{t('planTotal')}</small><b>≈ {fmt(b.total)}</b></div>
                {b.meals > 0 && <div><small>{String(b.meals).replace('.', lang === 'en' ? '.' : ',')} {t('mealsWord')}</small><b>≈ {fmt(b.total / b.meals)} {t('perMeal')}</b></div>}
                <button type="button" className={`btn ${all ? '' : 'primary'}`} onClick={() => b.recipes.forEach((r) => setBatches(r.id, all ? 0 : plan[r.id] || 1))}>{all ? `✓ ${t('inPlan')}` : `+ ${t('addAll')}`}</button>
              </div>
            </div>
            <div className="bundle-scroll">
              <div className="bundle-grid" style={{ '--n': b.recipes.length }}>
                {b.recipes.map((r) => <RecipeCard key={r.id} r={r} />)}
                {b.shared.slice(0, 5).map((sh, row) => {
                  const uses = b.recipes.map((r) => costs.get(r.id).lines.some((l) => l.src === 'flyer' && (l.via || l.ing) === sh.id));
                  const first = uses.indexOf(true);
                  const last = uses.lastIndexOf(true);
                  return uses.map((u, col) => (
                    <div key={sh.id + col} style={{ '--c': LINK_COLORS[row % LINK_COLORS.length] }}
                      className={`link-cell ${col < first || col > last ? 'none' : ''} ${col === first ? 'first' : ''} ${col === last ? 'last' : ''} ${!u ? 'gap' : ''}`}>
                      <span className="dot" title={`${name(sh.id)} · ${storeName[sh.offer.store]}`}>{name(sh.id)}</span>
                    </div>
                  ));
                })}
              </div>
            </div>
            <p className="note">{t('sharedBuys')} : {b.shared.slice(0, 5).map((sh) => `${name(sh.id)}${sh.grams ? ` ≈ ${kg(sh.grams)}` : ''} (${storeName[sh.offer.store]})`).join(' · ')}</p>
          </section>
        );
      })}
    </div>
  );
}
