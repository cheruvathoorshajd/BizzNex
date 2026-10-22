import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { START_PAGES } from '@bizznex/shared';
import type { Industry, OnboardingGoal, UserPreferences } from '@bizznex/shared';
import { useAppDispatch, useAppSelector } from '../store';
import { logout, refreshCredentials } from '../store/authSlice';
import { errorText } from '../services/errors';
import { setAuthMode, setLanguage, setTheme, themeMode } from '../store/uiSlice';
import {
  useChangePasswordMutation, useClearSampleMutation, useDeleteAccountMutation, useLazyExportDataQuery,
  useRevokeSessionsMutation, useSeedSampleMutation, useUpdatePreferencesMutation, useUpdateProfileMutation,
} from '../services/api';
import { useConfirm } from '../ui/Confirm';
import { useOnboarding } from '../onboarding/useOnboarding';
import { GOALS } from '../onboarding/content';
import BusinessFields, { profileFrom, validateBusiness } from '../onboarding/BusinessFields';
import type { BusinessErrors, BusinessProfile } from '../onboarding/BusinessFields';
import { LABELS } from '../nav';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import { cx, fmtDate } from '../utils';
import Icon from '../ui/Icon';
import type { Language, ViewId } from '../types';

export type SettingsSection = 'profile' | 'workspace' | 'preferences' | 'notifications' | 'security' | 'data' | 'help' | 'delete';

const SECTIONS: { id: SettingsSection; label: string; icon: string; hint: string }[] = [
  { id: 'profile', label: 'Profile', icon: 'user', hint: 'Your name and email' },
  { id: 'workspace', label: 'Workspace', icon: 'building', hint: 'Business details and plan' },
  { id: 'preferences', label: 'Preferences', icon: 'grid', hint: 'Theme, language, start page' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', hint: 'What we tell you about' },
  { id: 'security', label: 'Security', icon: 'check', hint: 'Password and sessions' },
  { id: 'data', label: 'Data & privacy', icon: 'folder', hint: 'Export and sample data' },
  { id: 'help', label: 'Help & guides', icon: 'sparkle', hint: 'Tour, guides, shortcuts' },
  { id: 'delete', label: 'Delete account', icon: 'trash', hint: 'Remove everything' },
];

interface Props {
  section: SettingsSection;
  onSection: (s: SettingsSection) => void;
  onTour: () => void;
  onFeatureGuide: () => void;
  onBrand: () => void;
  /** Only for guided sessions (new accounts, demo), the same rule as the Help menu. */
  onSetup?: () => void;
}

const initials = (name?: string) =>
  (name || 'U').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'U';

function Card({ title, sub, children, foot, danger }: { title: string; sub?: string; children: ReactNode; foot?: ReactNode; danger?: boolean }) {
  return (
    <section className={cx('st-card', danger && 'danger')}>
      <header className="st-card-h"><h3>{title}</h3>{sub && <p>{sub}</p>}</header>
      <div className="st-card-b">{children}</div>
      {foot && <footer className="st-card-f">{foot}</footer>}
    </section>
  );
}

function Toggle({ id, checked, onChange, disabled, label, sub }: { id: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string; sub?: string }) {
  return (
    <div className="st-row">
      <div className="st-row-t"><label htmlFor={id}>{label}</label>{sub && <span>{sub}</span>}</div>
      <button id={id} type="button" role="switch" aria-checked={checked} className={cx('sw', checked && 'on')} disabled={disabled} onClick={() => onChange(!checked)} />
    </div>
  );
}

export default function Settings({ section, onSection, onTour, onFeatureGuide, onBrand, onSetup }: Props) {
  const t = useT();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(themeMode);
  const language = useAppSelector((s) => s.ui.language);
  const session = useAppSelector((s) => s.auth.session);
  const { user, state, update, demo } = useOnboarding();
  const prefs: UserPreferences = user?.preferences ?? {};
  const locked = demo; // the shared demo account is read-only

  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [updatePreferences] = useUpdatePreferencesMutation();
  const [changePassword, { isLoading: savingPw }] = useChangePasswordMutation();
  const [deleteAccount, { isLoading: deleting }] = useDeleteAccountMutation();
  const [revokeSessions, { isLoading: revoking }] = useRevokeSessionsMutation();
  const [fetchExport] = useLazyExportDataQuery();
  const confirm = useConfirm();
  const [seed, { isLoading: seeding }] = useSeedSampleMutation();
  const [clear, { isLoading: clearing }] = useClearSampleMutation();

  /* ── profile ── */
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profilePw, setProfilePw] = useState('');
  const [profileErr, setProfileErr] = useState('');
  useEffect(() => { setName(user?.name ?? ''); setEmail(user?.email ?? ''); }, [user?.name, user?.email]);
  // a new sign-in email takes the current password, like a new password does
  const emailChanged = email.trim().toLowerCase() !== (user?.email ?? '');
  const profileDirty = name.trim() !== (user?.name ?? '') || emailChanged;
  const saveProfile = async (e: FormEvent) => {
    e.preventDefault(); setProfileErr('');
    if (!name.trim()) { setProfileErr('Enter your name.'); return; }
    if (emailChanged && !profilePw) { setProfileErr('Enter your current password to change your email.'); return; }
    try {
      const res = await updateProfile({ name: name.trim(), email: email.trim(), ...(emailChanged && { currentPassword: profilePw }) }).unwrap();
      dispatch(refreshCredentials({ token: res.token, user: res.user }));
      setProfilePw('');
      toast('Profile saved');
    } catch (err) { setProfileErr(errorText(err)); }
  };

  /* ── workspace (the details from setup) ── */
  const [biz, setBiz] = useState<BusinessProfile>(() => profileFrom(state.profile));
  const [bizErrors, setBizErrors] = useState<BusinessErrors>({});
  const [goals, setGoals] = useState<OnboardingGoal[]>(state.profile?.goals ?? []);
  const saved = profileFrom(state.profile);
  const workspaceDirty = (Object.keys(saved) as (keyof BusinessProfile)[]).some((k) => biz[k] !== saved[k])
    || goals.join() !== (state.profile?.goals ?? []).join();
  const saveWorkspace = async (e: FormEvent) => {
    e.preventDefault();
    const errors = validateBusiness(biz, { required: false });
    setBizErrors(errors);
    if (Object.keys(errors).length) return;
    try {
      await update({ profile: {
        company: biz.company.trim(), website: biz.website.trim(), industry: biz.industry as Industry | '',
        country: biz.country, logoUrl: biz.logoUrl, role: biz.role, teamSize: biz.teamSize, goals,
      } });
      toast('Workspace details saved');
    } catch (err) { toast(errorText(err)); }
  };

  /* ── preferences & notifications (saved on the account) ── */
  const savePrefs = async (p: UserPreferences, msg: string) => {
    try { await updatePreferences(p).unwrap(); toast(msg); } catch (err) { toast(errorText(err)); }
  };
  const notif = prefs.notifications ?? {};

  /* ── security ── */
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwErr, setPwErr] = useState('');
  const savePassword = async (e: FormEvent) => {
    e.preventDefault(); setPwErr('');
    if (newPw.length < 8) { setPwErr('Use at least 8 characters for the new password.'); return; }
    if (newPw !== newPw2) { setPwErr('The two new passwords don’t match.'); return; }
    try {
      // other sessions are signed out; this one continues on the fresh token
      const res = await changePassword({ currentPassword: curPw, newPassword: newPw }).unwrap();
      dispatch(refreshCredentials({ token: res.token, user: res.user }));
      setCurPw(''); setNewPw(''); setNewPw2('');
      toast('Password changed · other sessions signed out');
    } catch (err) { setPwErr(errorText(err)); }
  };
  const signOutEverywhere = async () => {
    if (!(await confirm({
      title: 'Sign out of all devices?',
      body: 'Every browser and device signed in to this account is signed out. You stay signed in here.',
      confirmLabel: 'Sign out everywhere',
    }))) return;
    try {
      // the token version bump ends every session; this one continues on the fresh token
      const res = await revokeSessions().unwrap();
      dispatch(refreshCredentials({ token: res.token, user: res.user }));
      toast('Signed out of all other devices');
    } catch (err) { toast(errorText(err)); }
  };

  /* ── data ── */
  const [exporting, setExporting] = useState(false);
  const exportData = async () => {
    setExporting(true);
    try {
      // through the API layer, so an expired session signs out like everywhere else
      const records = await fetchExport().unwrap();
      const data = {
        exportedAt: new Date().toISOString(),
        account: { name: user?.name, email: user?.email, memberSince: user?.createdAt, workspace: state.profile ?? {}, preferences: prefs },
        ...records,
      };
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `bizznex-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Export downloaded');
    } catch { toast('The export didn’t finish. Try again.'); }
    setExporting(false);
  };

  /* ── delete ── */
  const [confirmEmail, setConfirmEmail] = useState('');
  const [delPw, setDelPw] = useState('');
  const [delErr, setDelErr] = useState('');
  const canDelete = !locked && confirmEmail.trim().toLowerCase() === (user?.email ?? '') && delPw.length > 0;
  const removeAccount = async (e: FormEvent) => {
    e.preventDefault(); setDelErr('');
    try {
      await deleteAccount({ password: delPw }).unwrap();
      dispatch(logout()); dispatch(setAuthMode('signup'));
      toast('Your account and all its data were deleted');
    } catch (err) { setDelErr(errorText(err)); }
  };

  const startOptions = useMemo(() => START_PAGES.map((v) => ({ v, label: t(LABELS[v as ViewId]) })), [t]);
  const kindLabel = session?.kind === 'demo' ? 'Demo visit' : session?.kind === 'signup' ? 'New account' : 'Signed in';
  const LANGS: { id: Language; label: string }[] = [{ id: 'en', label: 'English' }, { id: 'es', label: 'Español' }, { id: 'fr', label: 'Français' }];

  const body = (() => {
    switch (section) {
      case 'profile': return (
        <form onSubmit={saveProfile}>
          <Card title="Profile" sub="How you appear in BizzNex." foot={<>
            {profileErr && <p className="field-err" role="alert">{profileErr}</p>}
            <button className="btn primary sm" disabled={locked || !profileDirty || savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
          </>}>
            <div className="st-avatar"><span className="av big">{initials(name || user?.name)}</span><div><b>{user?.name}</b><span>Member since {user?.createdAt ? fmtDate(user.createdAt) : '—'}</span></div></div>
            <div className="st-fields">
              <div className="field"><label htmlFor="st-name">Full name</label><input id="st-name" className="inp" value={name} onChange={(e) => setName(e.target.value)} disabled={locked} autoComplete="name" maxLength={80} /></div>
              <div className="field"><label htmlFor="st-email">Email</label><input id="st-email" className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={locked} autoComplete="email" />
                <p className="st-help">You sign in with this email.</p></div>
              {emailChanged && !locked && (
                <div className="field full"><label htmlFor="st-profile-pw">Current password</label><input id="st-profile-pw" className="inp" type="password" value={profilePw} onChange={(e) => setProfilePw(e.target.value)} autoComplete="current-password" />
                  <p className="st-help">Needed to change the email you sign in with.</p></div>
              )}
            </div>
          </Card>
        </form>
      );
      case 'workspace': return (<>
        <form onSubmit={saveWorkspace} noValidate>
          <Card title="Workspace" sub="Your business details. They shape your getting-started checklist." foot={
            <button className="btn primary sm" disabled={!workspaceDirty}>Save workspace</button>}>
            <BusinessFields idp="st" value={biz} onChange={(p) => setBiz((b) => ({ ...b, ...p }))} errors={bizErrors} />
            <p className="st-label">Goals</p>
            <div className="ob-chips">{GOALS.map((g) => {
              const on = goals.includes(g.id);
              return <button key={g.id} type="button" className={cx('chip', on && 'on')} aria-pressed={on} onClick={() => setGoals((gs) => (on ? gs.filter((x) => x !== g.id) : [...gs, g.id]))}>{g.title}</button>;
            })}</div>
          </Card>
        </form>
        <Card title="Plan" sub="What your workspace includes.">
          <div className="st-row"><div className="st-row-t"><b>Free</b><span>Every feature, for you and your workspace. Paid plans and billing aren’t available yet.</span></div><span className="tag soft">Current plan</span></div>
        </Card>
      </>);
      case 'preferences': return (<>
        <Card title="Appearance" sub="Saved on this device.">
          <div className="st-row"><div className="st-row-t"><b>Theme</b><span>Light or dark.</span></div>
            <div className="seg" role="radiogroup" aria-label="Theme">{(['light', 'dark', 'system'] as const).map((m) => <button key={m} type="button" role="radio" aria-checked={theme === m} className={theme === m ? 'on' : ''} onClick={() => dispatch(setTheme(m))}>{m === 'light' ? 'Light' : m === 'dark' ? 'Dark' : 'System'}</button>)}</div></div>
          <div className="st-row"><div className="st-row-t"><b>Language</b><span>Navigation and app text.</span></div>
            <div className="seg" role="radiogroup" aria-label="Language">{LANGS.map((l) => <button key={l.id} type="button" role="radio" aria-checked={language === l.id} className={language === l.id ? 'on' : ''} onClick={() => dispatch(setLanguage(l.id))}>{l.label}</button>)}</div></div>
        </Card>
        <Card title="Start page" sub="Saved on your account, on every device.">
          <div className="st-row"><div className="st-row-t"><label htmlFor="st-start"><b>Open BizzNex on</b></label><span>The page you see after you sign in.</span></div>
            <select id="st-start" className="inp st-select" value={prefs.startPage ?? 'dashboard'} disabled={locked}
              onChange={(e) => savePrefs({ startPage: e.target.value as UserPreferences['startPage'] }, 'Start page saved')}>
              {startOptions.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select></div>
        </Card>
      </>);
      case 'notifications': return (<>
        <Card title="In the app" sub="Shown in Notifications.">
          <Toggle id="st-n-deal" label="A deal is won" sub="Add a notification when you move a deal to Won." checked={notif.dealWon !== false} disabled={locked}
            onChange={(v) => savePrefs({ notifications: { dealWon: v } }, v ? 'You’ll be notified about won deals' : 'Won-deal notifications turned off')} />
        </Card>
        <Card title="By email" sub="BizzNex doesn’t send email yet. Your choices are saved for when it does.">
          <Toggle id="st-n-week" label="Weekly summary" sub="Your pipeline, tasks and activity, every Monday." checked={notif.weeklySummary === true} disabled={locked}
            onChange={(v) => savePrefs({ notifications: { weeklySummary: v } }, 'Saved')} />
          <Toggle id="st-n-news" label="Product news" sub="New features and improvements, about once a month." checked={notif.productNews === true} disabled={locked}
            onChange={(v) => savePrefs({ notifications: { productNews: v } }, 'Saved')} />
        </Card>
      </>);
      case 'security': return (<>
        <form onSubmit={savePassword}>
          <Card title="Change password" sub="Use at least 8 characters." foot={<>
            {pwErr && <p className="field-err" role="alert">{pwErr}</p>}
            <button className="btn primary sm" disabled={locked || !curPw || !newPw || savingPw}>{savingPw ? 'Changing…' : 'Change password'}</button>
          </>}>
            <div className="st-fields">
              <div className="field full"><label htmlFor="st-cur">Current password</label><input id="st-cur" className="inp" type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} disabled={locked} autoComplete="current-password" /></div>
              <div className="field"><label htmlFor="st-new">New password</label><input id="st-new" className="inp" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} disabled={locked} autoComplete="new-password" /></div>
              <div className="field"><label htmlFor="st-new2">Repeat new password</label><input id="st-new2" className="inp" type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} disabled={locked} autoComplete="new-password" /></div>
            </div>
          </Card>
        </form>
        <Card title="Your session" sub="Where you’re signed in.">
          <div className="st-row"><div className="st-row-t"><b>This browser</b><span>{kindLabel}{session?.startedAt ? ` · since ${fmtDate(session.startedAt)}` : ''}</span></div><span className="tag soft">Current</span></div>
          <div className="st-row"><div className="st-row-t"><b>Sign out</b><span>End this session. Your data stays in your account.</span></div>
            <button type="button" className="btn ghost sm" onClick={() => dispatch(logout())}>Sign out</button></div>
          <div className="st-row"><div className="st-row-t"><b>Sign out of all devices</b><span>End every other session, for example on a lost or shared device. You stay signed in here.</span></div>
            <button type="button" className="btn ghost sm" onClick={signOutEverywhere} disabled={locked || revoking}>{revoking ? 'Signing out…' : 'Sign out everywhere'}</button></div>
        </Card>
      </>);
      case 'data': return (<>
        <Card title="Export your data" sub="Everything in your account, as one JSON file.">
          <div className="st-row"><div className="st-row-t"><b>Download a copy</b><span>Projects and tasks, contacts, companies, deals, activities, notes, posts, newsletters, events and notifications.</span></div>
            <button type="button" className="btn ghost sm" onClick={exportData} disabled={exporting}><Icon name="upload" size={14} style={{ transform: 'rotate(180deg)' }} /> {exporting ? 'Preparing…' : 'Export data'}</button></div>
        </Card>
        <Card title="Sample data" sub="An example business to explore with.">
          {locked ? <p className="st-help">The demo workspace already includes example data.</p> : state.sample ? (
            <div className="st-row"><div className="st-row-t"><b>Sample data is in your workspace</b><span>Remove it to keep only the records you created.</span></div>
              <button type="button" className="btn ghost sm" disabled={clearing} onClick={async () => { try { await clear().unwrap(); toast('Sample data removed'); } catch { toast('Couldn’t remove sample data'); } }}>{clearing ? 'Removing…' : 'Remove sample data'}</button></div>
          ) : (
            <div className="st-row"><div className="st-row-t"><b>Add sample data</b><span>Two projects, three companies, four deals, activities, notes, a post, a newsletter and events.</span></div>
              <button type="button" className="btn ghost sm" disabled={seeding} onClick={async () => { try { await seed().unwrap(); toast('Sample data added'); } catch { toast('Couldn’t add sample data'); } }}>{seeding ? 'Adding…' : 'Add sample data'}</button></div>
          )}
        </Card>
      </>);
      case 'help': return (<>
        <Card title="Guides" sub="Find your way around.">
          <div className="st-links">
            <button type="button" className="st-link" onClick={onTour}><Icon name="sparkle" /><span><b>Product tour</b><small>A one-minute walk through BizzNex</small></span></button>
            <button type="button" className="st-link" onClick={onFeatureGuide}><Icon name="grid" /><span><b>Feature guide</b><small>Every page, with links</small></span></button>
            {onSetup && <button type="button" className="st-link" onClick={onSetup}><Icon name="refresh" /><span><b>Run setup again</b><small>Business details, goals and look</small></span></button>}
            <button type="button" className="st-link" onClick={onBrand}><Icon name="building" /><span><b>Brand &amp; logo</b><small>The Skyline logo and how it was made</small></span></button>
          </div>
        </Card>
        <Card title="Keyboard shortcuts">
          <ul className="st-keys">
            <li><span>Open or close Help</span><kbd>?</kbd></li>
            <li><span>Close a window, menu or dialog</span><kbd>Esc</kbd></li>
            <li><span>Next or previous tour step</span><span><kbd>←</kbd> <kbd>→</kbd></span></li>
            <li><span>Open a tool in a floating window</span><span className="st-mouse">Right-click it in the sidebar</span></li>
          </ul>
        </Card>
      </>);
      case 'delete': return (
        <form onSubmit={removeAccount}>
          <Card danger title="Delete account" sub="This permanently deletes your account and everything in it. It can’t be undone." foot={<>
            {delErr && <p className="field-err" role="alert">{delErr}</p>}
            <button className="btn danger-solid sm" disabled={!canDelete || deleting}>{deleting ? 'Deleting…' : 'Delete my account'}</button>
          </>}>
            <p className="st-help">Export your data first if you want a copy. To confirm, type your email and enter your password.</p>
            <div className="st-fields">
              <div className="field"><label htmlFor="st-del-email">Your email</label><input id="st-del-email" className="inp" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} disabled={locked} placeholder={user?.email} autoComplete="off" /></div>
              <div className="field"><label htmlFor="st-del-pw">Password</label><input id="st-del-pw" className="inp" type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} disabled={locked} autoComplete="current-password" /></div>
            </div>
          </Card>
        </form>
      );
    }
  })();

  return (
    <div className="st">
      <div className="view-head">
        <p className="spec"><span className="k">§ Account</span><span>{user?.email}</span></p>
        <h1 className="view-title">Settings</h1>
      </div>

      {locked && (
        <div className="st-demo" role="status">
          <span className="stat-dot progress">Demo workspace</span>
          <span>Everyone shares this demo account, so its account settings are read-only. Theme and language still work.</span>
          <button type="button" className="btn primary sm" onClick={() => { dispatch(logout()); dispatch(setAuthMode('signup')); }}>Create your own account</button>
        </div>
      )}

      <div className="st-layout">
        <nav className="st-nav" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" className={cx('st-nav-i', section === s.id && 'on', s.id === 'delete' && 'warn')} aria-current={section === s.id ? 'page' : undefined} onClick={() => onSection(s.id)}>
              <Icon name={s.icon} size={16} />
              <span><b>{s.label}</b><small>{s.hint}</small></span>
            </button>
          ))}
        </nav>
        <div className="st-body" key={section}>{body}</div>
      </div>
    </div>
  );
}
