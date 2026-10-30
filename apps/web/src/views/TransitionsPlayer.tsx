import { useEffect, useRef, useState } from 'react';
import { SkylineMark } from '../ui/Logo';
import { reducedMotion } from '../ui/motion';
import { TransitionView, timingFor } from '../ui/transitions';
import type { TransitionPhase, TransitionScreen } from '../ui/transitions';
import { cx } from '../utils';

/**
 * A mini BizzNex window that replays the seven transition moments with the app's own
 * TransitionView and timings (ui/transitions.tsx). Shown on the landing page.
 */
type ScreenId = 'blank' | 'land' | 'auth' | 'wizStart' | 'wiz' | 'dash' | 'deals';
interface Moment extends TransitionScreen { label: string; from: ScreenId; to: ScreenId; note: string; notice?: boolean }

const MOMENTS: Moment[] = [
  { label: 'Open the app', kind: 'skyline', from: 'blank', to: 'dash', t: 'Good afternoon, Dennis.', s: 'Opening your workspace', note: 'Opening BizzNex while signed in. Shown only if loading takes over 300 ms.' },
  { label: 'Sign in', kind: 'skyline', from: 'auth', to: 'dash', t: 'Good afternoon, Dennis.', s: 'Loading your projects, customers and deals', note: 'Greeted by name while your workspace loads.' },
  { label: 'Open the demo', kind: 'skyline', from: 'land', to: 'wizStart', t: 'Opening the demo business', s: 'A shared example workspace · resets every 30 minutes', note: 'From “Explore the demo” into the guided demo.' },
  { label: 'Setup finished', kind: 'skyline', from: 'wiz', to: 'dash', t: 'Your workspace is ready.', s: 'Applying your goals and your look', note: 'Setup closes and your workspace opens, whole.' },
  { label: 'Sign out', kind: 'aurora', from: 'dash', to: 'auth', t: 'See you soon, Dennis.', s: 'Signing out of this browser', note: 'A quiet goodbye.' },
  { label: 'Session ended', kind: 'aurora', from: 'dash', to: 'auth', notice: true, t: 'You were signed out.', s: 'The demo was refreshed, or this account signed out everywhere', note: 'If your session ends elsewhere, BizzNex tells you why.' },
  { label: 'Switch features', kind: 'aurora', inline: true, compact: true, from: 'dash', to: 'deals', t: 'Deals', note: 'Every page change, over the main column only. The sidebar stays put.' },
];

const Logo = () => <div className="lpt-logo"><SkylineMark />BizzNex</div>;
const Side = ({ on }: { on: 'Dashboard' | 'Deals' }) => (
  <div className="lpt-side">
    <Logo />
    <span className="lpt-grp">Workspace</span>
    {['Dashboard', 'Projects', 'Tasks'].map((n) => <span key={n} className={cx('lpt-nav', n === on && 'on')}>{n}</span>)}
    <span className="lpt-grp">CRM</span>
    {['Contacts', 'Deals'].map((n) => <span key={n} className={cx('lpt-nav', n === on && 'on')}>{n}</span>)}
    <span className="lpt-grp">Tools</span><span className="lpt-nav">Assistant</span>
  </div>
);

function Screen({ id, notice }: { id: ScreenId; notice?: boolean }) {
  switch (id) {
    case 'blank': return <div className="lpt-scr on" data-s="blank" />;
    case 'land': return (
      <div className="lpt-scr on"><div className="lpt-land"><span className="lpt-bloom" /><Logo />
        <h5>Business, run <i>beautifully.</i></h5>
        <div className="lpt-row2"><b>Create your workspace</b><span>Explore the demo →</span></div></div></div>
    );
    case 'auth': return (
      <div className="lpt-scr on"><div className="lpt-auth">
        <div className="lpt-auth-l"><span className="lpt-bloom" style={{ right: '-26cqi', top: 'auto', bottom: '-24cqi' }} /><Logo /><p>Welcome back.</p></div>
        <div className="lpt-auth-r">
          <h4 className="lpt-h4">Sign in</h4>
          {notice && <div className="lpt-notice">You were signed out: the demo was refreshed, or this account signed out everywhere.</div>}
          <span className="lpt-lab">Email</span><div className="lpt-in">dennis@northwind.example.com</div>
          <span className="lpt-lab">Password</span><div className="lpt-in">••••••••••</div>
          <span className="lpt-go">Sign in</span>
        </div></div></div>
    );
    case 'wizStart':
    case 'wiz': {
      const last = id === 'wiz';
      const steps = ['Welcome', 'Your business', 'Your goals', 'Preferences', 'Ready'];
      return (
        <div className="lpt-scr on"><div className="lpt-wiz">
          <div className="lpt-wiz-rail"><Logo />
            {steps.map((s, i) => <div key={s} data-n={`0${i + 1}`} className={cx('lpt-step', last ? (i < 4 ? 'done' : 'on') : i === 0 && 'on')}>{s}</div>)}
          </div>
          <div className="lpt-wiz-main">
            <span className="lpt-k">{last ? 'Step 5 of 5 · Ready' : 'Step 1 of 5 · Welcome'}</span>
            <h6>{last ? 'You’re all set, Dennis.' : 'Welcome to the BizzNex demo.'}</h6>
            <p>{last ? 'Your workspace opens with the steps that match your goals first.' : 'An example business with real projects, customers and deals.'}</p>
            <div className="lpt-wiz-foot"><b>{last ? 'Go to my workspace →' : 'Get started →'}</b></div>
          </div></div></div>
      );
    }
    case 'dash': return (
      <div className="lpt-scr on"><div className="lpt-ws"><Side on="Dashboard" />
        <div className="lpt-main"><span className="lpt-crumb">BizzNex / Dashboard</span><h3 className="lpt-h">Good afternoon, Dennis</h3>
          <div className="lpt-big">$27,600</div><span className="lpt-delta">▲ 78.8%  across the six months</span>
          <div className="lpt-rows">
            <div className="lpt-r"><span>Active projects</span><b>2</b></div>
            <div className="lpt-r"><span>Open tasks</span><b>3</b></div>
            <div className="lpt-r"><span>Pipeline</span><b>$77.5k</b></div>
          </div></div></div></div>
    );
    case 'deals': return (
      <div className="lpt-scr on"><div className="lpt-ws"><Side on="Deals" />
        <div className="lpt-main"><span className="lpt-crumb">BizzNex / Deals</span><h3 className="lpt-h">Deals</h3>
          <span className="lpt-delta" style={{ color: 'var(--muted)' }}>4 DEALS · PIPELINE $77,500 · WON $8,600</span>
          <div className="lpt-cols">
            {[['LEAD', 'Fleet dashboard pilot'], ['QUALIFIED', 'Packaging rollout'], ['PROPOSAL', 'Brand refresh retainer'], ['WON', 'Seasonal campaign']].map(([c, d]) => (
              <div key={c} className={cx('lpt-col', c === 'WON' && 'won')}>{c}<div className="lpt-card">{d}</div></div>
            ))}
          </div></div></div></div>
    );
  }
}

export default function TransitionsPlayer() {
  const [cur, setCur] = useState(0);
  const [screen, setScreen] = useState<ScreenId>('blank');
  const [phase, setPhase] = useState<TransitionPhase | null>(null);
  const [status, setStatus] = useState('ready');
  const [calm, setCalm] = useState(reducedMotion);
  const [slow, setSlow] = useState(false);
  const calmRef = useRef(calm), slowRef = useRef(slow), started = useRef(false);
  const timers = useRef<number[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  const m = MOMENTS[cur];
  // the timing of the run in progress (the app's values, doubled by Slow ×2)
  const [run, setRun] = useState({ ms: timingFor(MOMENTS[0], calm), calm });

  const play = (i: number, done?: () => void) => {
    started.current = true;
    clear();
    const mo = MOMENTS[i], c = calmRef.current, f = slowRef.current && !c ? 2 : 1;
    const t = timingFor(mo, c);
    setRun({ ms: { in: t.in * f, hold: t.hold * f, out: t.out * f }, calm: c });
    setCur(i); setScreen(mo.from); setPhase(null); setStatus('before');
    at(700 * f, () => {
      if (c && mo.compact) { setScreen(mo.to); setStatus('instant (reduced motion)'); if (done) at(1200, done); return; }
      setPhase('in'); setStatus('transition');
      at(t.in * f, () => {
        setScreen(mo.to); setPhase('hold'); setStatus('holding');
        at(t.hold * f, () => {
          setPhase('out'); setStatus(mo.kind === 'aurora' ? 'fading through paper' : 'lifting away');
          at(t.out * f, () => { setPhase(null); setStatus('done · press Replay'); if (done) at(1000 * f, done); });
        });
      });
    });
  };
  const playAll = () => {
    let i = 0;
    const next = () => { if (i < MOMENTS.length) play(i++, next); };
    next();
  };

  // play the first moment once the player scrolls into view (unless someone already pressed play)
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !('IntersectionObserver' in window)) return clear;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); if (!started.current) play(0); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); clear(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount only

  return (
    <div className="lpt">
      <div className="lpt-moments" role="group" aria-label="Moment">
        {MOMENTS.map((mo, i) => (
          <button key={mo.label} type="button" className="lpt-mom" aria-pressed={i === cur} onClick={() => play(i)}>
            <span className="n">0{i + 1}</span>{mo.label}
            <span className={cx('tag', mo.kind === 'aurora' && 'aur')}>{mo.kind === 'aurora' ? 'Aurora' : 'Skyline'}</span>
          </button>
        ))}
      </div>
      <div className="lpt-frame">
        <div className="lpt-bar" aria-hidden="true"><i /><i /><i /><span>bizznex.cheruvathoor.com</span></div>
        <div className="lpt-stage" ref={stageRef}>
          <Screen id={screen} notice={m.notice} />
          {phase && <TransitionView {...m} phase={phase} calm={run.calm} ms={run.ms} contained />}
        </div>
      </div>
      <div className="lpt-ctrl">
        <button type="button" className="btn primary sm" onClick={() => play(cur)}>▶ Replay</button>
        <button type="button" className="btn ghost sm" onClick={playAll}>Play all seven</button>
        <button type="button" className="lpt-chip" aria-pressed={calm} onClick={() => { calmRef.current = !calm; setCalm(!calm); play(cur); }}>Reduced motion</button>
        <button type="button" className="lpt-chip" aria-pressed={slow} onClick={() => { slowRef.current = !slow; setSlow(!slow); play(cur); }}>Slow ×2</button>
        <span className="lpt-phase" aria-live="polite">{status}</span>
      </div>
      <p className="lpt-note">{m.note}</p>
    </div>
  );
}
