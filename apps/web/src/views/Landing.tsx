import { useAppDispatch, useAppSelector } from '../store';
import { setAuthMode, setIntroSeen } from '../store/uiSlice';
import type { AuthMode } from '../store/uiSlice';
import { useEnterDemo } from '../onboarding/useEnterDemo';
import { cx } from '../utils';
import Icon from '../ui/Icon';
import { BRAND_DOCS } from '../onboarding/BrandGuide';
import Logo from '../ui/Logo';
import { useThemeSwitch } from '../ui/useThemeSwitch';

/**
 * The platform's opening page: a product page in the Aurora landing style (masthead, big serif
 * hero, stat band, chart, full-bleed insight band) that ends in create account / demo / sign in.
 * Deliberately NOT a case study (no folios, no design-system content). The one case study lives
 * at /case-study.html and is linked from the masthead and footer.
 */

/* ── small illustrations, drawn with plain elements so they follow the theme ── */
function PipelineArt() {
  const cols: [string, number][] = [['Lead', 2], ['Qualified', 1], ['Proposal', 2], ['Won', 1]];
  return (
    <div className="ill ill-pipe" aria-hidden="true">
      {cols.map(([c, n]) => (
        <div key={c} className={cx('ill-col', c === 'Won' && 'won')}>
          <div className="ill-k">{c}</div>
          {Array.from({ length: n }, (_, i) => <div key={i} className="ill-card"><b /><i /></div>)}
        </div>
      ))}
    </div>
  );
}

function ToolsArt() {
  return (
    <div className="ill ill-tools" aria-hidden="true">
      <div className="ill-win a"><div className="ill-bar"><span>Calculator</span></div><div className="ill-keys">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div></div>
      <div className="ill-win b"><div className="ill-bar"><span>Assistant</span></div><div className="ill-msg l" /><div className="ill-msg r" /><div className="ill-msg l s" /></div>
      <div className="ill-dock"><i /><i /><i /></div>
    </div>
  );
}

const GROUPS = [
  {
    k: 'Workspace', t: 'Plan the work', items: [
      ['Dashboard', 'Spend, tasks and completion at a glance, with a live 3D relationship globe.'],
      ['Projects', 'Each project tracks its spend trend, tasks and progress.'],
      ['Tasks', 'Every task grouped by project, with dates and a status.'],
    ],
  },
  {
    k: 'CRM', t: 'Know the customer', items: [
      ['Contacts & Companies', 'People linked to the companies they work for.'],
      ['Deals', 'A pipeline board from lead to won or lost, with a total for each stage.'],
      ['Activities', 'Calls, emails, meetings and follow-ups, linked to contacts and deals.'],
    ],
  },
  {
    k: 'Tools', t: 'Everything in between', items: [
      ['Assistant', 'Brenda answers from your own BizzNex data, with no outside service.'],
      ['Publisher & Newsletter', 'Social posts and email campaigns, written once.'],
      ['Notes, Events, Notifications, Calculator', 'The everyday utilities, each also a floating window.'],
    ],
  },
];

export default function Landing() {
  const dispatch = useAppDispatch();
  const switchTheme = useThemeSwitch();
  const theme = useAppSelector((s) => s.ui.theme);
  const demo = useEnterDemo();

  const toAuth = (m: AuthMode) => { dispatch(setAuthMode(m)); dispatch(setIntroSeen(true)); window.scrollTo(0, 0); };

  return (
    <div className="lp">
      <header className="lp-mast">
        <a className="brand" href="#top" style={{ padding: 0, textDecoration: 'none' }}><Logo /></a>
        <nav className="lp-nav" aria-label="Sections">
          <a className="opt" href="#features">Features</a>
          <a className="opt" href="/brand/skyline.html" target="_blank" rel="noopener">Brand ↗</a>
          <a className="opt" href="/case-study.html" target="_blank" rel="noopener">Case study ↗</a>
          <button type="button" className="tgl" onClick={switchTheme} aria-label="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} /><span className="tgl-text">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button type="button" className="btn ghost sm" onClick={() => toAuth('signin')}>Sign in</button>
          <button type="button" className="btn primary sm lp-get" onClick={() => toAuth('signup')}>Get started</button>
        </nav>
      </header>

      <div className="lp-page" id="top">
        {/* HERO */}
        <section className="lp-hero">
          <div className="bloom" />
          <p className="spec"><span className="k">BizzNex</span><span>The business suite</span></p>
          <h1>Business, run<br /><em>beautifully.</em></h1>
          <div className="lp-hero-grid">
            <p className="lp-lede">One quiet surface for projects, customers, deals, marketing and the tools in between — set like a page, not stacked in boxes.</p>
            <div className="lp-cta">
              <button type="button" className="btn primary" onClick={() => toAuth('signup')}>Create your workspace <Icon name="arrow" /></button>
              <button type="button" className="link" onClick={demo.enter} disabled={demo.loading}>
                {demo.loading ? <><span className="spin" /> Opening the demo…</> : <>Explore the demo <span>→</span></>}
              </button>
            </div>
          </div>
          {demo.error && <p className="err" role="alert">{demo.error}</p>}
          <div className="lp-meta"><span>Workspace · CRM · Tools</span><span>Light &amp; dark</span><span>English · Español · Français</span></div>
        </section>

        {/* STAT BAND — the built-in sample business */}
        <section className="lp-stat" aria-label="Sample workspace">
          <div className="lp-metric">
            <p className="spec"><span className="k">Spend</span><span>Sample workspace · 6 months</span></p>
            <div className="big num">$27,600</div>
            <div className="delta">▲ 78.8%&nbsp;&nbsp;across the six months</div>
          </div>
          <div className="lp-rows">
            <div className="row"><span className="l">Active projects</span><span className="v">2</span></div>
            <div className="row"><span className="l">Open tasks</span><span><span className="v">3</span><span className="d">1 in progress</span></span></div>
            <div className="row"><span className="l">Pipeline</span><span><span className="v">$77.5k</span><span className="d">3 open deals</span></span></div>
            <div className="row"><span className="l">Completion</span><span><span className="v">40%</span><span className="d">2 of 5 tasks</span></span></div>
          </div>
        </section>
        <section className="lp-chart" aria-hidden="true">
          <svg viewBox="0 0 1000 240" preserveAspectRatio="none">
            <defs><linearGradient id="lp-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".22" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
            <line x1="0" y1="60" x2="1000" y2="60" stroke="var(--rule-soft)" /><line x1="0" y1="140" x2="1000" y2="140" stroke="var(--rule-soft)" /><line x1="0" y1="220" x2="1000" y2="220" stroke="var(--rule)" />
            <path d="M0,196 C120,180 160,170 200,160 C300,140 340,128 400,122 C500,110 560,104 600,98 C700,80 760,70 800,62 C880,50 940,40 1000,36 L1000,220 L0,220 Z" fill="url(#lp-fill)" />
            <path d="M0,196 C120,180 160,170 200,160 C300,140 340,128 400,122 C500,110 560,104 600,98 C700,80 760,70 800,62 C880,50 940,40 1000,36" fill="none" stroke="var(--accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            <circle cx="1000" cy="36" r="4.5" fill="var(--accent)" />
          </svg>
          <div className="xlab"><span>−5 mo</span><span>−4</span><span>−3</span><span>−2</span><span>−1</span><span>Now</span></div>
        </section>
        <p className="cap">The figures are BizzNex’s built-in sample business, which a new account can start with in one click.</p>

        {/* FEATURES */}
        <section className="lp-sec" id="features">
          <header className="lp-sec-h"><div><p className="spec"><span className="k">Features</span></p><h2 className="sec-t">Everything your business runs on, in one place</h2></div></header>
          <div className="lp-groups">
            {GROUPS.map((g) => (
              <div key={g.k} className="lp-grp">
                <span className="gk">{g.k}</span>
                <h3>{g.t}</h3>
                <ul>{g.items.map(([t, b]) => <li key={t}><b>{t}</b>{b}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className="lp-split">
            <div>
              <p className="sublab">Sales pipeline</p>
              <p className="lp-p">Move each deal through Lead → Qualified → Proposal, then mark it Won or Lost. Each column shows its total, and winning a deal adds a notification.</p>
            </div>
            <PipelineArt />
          </div>
        </section>
      </div>

      {/* INTELLIGENCE BAND (full-bleed) */}
      <section className="lp-band" aria-label="Dashboard intelligence">
        <div className="in">
          <p className="spec"><span className="k">Insights</span><span>On your dashboard</span></p>
          <blockquote><b>Website relaunch</b> has 1 task still pending — assigning it now keeps the timeline on track.</blockquote>
          <p className="by">Your dashboard tells you which project needs you next.</p>
        </div>
      </section>

      <div className="lp-page">
        {/* WINDOWS */}
        <section className="lp-sec" id="windows">
          <header className="lp-sec-h"><div><p className="spec"><span className="k">Windows</span></p><h2 className="sec-t">Use several tools at once</h2></div></header>
          <div className="lp-split">
            <ul className="lp-list">
              <li><b>Click a tool</b> and it opens as a full page, like the Dashboard or Deals.</li>
              <li><b>Right-click it</b> and a small floating window opens instead, so it stays beside your work.</li>
              <li><b>Windows</b> drag, resize and minimise to a dock that disappears when nothing is open.</li>
            </ul>
            <ToolsArt />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="lp-sec" id="how">
          <header className="lp-sec-h"><div><p className="spec"><span className="k">How it works</span></p><h2 className="sec-t">Up and running in about two minutes</h2></div></header>
          <div className="lp-flow">
            <div className="st"><span className="n num">01</span><b>Create an account</b><span>Or explore the demo business. You don’t need an account for the demo.</span></div>
            <div className="st"><span className="n num">02</span><b>Set up in six steps</b><span>Your business, your goals, your look, and whether to start with sample data.</span></div>
            <div className="st"><span className="n num">03</span><b>Take the tour</b><span>A one-minute spotlight tour, then a checklist that ticks off by itself as you work.</span></div>
          </div>
          <p className="lp-p">Returning? Sign in and go straight to your workspace. Help is always one <kbd>?</kbd> away.</p>
        </section>

        {/* START */}
        <section className="lp-sec lp-start" id="get-started">
          <header className="lp-sec-h"><div><p className="spec"><span className="k">Get started</span></p><h2 className="sec-t">How would you like to start?</h2></div></header>
          <div className="wl-choices">
            <button type="button" className="wl-choice primary" onClick={() => toAuth('signup')}>
              <span className="ob-card-ic"><Icon name="plus" /></span>
              <span className="t">Create an account</span>
              <span className="b">Set up your own workspace, with a short guided setup.</span>
              <span className="go">Create account <Icon name="arrow" size={14} /></span>
            </button>
            <button type="button" className="wl-choice" onClick={demo.enter} disabled={demo.loading}>
              <span className="ob-card-ic"><Icon name="sparkle" /></span>
              <span className="t">Explore the demo</span>
              <span className="b">Look around an example business with a guided tour. You don’t need an account.</span>
              <span className="go">{demo.loading ? <><span className="spin" /> Opening…</> : <>Open the demo <Icon name="arrow" size={14} /></>}</span>
            </button>
            <button type="button" className="wl-choice" onClick={() => toAuth('signin')}>
              <span className="ob-card-ic"><Icon name="user" /></span>
              <span className="t">Sign in</span>
              <span className="b">Already have an account? Go straight to your workspace.</span>
              <span className="go">Sign in <Icon name="arrow" size={14} /></span>
            </button>
          </div>
        </section>

        <footer className="lp-colophon">
          <div className="lp-foot-brand"><Logo rule tagline /></div>
          <nav className="lp-foot-links" aria-label="Brand and design">
            <p className="lbl">Brand &amp; design</p>
            {BRAND_DOCS.map((d) => (
              <a key={d.href} href={d.href} target="_blank" rel="noopener">{d.title} ↗</a>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
