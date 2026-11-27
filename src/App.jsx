import React, { Suspense, lazy, useEffect } from 'react';
import { AppProvider, useApp, useRoute } from './store.jsx';
import { StoreMenu, Logo, Icon } from './ui.jsx';
import Browse from './Browse.jsx';

// The home page ships with the app; the other pages load when first opened.
const Recipe = lazy(() => import('./Recipe.jsx'));
const Flyers = lazy(() => import('./Flyers.jsx'));
const Plan = lazy(() => import('./Plan.jsx'));
const About = lazy(() => import('./About.jsx'));
const Ideas = lazy(() => import('./Ideas.jsx'));

/** A crash in one page shows a message with a way out instead of a blank screen. */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    const fr = !(document.documentElement.lang || '').startsWith('en');
    return (
      <div className="state" role="alert">
        <p>⚠️ {fr ? 'Un problème est survenu sur cette page.' : 'Something went wrong on this page.'}</p>
        <button type="button" className="btn" onClick={() => { this.setState({ error: null }); window.location.reload(); }}>{fr ? 'Réessayer' : 'Retry'}</button>{' '}
        <a className="link" href="#/" onClick={() => this.setState({ error: null })}>{fr ? 'Accueil' : 'Home'}</a>
      </div>
    );
  }
}

function Shell() {
  const { t, lang, setLang, plan, theme, setTheme, byId } = useApp();
  const { path, query } = useRoute();
  useEffect(() => { if (path.startsWith('/r/')) window.scrollTo(0, 0); }, [path]);
  // A title per page, for tabs, history and bookmarks.
  useEffect(() => {
    const name = path.startsWith('/r/') ? byId.get(path.slice(3))?.name
      : { '/circulaires': t('flyers'), '/plan': t('plan'), '/idees': t('ideas'), '/a-propos': t('about') }[path];
    document.title = name ? `${name} — Grocerymaxxing` : `Grocerymaxxing — ${t('tagline')}`;
  }, [path, lang, byId]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = Object.keys(plan).length;

  const tabs = [['#/', 'book', t('recipes'), path === '/' || path.startsWith('/r/')], ['#/idees', 'spark', t('ideasShort'), path === '/idees'], ['#/circulaires', 'tag', t('flyers'), path === '/circulaires'], ['#/plan', 'list', t('plan'), path === '/plan', n]];
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
          <a className="brand" href="#/" aria-label="Grocerymaxxing"><Logo /> <span>Grocery<em>maxxing</em></span></a>
          <nav className="navlinks" aria-label={t('mainNav')}>
            {tabs.map(([href, , label, on, count]) => <a key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>{label}{count ? <span className="count">{count}</span> : null}</a>)}
          </nav>
          <div className="head-tools">
            <StoreMenu />
            <button type="button" className="iconbtn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')} title={theme === 'dark' ? t('lightMode') : t('darkMode')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} /></button>
            <button type="button" className="iconbtn" onClick={() => setLang(lang === 'en' ? 'fr' : 'en')} aria-label={lang === 'en' ? 'Français' : 'English'}>{lang === 'en' ? 'FR' : 'EN'}</button>
          </div>
        </div>
      </header>
      <main><ErrorBoundary key={path}><Suspense fallback={<div className="wrap" aria-busy="true"><div className="skel skel-title" /></div>}>{page}</Suspense></ErrorBoundary></main>
      <nav className="tabbar" aria-label={t('mobileNav')}>
        {tabs.map(([href, icon, label, on, count]) => (
          <a key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}><span className="ic"><Icon name={icon} size={21} /></span><span>{label}</span>{count ? <span className="count">{count}</span> : null}</a>
        ))}
      </nav>
      <footer className="foot"><div className="wrap"><span>{t('tagline')}</span><a href="#/a-propos">{t('about')}</a></div></footer>
    </>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
