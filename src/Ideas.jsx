import React, { useEffect, useState } from 'react';
import { useApp } from './store.jsx';
import { batchesFor } from '../shared/planner.js';
import { RecipeCard, Store, Icon, offerText, offerName, unitText } from './ui.jsx';
import { ING_BY_ID } from '../shared/ingredients.js';

const LINK_COLORS = ['#0e5a43', '#c98a0b', '#c0392b', '#2f6fd0', '#8b5cf6'];
const kg = (g) => (g >= 1000 ? `${(g / 1000).toFixed(1).replace('.0', '')} kg` : `${Math.round(g / 10) * 10} g`);

export default function Ideas() {
  const { recipes, ideas, t, lang, fmt, storeName, selected } = useApp();
  const { anchors, bundles } = ideas;
  useEffect(() => {
    const a = new URLSearchParams(window.location.hash.split('?')[1] || '').get('a');
    if (a) document.getElementById('b-' + a)?.scrollIntoView({ block: 'start' });
  }, []);
  const lk = lang === 'en' ? 'en' : 'fr';
  if (!recipes.length) return <div className="state">{t('noData')}</div>;
  if (!selected.size || !bundles.length) return <div className="state">{t('noIdeas')}</div>;
  return (
    <div className="wrap ideas">
      <header className="ideas-hero">
        <h1>{t('ideasTitleA')} <em>{t('ideasTitleB')}</em></h1>
        <p className="note">{t('ideasIntro')}</p>
        <div className="anchors">
          {anchors.slice(0, 14).map((a) => (
            <a key={a.id} className="anchor" href={bundles.some((x) => x.anchor.id === a.id) ? `#/idees?a=${a.id}` : `#/?ing=${a.id}&sale=1`}
              onClick={(e) => { const el = document.getElementById('b-' + a.id); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }}>
              <Store id={a.offer.store} /> <b>{ING_BY_ID[a.id][lk]}</b>
              <span>{unitText(a.offer.perG, fmt, a.offer.ing, a.offer.basis)}</span>
              {a.off ? <span className="offpill">−{Math.round(a.off * 100)} %</span> : null}
            </a>
          ))}
        </div>
      </header>
      {bundles.map((b) => <BundleCard key={b.anchor.id} b={b} storeName={storeName} />)}
    </div>
  );
}

/**
 * One deal and the different recipes that reuse it. Pointing at (or tapping) a shared buy
 * lights up the recipes that use it and dims the others.
 */
function BundleCard({ b, storeName }) {
  const { costs, t, lang, fmt, plan, setBatches, people } = useApp();
  // Pointing at a shared buy previews it; a click (or a tap) pins it until clicked again.
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  const focusIng = hover ?? pinned;
  const lk = lang === 'en' ? 'en' : 'fr';
  const name = (id) => ING_BY_ID[id][lk];
  const all = b.recipes.every((r) => plan[r.id]);
  const shared = b.shared.slice(0, 5);
  const uses = (r, id) => costs.get(r.id).lines.some((l) => l.src === 'flyer' && (l.via || l.ing) === id);
  const focusProps = (id) => ({
    onMouseEnter: () => setHover(id), onMouseLeave: () => setHover(null), onFocus: () => setHover(id), onBlur: () => setHover(null),
    onClick: () => setPinned((p) => (p === id ? null : id)), 'aria-pressed': pinned === id,
  });
  return (
    <section className="bundle" id={`b-${b.anchor.id}`}>
      <div className="bundle-head">
        <div>
          <h2>{name(b.anchor.id)} <small>× {b.recipes.length} {t('differentMeals')}</small></h2>
          <div className="offer"><Store id={b.anchor.offer.store} /> {offerName(b.anchor.offer, lang)} — <b>{offerText(b.anchor.offer, fmt)}</b>{b.anchor.off ? <span className="offpill">−{Math.round(b.anchor.off * 100)} % {t('vsRegular')}</span> : null}</div>
        </div>
        <div className="bundle-stats">
          <div><small>{t('planTotal')}</small><b>≈ {fmt(b.total)}</b></div>
          {b.meals > 0 && <div><small>{String(b.meals).replace('.', lang === 'en' ? '.' : ',')} {t('mealsWord')}</small><b>≈ {fmt(b.total / b.meals)}</b></div>}
          <button type="button" className={`btn ${all ? 'on' : 'primary'}`} onClick={() => b.recipes.forEach((r) => setBatches(r.id, all ? 0 : plan[r.id] || batchesFor(r, people)))}>{all ? `✓ ${t('inPlan')}` : <><Icon name="plus" size={15} /> {t('addAll')}</>}</button>
        </div>
      </div>
      <div className="bundle-scroll">
        <div className="bundle-grid" style={{ '--n': b.recipes.length }}>
          {b.recipes.map((r) => <RecipeCard key={r.id} r={r} className={focusIng ? (uses(r, focusIng) ? 'synergy-hi' : 'synergy-dim') : ''} />)}
          {shared.map((sh, row) => {
            const used = b.recipes.map((r) => uses(r, sh.id));
            const first = used.indexOf(true);
            const last = used.lastIndexOf(true);
            return used.map((u, col) => (
              <div key={sh.id + col} style={{ '--c': LINK_COLORS[row % LINK_COLORS.length] }}
                className={`link-cell ${col < first || col > last ? 'none' : ''} ${col === first ? 'first' : ''} ${col === last ? 'last' : ''} ${!u ? 'gap' : ''}`}>
                <button type="button" className={`dot ${focusIng === sh.id ? 'on' : ''}`} title={`${name(sh.id)} · ${storeName[sh.offer.store]}`} {...focusProps(sh.id)}>{name(sh.id)}</button>
              </div>
            ));
          })}
        </div>
      </div>
      <div className="sharedstrip">
        <span>{t('sharedBuys')} :</span>
        {shared.map((sh) => <button key={sh.id} type="button" className={`chip ${focusIng === sh.id ? 'on' : ''}`} {...focusProps(sh.id)}>{name(sh.id)}{sh.grams ? ` ≈ ${kg(sh.grams)}` : ''} · {storeName[sh.offer.store]}</button>)}
      </div>
    </section>
  );
}
