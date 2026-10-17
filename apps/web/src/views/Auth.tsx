import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setCredentials } from '../store/authSlice';
import { setAuthMode, setIntroSeen } from '../store/uiSlice';
import type { AuthMode } from '../store/uiSlice';
import { useLoginMutation, useRegisterMutation } from '../services/api';
import { DEMO, useEnterDemo } from '../onboarding/useEnterDemo';
import { cx } from '../utils';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';
import { useThemeSwitch } from '../ui/useThemeSwitch';

type Mode = AuthMode;
type Errors = Partial<Record<'name' | 'email' | 'password' | 'form', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 0–4 score with a label: length, mixed case, digits, symbols. */
function strength(pw: string) {
  if (!pw) return { score: 0, label: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length < 8) s = Math.min(s, 1);
  return { score: s, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][s] };
}

/** Turn an RTK Query error into the message to show. */
function describe(err: any, mode: Mode): Errors {
  const status = err?.status;
  if (status === 'FETCH_ERROR') return { form: 'We can’t reach the BizzNex server. Check your connection and try again.' };
  if (status === 401) return { form: 'That email and password don’t match an account.' };
  if (status === 409) return { email: 'An account with this email already exists.' };
  const fields = err?.data?.errors?.fieldErrors as Record<string, string[]> | undefined;
  if (fields) {
    return {
      name: fields.name?.[0], email: fields.email?.[0], password: fields.password?.[0],
    };
  }
  return { form: mode === 'signin' ? 'We couldn’t sign you in. Try again.' : 'We couldn’t create your account. Try again.' };
}

const FEATURES = [
  { icon: 'folder', t: 'Projects & tasks', b: 'Plan the work and track progress.' },
  { icon: 'briefcase', t: 'CRM pipeline', b: 'Contacts, companies and deals, from lead to won.' },
  { icon: 'upload', t: 'Publishing', b: 'Social posts and newsletters, written once.' },
  { icon: 'chat', t: 'Built-in assistant', b: 'Answers from your own data, inside BizzNex.' },
];

export default function Auth() {
  const dispatch = useAppDispatch();
  const switchTheme = useThemeSwitch();
  const theme = useAppSelector((s) => s.ui.theme);
  const mode: Mode = useAppSelector((s) => s.ui.authMode) ?? 'signup';
  const setMode = (m: Mode) => dispatch(setAuthMode(m));
  const demo = useEnterDemo();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const firstRef = useRef<HTMLInputElement>(null);

  const [login, { isLoading: li }] = useLoginMutation();
  const [register, { isLoading: ri }] = useRegisterMutation();
  const loading = li || ri || demo.loading;
  const pw = strength(password);

  useEffect(() => { firstRef.current?.focus(); }, [mode]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (mode === 'signup' && !name.trim()) e.name = 'Enter your name.';
    if (!email.trim()) e.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'That doesn’t look like a valid email address.';
    if (!password) e.password = 'Enter your password.';
    else if (mode === 'signup' && password.length < 8) e.password = 'Use at least 8 characters.';
    return e;
  };

  // Field errors appear once a field has been left (or on submit), never while typing for the first time.
  const shown = (k: keyof Errors) => (touched[k] || touched.submit ? errors[k] : undefined);
  useEffect(() => { if (Object.keys(touched).length) setErrors((prev) => ({ ...validate(), form: prev.form })); }, [name, email, password, mode]);

  const switchMode = (m: Mode) => { setMode(m); setErrors({}); setTouched({}); };

  const authenticate = async (creds: { email: string; password: string; name?: string }, m: Mode) => {
    try {
      const res = m === 'signin'
        ? await login({ email: creds.email, password: creds.password }).unwrap()
        : await register({ email: creds.email, password: creds.password, name: creds.name ?? '' }).unwrap();
      // the shared demo account is always a demo session, however it was entered
      const kind = res.user.email === DEMO.email ? 'demo' : m;
      dispatch(setCredentials({ token: res.token, user: res.user, kind }));
    } catch (err) {
      setErrors(describe(err, m));
      setTouched((t) => ({ ...t, submit: true }));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    setTouched((t) => ({ ...t, submit: true }));
    setErrors(v);
    if (Object.keys(v).length) {
      document.querySelector<HTMLInputElement>(`#auth-${Object.keys(v)[0]}`)?.focus();
      return;
    }
    await authenticate({ email: email.trim(), password, name: name.trim() }, mode);
  };

  const enterDemo = () => { setEmail(DEMO.email); setErrors({}); demo.enter(); };

  const onPwKey = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.('CapsLock') ?? false);

  return (
    <div className="auth2">
      <section className="auth2-story" aria-hidden="true">
        <div className="bloom" />
        <div className="brand" style={{ padding: 0, fontSize: 26 }}><Logo rule /></div>
        <div className="auth2-pitch">
          <p className="spec"><span className="k">Business suite</span><span>Workspace · CRM · Tools</span></p>
          <h2>Run your whole business from one place.</h2>
          <ul>
            {FEATURES.map((f) => (
              <li key={f.t}><Icon name={f.icon} /><div><b>{f.t}</b><span>{f.b}</span></div></li>
            ))}
          </ul>
        </div>
        <p className="cap">Set up in about two minutes. Start with sample data or an empty workspace.</p>
      </section>

      <section className="auth2-form-wrap">
        <div className="auth2-top">
          <div className="brand auth2-mbrand" style={{ padding: 0 }}><Logo /></div>
          <button type="button" className="tgl auth2-back" onClick={() => dispatch(setIntroSeen(false))}>
            <Icon name="arrow" size={14} style={{ transform: 'scaleX(-1)' }} /> <span className="tgl-text">BizzNex home</span>
          </button>
          <button type="button" className="tgl" onClick={switchTheme} aria-label="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
          </button>
        </div>

        <form className="auth2-form" onSubmit={submit} noValidate>
          <div className="seg auth2-tabs" role="tablist" aria-label="Account">
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>Create account</button>
            <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'on' : ''} onClick={() => switchMode('signin')}>Sign in</button>
          </div>

          <h1>{mode === 'signup' ? 'Create your workspace' : 'Welcome back'}</h1>
          <p className="auth2-sub">{mode === 'signup' ? 'It takes about two minutes to set up.' : 'Sign in to pick up where you left off.'}</p>

          {(errors.form || demo.error) && <div className="auth2-alert" role="alert"><Icon name="x" size={14} />{errors.form || demo.error}</div>}

          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="auth-name">Full name</label>
              <input id="auth-name" ref={firstRef} className={cx('inp', shown('name') && 'bad')} value={name} autoComplete="name"
                placeholder="Alex Rivera" onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                aria-invalid={!!shown('name')} aria-describedby={shown('name') ? 'err-name' : undefined} />
              {shown('name') && <p className="field-err" id="err-name">{shown('name')}</p>}
            </div>
          )}

          <div className="field">
            <label htmlFor="auth-email">{mode === 'signup' ? 'Work email' : 'Email'}</label>
            <input id="auth-email" ref={mode === 'signin' ? firstRef : undefined} className={cx('inp', shown('email') && 'bad')} type="email" value={email}
              autoComplete="email" inputMode="email" placeholder="you@company.com"
              onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              aria-invalid={!!shown('email')} aria-describedby={shown('email') ? 'err-email' : undefined} />
            {shown('email') && (
              <p className="field-err" id="err-email">
                {shown('email')}
                {errors.email?.includes('already exists') && <> <button type="button" className="inline-link" onClick={() => switchMode('signin')}>Sign in instead</button></>}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <div className="pw-wrap">
              <input id="auth-password" className={cx('inp', shown('password') && 'bad')} type={show ? 'text' : 'password'} value={password}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
                onChange={(e) => setPassword(e.target.value)} onKeyUp={onPwKey} onKeyDown={onPwKey}
                onBlur={() => { setTouched((t) => ({ ...t, password: true })); setCaps(false); }}
                aria-invalid={!!shown('password')} aria-describedby="pw-hint" />
              <button type="button" className="pw-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
            <div id="pw-hint">
              {shown('password') && <p className="field-err">{shown('password')}</p>}
              {caps && <p className="field-warn">Caps Lock is on.</p>}
              {mode === 'signup' && password && (
                <div className="pw-meter" aria-live="polite">
                  <div className={`pw-bars s${pw.score}`}>{[1, 2, 3, 4].map((n) => <i key={n} className={n <= pw.score ? 'on' : ''} />)}</div>
                  <span>{pw.label}</span>
                </div>
              )}
            </div>
          </div>

          <button className="btn primary auth2-submit" disabled={loading}>
            {loading ? <><span className="spin" aria-hidden="true" /> {mode === 'signup' ? 'Creating your workspace…' : 'Signing in…'}</>
              : <>{mode === 'signup' ? 'Create account' : 'Sign in'} <Icon name="arrow" /></>}
          </button>

          <div className="auth2-or"><span>or</span></div>
          <button type="button" className="btn ghost auth2-demo" onClick={enterDemo} disabled={loading}>
            <Icon name="sparkle" /> Explore the demo workspace
          </button>

          <p className="auth2-switch">
            {mode === 'signup'
              ? <>Already have an account? <button type="button" className="inline-link" onClick={() => switchMode('signin')}>Sign in</button></>
              : <>New to BizzNex? <button type="button" className="inline-link" onClick={() => switchMode('signup')}>Create an account</button></>}
          </p>
        </form>
      </section>
    </div>
  );
}
