import { useEffect, useRef, useState } from 'react';
import type { OnboardingGoal } from '@bizznex/shared';
import { useAppDispatch, useAppSelector } from '../store';
import { setLanguage, setTheme } from '../store/uiSlice';
import { useSeedSampleMutation } from '../services/api';
import type { Language, ViewId } from '../types';
import { cx } from '../utils';
import Icon from '../ui/Icon';
import { GOALS, INDUSTRIES } from './content';
import BusinessFields, { FIELD_ORDER, profileFrom, validateBusiness } from './BusinessFields';
import type { BusinessErrors, BusinessProfile } from './BusinessFields';
import { useOnboarding } from './useOnboarding';
import Logo from '../ui/Logo';
import { playTransition } from '../ui/transitions';

type StepId = 'welcome' | 'business' | 'goals' | 'look' | 'data' | 'ready';
const LABELS: Record<StepId, string> = {
  welcome: 'Welcome', business: 'Your business', goals: 'Your goals', look: 'Preferences', data: 'Your data', ready: 'Ready',
};
/** New accounts get every step. Demo visitors skip only the data step: the demo already has its data.
 *  Their business answers stay in this browser (see useOnboarding), so trying the lookup changes nothing shared. */
const FLOW: StepId[] = ['welcome', 'business', 'goals', 'look', 'data', 'ready'];
const DEMO_FLOW: StepId[] = ['welcome', 'business', 'goals', 'look', 'ready'];

const LANGS: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' }, { id: 'es', label: 'Español' }, { id: 'fr', label: 'Français' },
];

interface Props {
  /** Called when the wizard closes. `tour` = the user chose to take the tour; `landing` = suggested first view. */
  onFinish: (o: { tour: boolean; landing: ViewId }) => void;
}

/** sessionStorage can be missing or throw (private mode, blocked storage); the step is only a convenience. */
const readStep = (key: string) => { try { return key ? sessionStorage.getItem(key) : null; } catch { return null; } };
const writeStep = (key: string, step: StepId | null) => {
  try { if (key) { if (step) sessionStorage.setItem(key, step); else sessionStorage.removeItem(key); } } catch { /* ignore */ }
};

/** Once an answer is given, its error goes away. */
const clearFixed = (e: BusinessErrors, p: Partial<BusinessProfile>): BusinessErrors => {
  const next = { ...e };
  for (const k of Object.keys(p) as (keyof BusinessProfile)[]) delete next[k];
  return next;
};

export default function SetupWizard({ onFinish }: Props) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const language = useAppSelector((s) => s.ui.language);
  const { user, state, update, demo, loaded } = useOnboarding();
  const flow = demo ? DEMO_FLOW : FLOW;
  const STEPS = flow.map((f) => LABELS[f]);
  const [seed, { isLoading: seeding }] = useSeedSampleMutation();

  const first = user?.name?.split(' ')[0] || 'there';
  // a refresh comes back to the same step instead of starting again at Welcome
  const stepKey = user?.id ? `bizznex.setup-step.${user.id}` : '';
  const [step, setStep] = useState(() => Math.max(0, flow.indexOf(readStep(stepKey) as StepId)));
  const id = flow[step];
  useEffect(() => { writeStep(stepKey, flow[step]); }, [stepKey, flow, step]);
  const [biz, setBiz] = useState<BusinessProfile>(() => profileFrom(state.profile));
  const [bizErrors, setBizErrors] = useState<BusinessErrors>({});
  const company = biz.company;
  const [goals, setGoals] = useState<OnboardingGoal[]>(state.profile?.goals ?? []);
  const [start, setStart] = useState<'sample' | 'blank'>('sample');
  const [seedError, setSeedError] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  // After a refresh the saved answers arrive with the account a moment later; show them unless already edited.
  const edited = useRef(false);
  useEffect(() => {
    if (!loaded || edited.current) return;
    setBiz(profileFrom(state.profile));
    setGoals(state.profile?.goals ?? []);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Move focus to each new step so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    bodyRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, [step]);

  const landing: ViewId = GOALS.find((g) => g.id === goals[0])?.view ?? 'dashboard';

  // the wizard closes behind a Skyline screen, so the workspace appears whole, not mid-swap
  const finish = (tour: boolean) => {
    writeStep(stepKey, null);
    void playTransition(
      { kind: 'skyline', t: 'Your workspace is ready.', s: tour ? 'Starting the tour' : 'Applying your goals and your look' },
      { swap: () => { update({ wizard: 'done' }); onFinish({ tour, landing }); } },
    );
  };

  const next = async () => {
    if (id === 'business') {
      const errors = validateBusiness(biz, { required: true });
      setBizErrors(errors);
      const firstBad = FIELD_ORDER.find((k) => errors[k]);
      if (firstBad) { document.getElementById(`ob-${firstBad}`)?.focus(); return; }
      update({ profile: {
        company: biz.company.trim(), website: biz.website.trim(), industry: biz.industry as (typeof INDUSTRIES)[number],
        country: biz.country, logoUrl: biz.logoUrl, role: biz.role, teamSize: biz.teamSize,
      } });
    }
    if (id === 'goals') update({ profile: { goals } });
    if (id === 'data' && start === 'sample' && !state.sample) {
      setSeedError('');
      try { await seed().unwrap(); }
      catch { setSeedError('We couldn’t add the sample data. Try again, or choose “Start with an empty workspace”.'); return; }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const toggleGoal = (g: OnboardingGoal) => {
    edited.current = true;
    setGoals((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));
  };

  const pct = Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div className="ob" role="dialog" aria-modal="true" aria-label="Set up your workspace">
      <div className="bloom" />
      <div className="ob-progress" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>

      <aside className="ob-rail">
        <div className="brand" style={{ padding: 0 }}><Logo /></div>
        <ol className="ob-steps">
          {STEPS.map((s, i) => (
            <li key={s} className={cx(i === step && 'on', i < step && 'done')}>
              <span className="n num">{i < step ? <Icon name="tick" size={12} strokeWidth={2.4} /> : String(i + 1).padStart(2, '0')}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="cap ob-rail-foot">About two minutes. You can change any of this later.</p>
      </aside>

      <main className="ob-main" ref={bodyRef}>
        <div className="ob-body" key={step}>
          <p className="spec"><span className="k">Step {step + 1} of {STEPS.length}</span><span>{STEPS[step]}</span></p>

          {id === 'welcome' && demo && (
            <>
              <h1 className="ob-h">Welcome to the BizzNex demo.</h1>
              <p className="ob-lede">This is an example business with real projects, customers and deals. Change anything you like. Answer a few quick questions and we’ll show you around.</p>
              <ul className="ob-points">
                <li><Icon name="building" /><div><b>Try it with your business</b><span>Type a company name and we’ll look it up. Your answers stay in this browser.</span></div></li>
                <li><Icon name="sparkle" /><div><b>Choose what to explore</b><span>We’ll put the matching steps first in your checklist.</span></div></li>
                <li><Icon name="sun" /><div><b>Pick your look</b><span>Light or dark mode, and your language.</span></div></li>
                <li><Icon name="grid" /><div><b>Take the tour</b><span>A one-minute walk through the workspace.</span></div></li>
              </ul>
            </>
          )}

          {id === 'welcome' && !demo && (
            <>
              <h1 className="ob-h">Welcome to BizzNex, {first}.</h1>
              <p className="ob-lede">Answer a few questions and we’ll set up your workspace for you: what to show first, what to try first, and whether to start with sample data.</p>
              <ul className="ob-points">
                <li><Icon name="building" /><div><b>Tell us about your business</b><span>Type your company name and we’ll look it up. Your industry shapes what we suggest first.</span></div></li>
                <li><Icon name="sparkle" /><div><b>Choose your goals</b><span>We’ll put the most useful steps first.</span></div></li>
                <li><Icon name="grid" /><div><b>Pick how to start</b><span>Explore with sample data, or start with an empty workspace.</span></div></li>
              </ul>
            </>
          )}

          {id === 'business' && (
            <>
              <h1 className="ob-h">{demo ? 'Try it with your business' : 'Tell us about your business'}</h1>
              <p className="ob-lede">{demo
                ? 'This is the step new accounts see. Type a company name to try the lookup. In the demo, your answers stay in this browser and don’t change the shared workspace.'
                : 'Your industry decides which checklist steps we suggest after your goals. Only you can see this, and you can change it later in Settings.'}</p>
              <BusinessFields idp="ob" value={biz} onChange={(p) => { edited.current = true; setBiz((b) => ({ ...b, ...p })); setBizErrors((e) => clearFixed(e, p)); }} errors={bizErrors} autoFocus />
            </>
          )}

          {id === 'goals' && (
            <>
              <h1 className="ob-h">What do you want to do first?</h1>
              <p className="ob-lede">Pick as many as you like. Your checklist will put the matching steps at the top.</p>
              <div className="ob-cards" role="group" aria-label="Goals">
                {GOALS.map((g, i) => {
                  const on = goals.includes(g.id);
                  return (
                    <button key={g.id} type="button" aria-pressed={on} data-autofocus={i === 0 || undefined}
                      className={cx('ob-card', on && 'on')} onClick={() => toggleGoal(g.id)}>
                      <span className="ob-card-ic"><Icon name={g.icon} /></span>
                      <span className="ob-card-t">{g.title}</span>
                      <span className="ob-card-b">{g.body}</span>
                      <span className="ob-tick" aria-hidden="true"><Icon name="tick" size={12} strokeWidth={2.4} /></span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {id === 'look' && (
            <>
              <h1 className="ob-h">Choose your look</h1>
              <p className="ob-lede">These apply right away, and you can switch them from the top bar at any time.</p>
              <div className="ob-label">Theme</div>
              <div className="ob-themes" role="radiogroup" aria-label="Theme">
                {(['light', 'dark'] as const).map((t, i) => (
                  <button key={t} type="button" role="radio" aria-checked={theme === t} data-autofocus={i === 0 || undefined}
                    className={cx('ob-theme', `t-${t}`, theme === t && 'on')} onClick={() => dispatch(setTheme(t))}>
                    <span className="ob-theme-art" aria-hidden="true"><i /><i /><i /></span>
                    <span className="ob-theme-l">{t === 'light' ? 'Light' : 'Dark'}</span>
                  </button>
                ))}
              </div>
              <div className="ob-label" style={{ marginTop: 'var(--s4)' }}>Language</div>
              <div className="seg" role="radiogroup" aria-label="Language">
                {LANGS.map((l) => (
                  <button key={l.id} type="button" role="radio" aria-checked={language === l.id}
                    className={language === l.id ? 'on' : ''} onClick={() => dispatch(setLanguage(l.id))}>{l.label}</button>
                ))}
              </div>
            </>
          )}

          {id === 'data' && (
            <>
              <h1 className="ob-h">How would you like to start?</h1>
              <p className="ob-lede">Sample data shows you a busy workspace straight away, and you can remove it in one click whenever you like.</p>
              <div className="ob-cards two" role="radiogroup" aria-label="Starting point">
                <button type="button" role="radio" aria-checked={start === 'sample'} data-autofocus
                  className={cx('ob-card', start === 'sample' && 'on')} onClick={() => setStart('sample')}>
                  <span className="tag soft ob-rec">Recommended</span>
                  <span className="ob-card-ic"><Icon name="sparkle" /></span>
                  <span className="ob-card-t">Explore with sample data</span>
                  <span className="ob-card-b">An example business with 2 projects, 3 companies, 4 deals in the pipeline, activities, notes, a post draft, a newsletter and upcoming events.</span>
                  <span className="ob-tick" aria-hidden="true"><Icon name="tick" size={12} strokeWidth={2.4} /></span>
                </button>
                <button type="button" role="radio" aria-checked={start === 'blank'}
                  className={cx('ob-card', start === 'blank' && 'on')} onClick={() => setStart('blank')}>
                  <span className="ob-card-ic"><Icon name="plus" /></span>
                  <span className="ob-card-t">Start with an empty workspace</span>
                  <span className="ob-card-b">Add your own projects, contacts and deals from the start. Your checklist will show you what to do first.</span>
                  <span className="ob-tick" aria-hidden="true"><Icon name="tick" size={12} strokeWidth={2.4} /></span>
                </button>
              </div>
              {state.sample && <p className="cap">Sample data is already in your workspace.</p>}
              {seedError && <p className="err" role="alert">{seedError}</p>}
            </>
          )}

          {id === 'ready' && (
            <>
              <h1 className="ob-h">{demo ? 'The demo is ready.' : `You’re all set, ${first}.`}</h1>
              <p className="ob-lede">
                {demo
                  ? 'Take a one-minute tour to see where everything is, or start exploring. When you want a workspace of your own, choose “Create your own account” from the Help (?) menu.'
                  : `${company.trim() ? `${company.trim()}’s workspace` : 'Your workspace'} is ready. Take a one-minute tour to see where everything is, or go straight in. Your checklist will help with the next steps.`}
              </p>
              <div className="ob-summary">
                {company.trim() && <div><span className="l">Business</span><span className="v">{[company.trim(), biz.industry, biz.teamSize && `${biz.teamSize} people`].filter(Boolean).join(' · ')}</span></div>}
                <div><span className="l">Starting point</span><span className="v">{demo ? 'Demo business' : state.sample ? 'Sample data' : 'Empty workspace'}</span></div>
                <div><span className="l">Focus</span><span className="v">{goals.length ? goals.map((g) => GOALS.find((x) => x.id === g)?.title).join(' · ') : 'Everything'}</span></div>
                <div><span className="l">Look</span><span className="v">{theme === 'dark' ? 'Dark' : 'Light'} · {LANGS.find((l) => l.id === language)?.label}</span></div>
              </div>
            </>
          )}
        </div>

        <footer className="ob-foot">
          {step > 0 && id !== 'ready' ? <button type="button" className="btn quiet" onClick={back}>Back</button> : <span />}
          <div className="row gap-3">
            {id === 'welcome' && <button type="button" className="btn quiet" onClick={() => finish(false)}>Skip setup</button>}
            {(id === 'business' || id === 'goals') && <button type="button" className="btn quiet" onClick={() => setStep((s) => Math.min(s + 1, flow.length - 1))}>Skip this step</button>}
            {id !== 'ready' && (
              <button type="button" className="btn primary" onClick={next} disabled={seeding} data-autofocus={id === 'welcome' || undefined}>
                {seeding ? <><span className="spin" aria-hidden="true" /> Adding sample data…</> : id === 'welcome' ? 'Get started' : 'Continue'}
                {!seeding && <Icon name="arrow" />}
              </button>
            )}
            {id === 'ready' && (
              <>
                <button type="button" className="btn ghost" onClick={() => finish(false)}>{demo ? "Start exploring" : "Go to my workspace"}</button>
                <button type="button" className="btn primary" data-autofocus onClick={() => finish(true)}>Take the tour <Icon name="arrow" /></button>
              </>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}
