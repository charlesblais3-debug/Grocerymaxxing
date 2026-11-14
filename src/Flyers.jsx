import React, { useMemo, useState } from 'react';
import { useApp } from './store.jsx';
import { Img, Chip, Store, IngredientPicker, DealBadge, Score, offerText, nice } from './ui.jsx';
import { AISLES, ING_BY_ID } from '../shared/ingredients.js';
import { deaccent } from '../shared/text.js';
import { bestFor } from '../shared/cost.js';
import { pkLabel } from '../shared/match.js';
import { topDeals, DEAL_SECTIONS } from '../shared/deals.js';

export default function Flyers() {
  const { regionItems, selected, storeName, recipes, t, lang, fmt, flyers, guide, pickStore, favs, toggleFav, offers, regionStores, baseline } = useApp();
  const [q, setQ] = useState('');
  const [aisle, setAisle] = useState('');
  const [matched, setMatched] = useState(true);
  const [shown, setShown] = useState(120);

  const uses = useMemo(() => {
    const m = {};
    for (const r of recipes) for (const id of new Set(r.ings.map((l) => l.ing).filter(Boolean))) {
      m[id] = (m[id] || 0) + 1;
      const fb = ING_BY_ID[id]?.fb;
      if (fb) m[fb] = (m[fb] || 0) + 1;
    }
    return m;
  }, [recipes]);

  const list = useMemo(() => {
    const words = deaccent(q).split(/\s+/).filter(Boolean);
    const seen = new Set();
    const rows = regionItems
      .filter((i) => selected.has(i.store))
      .filter((i) => (!matched || i.ing) && (!aisle || ING_BY_ID[i.ing]?.cat === aisle))
      .filter((i) => !words.length || words.every((w) => deaccent(i.name + ' ' + (i.brand || '')).includes(w)))
      .filter((i) => { const k = `${i.store}|${i.name}|${i.price}`; if (seen.has(k)) return false; seen.add(k); return true; });
    // Best price of each ingredient first (most-used ingredients leading), then the runners-up.
    const byIng = {};
    for (const i of rows) (byIng[i.ing || ''] ||= []).push(i);
    const rank = new Map();
    for (const l of Object.values(byIng)) l.sort((a, b) => (a.perG ?? 9) - (b.perG ?? 9)).forEach((i, n) => rank.set(i, n));
    return rows.sort((a, b) => (a.ing ? rank.get(a) : 99) - (b.ing ? rank.get(b) : 99) || (uses[b.ing] || 0) - (uses[a.ing] || 0) || a.name.localeCompare(b.name));
  }, [regionItems, selected, q, aisle, matched, uses]);

  if (!flyers.items.length) return <div className="state">{t('noData')}</div>;
  const lk = lang === 'en' ? 'en' : 'fr';
  if (!regionItems.length) return <div className="state">{t('noFlyers')}</div>;
  return (
    <div className="wrap flyers">
      <p className="note">{t('updated')} {new Date(flyers.fetchedAt).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })} · {flyers.source}</p>
      <TopDeals items={regionItems} stores={regionStores} baseline={baseline} uses={uses} />
      <section className="guide" aria-label={t('guideTitle')}>
        <h1>{t('guideTitle')}</h1>
        <p className="note">{t('guideIntro')} {t('scoreIntro')}</p>
        <div className="guide-grid">
          {guide.map((s, n) => (
            <article key={s.id} className={`guide-card ${selected.has(s.id) ? 'on' : ''}`}>
              <header>
                <Store id={s.id} />
                {n === 0 && s.score > 0 ? <span className="best">★ {t('bestOverall')}</span> : s.strong ? <span className="strong">{t('strong_' + s.strong)}</span> : null}
              </header>
              {n === 0 && s.strong ? <div className="strong">{t('strong_' + s.strong)}</div> : null}
              {s.wins.length ? (
                <ul>
                  {s.wins.slice(0, 4).map((w) => (
                    <li key={w.pk}>
                      <b>{pkLabel(w.pk, lang)}</b> <Score offer={w.offer} /> <span className="p">{fmt(w.offer.perG * 1000)}/kg</span>
                      <small>{w.only ? t('onlyFlyer') : `${Math.round(w.margin * 100)} % ${t('cheaperThanNext')}`}{w.off ? ` · −${Math.round(w.off * 100)} % ${t('vsRegular')}` : ''}</small>
                    </li>
                  ))}
                </ul>
              ) : <p className="note">{t('noClearWin')}</p>}
              <footer>
                <small>{s.deals} {t('recipeDeals')}</small>
                {selected.has(s.id) && selected.size === 1 ? <span className="meta">✓ {t('current')}</span> : <button type="button" className="btn" onClick={() => pickStore(s.id, true)}>{t('shopHere')}</button>}
              </footer>
            </article>
          ))}
        </div>
      </section>
      <section className="favs">
        <h2>★ {t('favsTitle')}</h2>
        <p className="note">{t('favsIntro')}</p>
        <IngredientPicker exclude={favs} onPick={toggleFav} placeholder={t('addIngredient')} />
        <ul className="favlist">
          {favs.map((id) => {
            const o = bestFor(offers, id);
            return ING_BY_ID[id] && (
              <li key={id} className={o ? 'on' : ''}>
                <b>{ING_BY_ID[id][lk]}</b>
                {o ? <span><Store id={o.store} /> {fmt(o.perG * 1000)}/kg <DealBadge offer={o} /> <a className="link" href={`#/?ing=${id}&sale=1`}>{t('recipes')} →</a></span> : <span className="meta">{t('notOnSale')}</span>}
                <button type="button" className="link" onClick={() => toggleFav(id)} aria-label={t('remove')}>×</button>
              </li>
            );
          })}
        </ul>
      </section>
      <div className="flybar">
        <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setShown(120); }} placeholder={t('flyerSearch')} aria-label={t('flyerSearch')} />
        <label className="check"><input type="checkbox" checked={matched} onChange={(e) => setMatched(e.target.checked)} /> {t('matchedOnly')}</label>
      </div>
      <div className="mealbar">
        <Chip on={!aisle} onClick={() => setAisle('')}>{t('all')}</Chip>
        {Object.entries(AISLES).map(([id, a]) => <Chip key={id} on={aisle === id} onClick={() => { setAisle(aisle === id ? '' : id); setMatched(true); }}>{a[lk]}</Chip>)}
      </div>
      <div className="listhead"><span><b>{list.length}</b></span></div>
      <div className="grid deals">
        {list.slice(0, shown).map((i) => (
          <div className="card deal" key={i.id}>
            <div className="card-img"><Img src={i.img} alt="" /></div>
            <div className="card-body">
              <div className="meta"><Store id={i.store} />{i.to ? ` · ${t('until')} ${new Date(i.to + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' })}` : ''}</div>
              <h3>{nice(i.name, lang)}</h3>
              {i.pg ? <DealBadge offer={{ ...i, perG: i.perG }} /> : null}
              <div className="card-foot">
                <span className="cost">{offerText(i, fmt)}</span>
                {i.perG ? <span className="macro">{fmt(i.perG * 100)}/100 g{i.basis === 'each' ? ' ≈' : ''}</span> : null}
                {i.pg ? <Score offer={i} /> : null}
              </div>
              {i.story ? <div className="meta">{i.story}</div> : null}
              {i.ing && !favs.includes(i.ing) ? <button type="button" className="link" onClick={() => toggleFav(i.ing)}>☆ {t('watch')} {ING_BY_ID[i.ing][lk].toLowerCase()}</button> : null}
              {(i.ings || (i.ing ? [i.ing] : [])).filter((g) => uses[g]).map((g) => <a key={g} className="link" href={`#/?ing=${g}`}>{uses[g]} {t('recipesWith')} {ING_BY_ID[g][lk].toLowerCase()} →</a>)}
            </div>
          </div>
        ))}
      </div>
      {shown < list.length && <div className="morewrap"><button type="button" className="btn" onClick={() => setShown(shown + 120)}>{t('more')}</button></div>}
    </div>
  );
}

/** Biggest discounts this week, across all stores or the ones picked, by shopping section. */
function TopDeals({ items, stores, baseline, uses }) {
  const { t, lang, fmt, storeName } = useApp();
  const [pick, setPick] = useState([]); // empty = every store
  const [section, setSection] = useState('');
  const [shown, setShown] = useState(12);
  const lk = lang === 'en' ? 2 : 1;
  const scope = useMemo(() => new Set(pick.length ? pick : stores.map((s) => s.id)), [pick, stores]);
  const deals = useMemo(() => topDeals(items, { stores: scope, section, baseline }), [items, scope, section, baseline]);
  const toggle = (id) => { setShown(12); setPick(pick.includes(id) ? pick.filter((x) => x !== id) : [...pick, id]); };
  const date = (d) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' });
  return (
    <section className="topdeals" aria-label={t('topDealsTitle')}>
      <h1>{t('topDealsTitle')}</h1>
      <p className="note">{t('topDealsIntro')}</p>
      <div className="mealbar" role="group" aria-label={t('stores')}>
        <Chip on={!pick.length} onClick={() => { setPick([]); setShown(12); }}>{t('allStores')}</Chip>
        {stores.map((s) => <Chip key={s.id} on={pick.includes(s.id)} onClick={() => toggle(s.id)}>{storeName[s.id] || s.id}</Chip>)}
      </div>
      <div className="mealbar" role="group" aria-label={t('sections')}>
        <Chip on={!section} onClick={() => { setSection(''); setShown(12); }}>{t('all')}</Chip>
        {DEAL_SECTIONS.map((x) => <Chip key={x[0]} on={section === x[0]} onClick={() => { setSection(section === x[0] ? '' : x[0]); setShown(12); }}>{x[lk]}</Chip>)}
      </div>
      {deals.length ? (
        <div className="grid deals">
          {deals.slice(0, shown).map(({ item: i, pk, ing, off, perG, ref }) => (
            <div className="card deal" key={`${i.store}|${i.id}`}>
              <div className="card-img"><Img src={i.img} alt="" /><span className="off-flag">−{Math.round(off * 100)} %</span></div>
              <div className="card-body">
                <div className="meta"><Store id={i.store} />{i.to ? ` · ${t('until')} ${date(i.to)}` : ''}</div>
                <h3>{nice(i.name, lang)}</h3>
                <div className="card-foot"><span className="cost">{offerText(i, fmt)}</span></div>
                <div className="meta">{fmt(perG * 1000)}/kg · {t('usually')} {fmt(ref * 1000)}/kg ({pkLabel(pk, lang).toLowerCase()})</div>
                {uses[ing] ? <a className="link" href={`#/?ing=${ing}&sale=1`}>{uses[ing]} {t('recipesWith')} {ING_BY_ID[ing][lang === 'en' ? 'en' : 'fr'].toLowerCase()} →</a> : null}
              </div>
            </div>
          ))}
        </div>
      ) : <p className="note">{t('noTopDeals')}</p>}
      {shown < deals.length && <div className="morewrap"><button type="button" className="btn" onClick={() => setShown(shown + 12)}>{t('more')}</button></div>}
    </section>
  );
}

