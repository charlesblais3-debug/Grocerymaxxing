import React, { useMemo, useState } from 'react';
import { useApp, useRoute } from './store.jsx';
import { Img, Chip, Store, Icon, IngredientPicker, DealBadge, Score, offerText, nice, unitText, MemberBadge, Sparkline } from './ui.jsx';
import { AISLES, ING_BY_ID } from '../shared/ingredients.js';
import { deaccent } from '../shared/text.js';
import { bestFor } from '../shared/cost.js';
import { pkLabel } from '../shared/match.js';
import { topDeals, DEAL_SECTIONS } from '../shared/deals.js';

const TABS = ['guide', 'deals', 'all'];

export default function Flyers() {
  const { regionItems, recipes, t, lang, flyers } = useApp();
  const { query } = useRoute();
  // ?tab=guide|deals|all; the store match comes first.
  const tab = TABS.includes(query.get('tab')) ? query.get('tab') : 'guide';
  const setTab = (id) => { window.history.replaceState(null, '', `#/circulaires?tab=${id}`); window.dispatchEvent(new HashChangeEvent('hashchange')); };

  const uses = useMemo(() => {
    const m = {};
    for (const r of recipes) for (const id of new Set(r.ings.map((l) => l.ing).filter(Boolean))) {
      m[id] = (m[id] || 0) + 1;
      const fb = ING_BY_ID[id]?.fb;
      if (fb) m[fb] = (m[fb] || 0) + 1;
    }
    return m;
  }, [recipes]);

  if (!flyers.items.length) return <div className="state">{t('noData')}</div>;
  if (!regionItems.length) return <div className="state">{t('noFlyers')}</div>;
  const labels = { guide: t('storeMatch'), deals: t('topDealsTab'), all: t('allDeals') };
  return (
    <div className="wrap flyers">
      <header className="fly-head">
        <h1>{t('flyersTitleA')} <em>{t('flyersTitleB')}</em></h1>
        <p className="note">{t('updated')} {new Date(flyers.fetchedAt).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })} · {flyers.source}</p>
      </header>
      <div className="tabs" role="tablist" aria-label={t('flyers')}>
        {TABS.map((id) => <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} className="tab" onClick={() => setTab(id)}>{labels[id]}</button>)}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'guide' && <Guide />}
        {tab === 'deals' && <TopDeals uses={uses} />}
        {tab === 'all' && <AllDeals uses={uses} />}
      </div>
    </div>
  );
}

/** Which store is best for what this week: the winner in full, the others side by side. */
function Guide() {
  const { guide, selected, pickStore, t, lang, fmt, storeName } = useApp();
  const [winner, ...rest] = guide;
  const showWinner = winner && winner.score > 0;
  const wins = (s, n = 4) => s.wins.slice(0, n);
  return (
    <section aria-label={t('guideTitle')}>
      <p className="note">{t('guideIntro')} {t('scoreIntro')}</p>
      {showWinner && (
        <article className="winner">
          <div className="winner-head">
            <div>
              <span className="kick"><Icon name="star" size={13} /> {t('bestOverall')}</span>
              <h2>{storeName[winner.id] || winner.id}{winner.strong ? <> · <em>{t('strong_' + winner.strong).toLowerCase()}</em></> : null}</h2>
            </div>
            {selected.has(winner.id) && selected.size === 1 ? <span className="meta">✓ {t('current')}</span> : <button type="button" className="btn primary" onClick={() => pickStore(winner.id, true)}>{t('shopHere')}</button>}
          </div>
          {winner.wins.length ? (
            <div className="winner-grid">
              {wins(winner).map((w) => (
                <div className="wintile" key={w.pk}>
                  <div className="top-row"><Score offer={w.offer} /><Sparkline pk={w.pk} now={w.offer.perG} /></div>
                  <b>{pkLabel(w.pk, lang)}</b>
                  <span className="p">{unitText(w.offer.perG, fmt, w.offer.ing, w.offer.basis)}</span>
                  <small>{w.only ? t('onlyFlyer') : `${Math.round(w.margin * 100)} % ${t('cheaperThanNext')}`}{w.off ? ` · −${Math.round(w.off * 100)} %` : ''}</small>
                </div>
              ))}
            </div>
          ) : <p className="note">{t('noClearWin')}</p>}
          <small className="meta">{winner.deals} {t('recipeDeals')}</small>
        </article>
      )}
      <div className="guide-grid">
        {(showWinner ? rest : guide).map((s) => (
          <article key={s.id} className={`guide-card ${selected.has(s.id) ? 'on' : ''}`}>
            <header><Store id={s.id} />{s.strong ? <span className="strong">{t('strong_' + s.strong)}</span> : null}</header>
            {s.wins.length ? (
              <ul>
                {wins(s).map((w) => (
                  <li key={w.pk}>
                    <b>{pkLabel(w.pk, lang)} <Score offer={w.offer} /></b> <span className="p">{unitText(w.offer.perG, fmt, w.offer.ing, w.offer.basis)}</span>
                    <small>{w.only ? t('onlyFlyer') : `${Math.round(w.margin * 100)} % ${t('cheaperThanNext')}`}{w.off ? ` · −${Math.round(w.off * 100)} % ${t('vsRegular')}` : ''}</small>
                  </li>
                ))}
              </ul>
            ) : <p className="note">{t('noClearWin')}</p>}
            <footer>
              <small>{s.deals} {t('recipeDeals')}</small>
              {selected.has(s.id) && selected.size === 1 ? <span className="meta">✓ {t('current')}</span> : <button type="button" className="btn sm" onClick={() => pickStore(s.id, true)}>{t('shopHere')}</button>}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Add a flyer product to the grocery list (kept even after the flyer ends). */
function AddToList({ item }) {
  const { extras, toggleExtra, t } = useApp();
  const on = extras.some((e) => e.id === item.id);
  return <button type="button" className={`btn sm addlist ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleExtra(item)}>{on ? <><Icon name="check" size={14} /> {t('inList')}</> : <><Icon name="plus" size={14} /> {t('addToList')}</>}</button>;
}

/** Biggest discounts this week, across the stores picked in the header, all stores or a few. */
function TopDeals({ uses }) {
  const { regionItems, regionStores, baseline, t, lang, fmt, storeName, selected } = useApp();
  // 'mine' follows the stores picked in the header; 'all' is every store of the region;
  // otherwise the stores picked here.
  const [mode, setMode] = useState('mine');
  const [pick, setPick] = useState([]);
  const [section, setSection] = useState('');
  const [shown, setShown] = useState(12);
  const lk = lang === 'en' ? 2 : 1;
  const scope = useMemo(() => (mode === 'mine' ? selected : mode === 'all' || !pick.length ? new Set(regionStores.map((s) => s.id)) : new Set(pick)), [mode, pick, regionStores, selected]);
  const deals = useMemo(() => topDeals(regionItems, { stores: scope, section, baseline }), [regionItems, scope, section, baseline]);
  const toggle = (id) => { setShown(12); setMode('pick'); const base = mode === 'pick' ? pick : []; setPick(base.includes(id) ? base.filter((x) => x !== id) : [...base, id]); };
  const date = (d) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' });
  return (
    <section className="topdeals" aria-label={t('topDealsTitle')}>
      <p className="note">{t('topDealsIntro')}</p>
      <div className="chips" role="group" aria-label={t('stores')}>
        <Chip on={mode === 'mine'} onClick={() => { setMode('mine'); setShown(12); }}>{t('myStores')}</Chip>
        <Chip on={mode === 'all'} onClick={() => { setMode('all'); setShown(12); }}>{t('allStores')}</Chip>
        {regionStores.map((s) => <Chip key={s.id} on={mode === 'pick' && pick.includes(s.id)} onClick={() => toggle(s.id)}>{storeName[s.id] || s.id}</Chip>)}
      </div>
      <div className="chips" role="group" aria-label={t('sections')}>
        <Chip on={!section} onClick={() => { setSection(''); setShown(12); }}>{t('all')}</Chip>
        {DEAL_SECTIONS.map((x) => <Chip key={x[0]} on={section === x[0]} onClick={() => { setSection(section === x[0] ? '' : x[0]); setShown(12); }}>{x[lk]}</Chip>)}
      </div>
      {deals.length ? (
        <div className="grid deals">
          {deals.slice(0, shown).map(({ item: i, pk, ing, off, perG, ref }) => (
            <article className="card deal" key={`${i.store}|${i.id}`}>
              <div className="card-img"><Img src={i.img} alt="" /><span className="off-flag">−{Math.round(off * 100)} %</span></div>
              <div className="card-body">
                <div className="kicker"><Store id={i.store} />{i.to ? <span>{t('until')} {date(i.to)}</span> : null}<MemberBadge item={i} /></div>
                <h3>{nice(i.name, lang)}</h3>
                <div className="deal-price"><span className="cost">{offerText(i, fmt)}</span><Sparkline pk={pk} now={perG} /></div>
                <div className="u">{unitText(perG, fmt, ing, i.basis)} · {t('usually')} {unitText(ref, fmt, ing)} ({pkLabel(pk, lang).toLowerCase()})</div>
                {/* "On sale" only when that store is one of the visitor's: otherwise the list would be empty. */}
                {uses[ing] ? <a className="link" href={`#/?ing=${ing}${selected.has(i.store) ? '&sale=1' : ''}`}>{uses[ing]} {t('recipesWith')} {ING_BY_ID[ing][lang === 'en' ? 'en' : 'fr'].toLowerCase()} →</a> : null}
                <AddToList item={i} />
              </div>
            </article>
          ))}
        </div>
      ) : <p className="note">{t('noTopDeals')}</p>}
      {shown < deals.length && <div className="morewrap"><button type="button" className="btn" onClick={() => setShown(shown + 12)}>{t('more')}</button></div>}
    </section>
  );
}

/** Every flyer product of the chosen stores, searchable, with the ingredients being watched. */
function AllDeals({ uses }) {
  const { regionItems, selected, t, lang, fmt, favs, toggleFav, offers, noMember, setNoMember } = useApp();
  const [q, setQ] = useState('');
  const [aisle, setAisle] = useState('');
  const [matched, setMatched] = useState(true);
  const [shown, setShown] = useState(120);
  const lk = lang === 'en' ? 'en' : 'fr';
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
  const date = (d) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' });
  return (
    <section>
      <details className="watch" open={favs.length > 0}>
        <summary><Icon name="star" size={16} /> {t('favsTitle')}{favs.length ? ` (${favs.length})` : ''}</summary>
        <p className="note">{t('favsIntro')}</p>
        <IngredientPicker exclude={favs} onPick={toggleFav} placeholder={t('addIngredient')} />
        <ul className="favlist">
          {favs.map((id) => {
            const o = bestFor(offers, id);
            return ING_BY_ID[id] && (
              <li key={id} className={o ? 'on' : ''}>
                <b>{ING_BY_ID[id][lk]}</b>
                {o ? <span><Store id={o.store} /> {unitText(o.perG, fmt, o.ing, o.basis)} <DealBadge offer={o} /> <a className="link" href={`#/?ing=${id}&sale=1`}>{t('recipes')} →</a></span> : <span className="meta">{t('notOnSale')}</span>}
                <button type="button" className="x" onClick={() => toggleFav(id)} aria-label={t('remove')}><Icon name="x" size={14} /></button>
              </li>
            );
          })}
        </ul>
      </details>
      <div className="flybar">
        <div className="searchbox">
          <Icon name="search" size={17} />
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setShown(120); }} placeholder={t('flyerSearch')} aria-label={t('flyerSearch')} />
          {q ? <button type="button" className="clear" onClick={() => setQ('')} aria-label={t('clearSearch')}><Icon name="x" size={15} /></button> : null}
        </div>
        <label className="check"><input type="checkbox" checked={matched} onChange={(e) => setMatched(e.target.checked)} /> {t('matchedOnly')}</label>
        <label className="check" title={t('memberPriceTitle')}><input type="checkbox" checked={noMember} onChange={(e) => setNoMember(e.target.checked)} /> {t('excludeMember')}</label>
      </div>
      <div className="chips">
        <Chip on={!aisle} onClick={() => setAisle('')}>{t('all')}</Chip>
        {Object.entries(AISLES).map(([id, a]) => <Chip key={id} on={aisle === id} onClick={() => { setAisle(aisle === id ? '' : id); setMatched(true); }}>{a[lk]}</Chip>)}
      </div>
      <p className="meta"><b className="tnum">{list.length}</b> {t('products')}</p>
      <div className="grid deals">
        {list.slice(0, shown).map((i) => (
          <article className="card deal" key={i.id}>
            <div className="card-img"><Img src={i.img} alt="" /></div>
            <div className="card-body">
              <div className="kicker"><Store id={i.store} />{i.to ? <span>{t('until')} {date(i.to)}</span> : null}<MemberBadge item={i} /></div>
              <h3>{nice(i.name, lang)}</h3>
              {i.pg ? <div><DealBadge offer={{ ...i, perG: i.perG }} /></div> : null}
              <div className="deal-price"><span className="cost">{offerText(i, fmt)}</span>{i.pg ? <Score offer={i} /> : null}</div>
              {i.perG ? <div className="u">{unitText(i.perG, fmt, i.ing, i.basis)} {i.pk ? <Sparkline pk={i.pk} now={i.perG} /> : null}</div> : null}
              {i.story ? <div className="meta">{i.story}</div> : null}
              {i.ing && !favs.includes(i.ing) ? <button type="button" className="link" onClick={() => toggleFav(i.ing)}>☆ {t('watch')} {ING_BY_ID[i.ing][lk].toLowerCase()}</button> : null}
              {(i.ings || (i.ing ? [i.ing] : [])).filter((g) => uses[g]).map((g) => <a key={g} className="link" href={`#/?ing=${g}`}>{uses[g]} {t('recipesWith')} {ING_BY_ID[g][lk].toLowerCase()} →</a>)}
              <AddToList item={i} />
            </div>
          </article>
        ))}
      </div>
      {shown < list.length && <div className="morewrap"><button type="button" className="btn" onClick={() => setShown(shown + 120)}>{t('more')}</button></div>}
    </section>
  );
}
