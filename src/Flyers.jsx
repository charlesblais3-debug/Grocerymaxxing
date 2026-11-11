import React, { useMemo, useState } from 'react';
import { useApp } from './store.jsx';
import { Img, Chip, offerText } from './ui.jsx';
import { AISLES, ING_BY_ID } from '../shared/ingredients.js';
import { deaccent } from '../shared/text.js';

export default function Flyers() {
  const { regionItems, selected, storeName, recipes, t, lang, fmt, flyers } = useApp();
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
    return regionItems
      .filter((i) => selected.has(i.store))
      .filter((i) => (!matched || i.ing) && (!aisle || ING_BY_ID[i.ing]?.cat === aisle))
      .filter((i) => !words.length || words.every((w) => deaccent(i.name + ' ' + (i.brand || '')).includes(w)))
      .sort((a, b) => (uses[b.ing] || 0) - (uses[a.ing] || 0) || a.name.localeCompare(b.name));
  }, [regionItems, selected, q, aisle, matched, uses]);

  if (!flyers.items.length) return <div className="state">{t('noData')}</div>;
  if (!regionItems.length) return <div className="state">{t('noFlyers')}</div>;
  const lk = lang === 'en' ? 'en' : 'fr';
  return (
    <div className="wrap flyers">
      <p className="note">{t('updated')} {new Date(flyers.fetchedAt).toLocaleDateString(lang === 'en' ? 'en-CA' : 'fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })} · {flyers.source}</p>
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
          <div className="card deal" key={i.flyer + i.id}>
            <div className="card-img"><Img src={i.img} alt="" /></div>
            <div className="card-body">
              <div className="meta"><span className="store">{storeName[i.store]}</span>{i.to ? ` · ${t('until')} ${i.to.slice(5)}` : ''}</div>
              <h3>{i.name}</h3>
              <div className="card-foot">
                <span className="cost">{offerText(i, fmt)}</span>
                {i.perG ? <span className="macro">{fmt(i.perG * 1000)}/kg{i.basis === 'each' ? ' ≈' : ''}</span> : null}
              </div>
              {i.story ? <div className="meta">{i.story}</div> : null}
              {i.ing && uses[i.ing] ? <a className="link" href={`#/?ing=${i.ing}`}>{uses[i.ing]} {t('recipesWith')} {ING_BY_ID[i.ing][lk].toLowerCase()} →</a> : null}
            </div>
          </div>
        ))}
      </div>
      {shown < list.length && <div className="morewrap"><button type="button" className="btn" onClick={() => setShown(shown + 120)}>{t('more')}</button></div>}
    </div>
  );
}
