import React, { useEffect } from 'react';
import { AppProvider, useApp, useRoute } from './store.jsx';
import { StoreBar } from './ui.jsx';
import Browse from './Browse.jsx';
import Recipe from './Recipe.jsx';
import Flyers from './Flyers.jsx';
import Plan from './Plan.jsx';
import About from './About.jsx';
import Ideas from './Ideas.jsx';

function Shell() {
  const { t, lang, setLang, plan } = useApp();
  const { path, query } = useRoute();
  useEffect(() => { if (path.startsWith('/r/')) window.scrollTo(0, 0); }, [path]);
  const n = Object.keys(plan).length;
  const tab = (href, label, on) => <a href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>{label}</a>;
  let page;
  if (path.startsWith('/r/')) page = <Recipe id={path.slice(3)} />;
  else if (path === '/circulaires') page = <Flyers />;
  else if (path === '/plan') page = <Plan />;
  else if (path === '/idees') page = <Ideas />;
  else if (path === '/a-propos') page = <About />;
  else page = <Browse query={query} />;
  return (
    <>
      <header className="top">
        <div className="wrap">
          <a className="brand" href="#/"><span aria-hidden="true">🛒</span> Grocery<b>maxxing</b></a>
          <nav aria-label="Navigation">
            {tab('#/', t('recipes'), path === '/' || path.startsWith('/r/'))}
            {tab('#/idees', t('ideas'), path === '/idees')}
            {tab('#/circulaires', t('flyers'), path === '/circulaires')}
            {tab('#/plan', <>{t('plan')}{n ? <span className="badge">{n}</span> : null}</>, path === '/plan')}
            {tab('#/a-propos', t('about'), path === '/a-propos')}
          </nav>
          <button type="button" className="lang" onClick={() => setLang(lang === 'en' ? 'fr' : 'en')} aria-label="Language">{lang === 'en' ? 'FR' : 'EN'}</button>
        </div>
      </header>
      <StoreBar />
      <main>{page}</main>
      <footer className="foot"><div className="wrap">{t('tagline')} · <a href="#/a-propos">{t('about')}</a></div></footer>
    </>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
