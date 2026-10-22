import { Suspense, lazy, useLayoutEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { store, useAppDispatch, useAppSelector } from './store';
import { systemThemeChanged } from './store/uiSlice';
import { messages } from './i18n/messages';
import { useT } from './i18n/useT';
import { ToastProvider } from './ui/Toast';
import { ConfirmProvider } from './ui/Confirm';
import ErrorBoundary from './ui/ErrorBoundary';
import { useMeQuery } from './services/api';
import Sidebar from './layout/Sidebar';
import Topbar from './layout/Topbar';
import WindowLayer from './layout/WindowLayer';
import Dock from './layout/Dock';
import { useWindows } from './layout/useWindows';
import { LABELS, NAV } from './nav';
import { viewTransition } from './ui/motion';
import type { ViewId } from './types';

import Dashboard from './views/Dashboard';
import Projects from './views/Projects';
import Tasks from './views/Tasks';
import Contacts from './views/Contacts';
import Companies from './views/Companies';
import Deals from './views/Deals';
import Activities from './views/Activities';
import type { SettingsSection } from './views/Settings';
import { isToolId, toolNode } from './views/tools/registry';
import type { ToolId } from './views/tools/registry';
import { useOnboarding } from './onboarding/useOnboarding';
import Checklist from './onboarding/Checklist';
import FeatureIntro from './onboarding/FeatureIntro';
import HelpMenu from './onboarding/HelpMenu';
import SampleBanner from './onboarding/SampleBanner';

// Code-split: screens most visits never reach (or reach once) load on demand.
const Auth = lazy(() => import('./views/Auth'));
const Landing = lazy(() => import('./views/Landing'));
const Settings = lazy(() => import('./views/Settings'));
const SetupWizard = lazy(() => import('./onboarding/SetupWizard'));
const Tour = lazy(() => import('./onboarding/Tour'));
const FeatureGuide = lazy(() => import('./onboarding/FeatureGuide'));
const BrandGuide = lazy(() => import('./onboarding/BrandGuide'));

const Loading = () => <p className="loading" role="status">Loading…</p>;

export default function App() {
  return (
    <ErrorBoundary what="BizzNex">
      <Provider store={store}>
        <Root />
      </Provider>
    </ErrorBoundary>
  );
}

function Root() {
  const language = useAppSelector((s) => s.ui.language);
  const theme = useAppSelector((s) => s.ui.theme);
  const followSystem = useAppSelector((s) => s.ui.followSystem);
  const dispatch = useAppDispatch();

  // layout effects: the theme is right before first paint (index.html sets it even earlier)
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 'system' theme: follow the OS light/dark setting live
  useLayoutEffect(() => {
    if (!followSystem || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => dispatch(systemThemeChanged(mq.matches ? 'dark' : 'light'));
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [followSystem, dispatch]);

  return (
    <IntlProvider locale={language} messages={messages[language]} defaultLocale="en">
      <ToastProvider>
        <ConfirmProvider>
          <ErrorBoundary what="BizzNex">
            <Gate />
          </ErrorBoundary>
        </ConfirmProvider>
      </ToastProvider>
    </IntlProvider>
  );
}

function Gate() {
  const token = useAppSelector((s) => s.auth.token);
  // loading the account also validates a stored token: a 401 here signs out (see baseQuery in services/api)
  useMeQuery(undefined, { skip: !token });

  const introSeen = useAppSelector((s) => s.ui.introSeen);

  // signed out: the landing page opens every visit → create account / demo / sign in
  if (!token) return <Suspense fallback={<Loading />}>{introSeen ? <Auth /> : <Landing />}</Suspense>;
  return <Shell />;
}

/** Sidebar order, with Settings (the name at the bottom) last. */
const NAV_ORDER: ViewId[] = [...NAV.flatMap((s) => s.items.map((i) => i.id)), 'settings'];

function Shell() {
  const t = useT();
  const [view, setView] = useState<ViewId>('dashboard');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { wins, openIds, openWindow: openWin, closeWindow, focusWindow, toggleMin } = useWindows();
  const { state: onb, loaded, guided, update, markSeen, track, user } = useOnboarding();
  const [touring, setTouring] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [guideFor, setGuideFor] = useState<ViewId | null>(null);
  const [featureGuide, setFeatureGuide] = useState(false);
  const [brandGuide, setBrandGuide] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profile');
  const openSettings = (s: SettingsSection = 'profile') => { setSettingsSection(s); navigate('settings'); };

  // each view starts unfiltered: a search typed on Contacts shouldn't silently filter Deals.
  // Pages slide the way you move through the sidebar: down the list slides left, up slides right.
  const navigate = (v: ViewId) => {
    const apply = () => { setView(v); setQuery(''); setMenuOpen(false); };
    if (v === view) { apply(); return; }
    viewTransition(apply, NAV_ORDER.indexOf(v) >= NAV_ORDER.indexOf(view) ? 'nav-fwd' : 'nav-back');
  };
  const openWindow = (id: ToolId) => { openWin(id); track('window'); };
  const openWindowFor = (v: ViewId) => { if (isToolId(v)) openWindow(v); };

  // New users and demo visitors are guided (wizard, first-visit page guides, checklist).
  // Returning sign-ins only get what they open themselves from the Help (?) menu.
  const startPage = user?.preferences?.startPage;
  const [startApplied, setStartApplied] = useState(false);
  if (loaded && !startApplied) {
    setStartApplied(true);
    if (startPage && startPage !== 'dashboard') setView(startPage);
  }

  const wizardOpen = loaded && guided && onb.wizard === 'pending';
  const showIntro = loaded && !wizardOpen && !touring
    && (guideFor === view || (guided && !(onb.seen ?? []).includes(view)));
  const dismissIntro = () => { markSeen(view); setGuideFor(null); };

  // mobile menu: open the drawer and put keyboard focus on its first link
  const openMenu = () => {
    setMenuOpen(true);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#app-sidebar .nav')?.focus({ preventScroll: true }));
  };

  const startTour = () => { setChecklistOpen(false); setMenuOpen(false); setTouring(true); };
  const endTour = (completed: boolean) => {
    setTouring(false);
    if (completed) { update({ tourDone: true }); setChecklistOpen(true); }
  };
  const searchable: ViewId[] = ['projects', 'tasks', 'contacts', 'companies', 'deals', 'activities'];

  const render = () => {
    switch (view) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'projects': return <Projects query={query} onNavigate={navigate} />;
      case 'tasks': return <Tasks query={query} onNavigate={navigate} />;
      case 'contacts': return <Contacts query={query} />;
      case 'companies': return <Companies query={query} />;
      case 'deals': return <Deals query={query} />;
      case 'activities': return <Activities query={query} />;
      case 'settings': return (
        <Settings
          section={settingsSection}
          onSection={setSettingsSection}
          onTour={startTour}
          onFeatureGuide={() => setFeatureGuide(true)}
          onBrand={() => setBrandGuide(true)}
          onSetup={guided ? () => update({ wizard: 'pending' }) : undefined}
        />
      );
      default: return isToolId(view) ? toolNode(view) : null;
    }
  };

  return (
    <div className="app">
      {menuOpen && <div className="scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />}
      <Sidebar view={view} onNavigate={navigate} onOpenWindow={openWindowFor} openWindowIds={openIds} open={menuOpen}
        onClose={() => setMenuOpen(false)} onOpenSettings={() => openSettings()} />
      <div className="main-area">
        <Topbar
          title={t(LABELS[view])}
          query={query}
          onQuery={setQuery}
          onMenu={openMenu}
          menuOpen={menuOpen}
          showSearch={searchable.includes(view)}
          onOpenWindow={isToolId(view) ? () => openWindow(view) : undefined}
          help={
            <HelpMenu
              onTour={startTour}
              onChecklist={() => setChecklistOpen(true)}
              onPageGuide={() => setGuideFor(view)}
              onFeatureGuide={() => setFeatureGuide(true)}
              onBrand={() => setBrandGuide(true)}
              onSetup={() => update({ wizard: 'pending' })}
            />
          }
        />
        <div className="view">
          <SampleBanner />
          {showIntro && <FeatureIntro key={view} view={view} onDismiss={dismissIntro} />}
          <ErrorBoundary key={`page-${view}`} what="this page">
            <Suspense fallback={<Loading />}>{render()}</Suspense>
          </ErrorBoundary>
        </div>
      </div>
      <WindowLayer wins={wins} onFocus={focusWindow} onClose={closeWindow} onMinimize={toggleMin} />
      <Dock wins={wins} onToggle={toggleMin} />

      {loaded && guided && !wizardOpen && (
        <Checklist
          open={checklistOpen}
          onOpenChange={setChecklistOpen}
          onNavigate={navigate}
          onStartTour={startTour}
          onDemoWindow={() => { navigate('dashboard'); openWindow('calculator'); }}
        />
      )}
      <Suspense fallback={null}>
      {featureGuide && <FeatureGuide onClose={() => setFeatureGuide(false)} onNavigate={navigate} />}
      {brandGuide && <BrandGuide onClose={() => setBrandGuide(false)} />}
      {touring && (
        <Tour
          onNavigate={(v) => setView(v)}
          onTarget={(key) => setMenuOpen(!!key?.startsWith('nav-') && window.matchMedia('(max-width: 860px)').matches)}
          onClose={(done) => { setMenuOpen(false); endTour(done); }}
        />
      )}
      {wizardOpen && (
        <SetupWizard onFinish={({ tour, landing }) => (tour ? startTour() : navigate(landing))} />
      )}
      </Suspense>
    </div>
  );
}
