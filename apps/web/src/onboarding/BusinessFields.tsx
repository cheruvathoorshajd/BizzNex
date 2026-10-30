import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { CompanyMatch } from '@bizznex/shared';
import { useLazyLookupCompaniesQuery } from '../services/api';
import { errorText } from '../services/errors';
import { cx } from '../utils';
import { COUNTRIES, INDUSTRIES, ROLES, TEAM_SIZES, countryCodeFor } from './content';

export interface BusinessProfile {
  company: string;
  website: string;
  industry: string;
  country: string;
  logoUrl: string;
  role: string;
  teamSize: string;
}
export type BusinessErrors = Partial<Record<keyof BusinessProfile, string>>;

export const profileFrom = (p?: Partial<BusinessProfile>): BusinessProfile => ({
  company: p?.company ?? '', website: p?.website ?? '', industry: p?.industry ?? '', country: p?.country ?? '',
  logoUrl: p?.logoUrl ?? '', role: p?.role ?? '', teamSize: p?.teamSize ?? '',
});

/** A bare domain or a full URL; spaces and missing dots are what people actually get wrong. */
const looksLikeWebsite = (v: string) => /^(https?:\/\/)?[^\s/]+\.[^\s/]{2,}(\/\S*)?$/i.test(v.trim());

/** Required answers for the setup step (name and industry: the industry shapes the checklist); Settings only checks the website. */
export function validateBusiness(p: BusinessProfile, { required }: { required: boolean }): BusinessErrors {
  const e: BusinessErrors = {};
  if (required) {
    if (!p.company.trim()) e.company = 'Enter your company or workspace name.';
    if (!p.industry) e.industry = 'Choose the industry closest to yours.';
  }
  if (p.website.trim() && !looksLikeWebsite(p.website)) e.website = 'Enter a web address like yourcompany.com.';
  return e;
}

/** The order the fields appear in, for moving focus to the first problem. */
export const FIELD_ORDER: (keyof BusinessProfile)[] = ['company', 'website', 'industry', 'country', 'role', 'teamSize'];

interface Props {
  value: BusinessProfile;
  onChange: (patch: Partial<BusinessProfile>) => void;
  errors?: BusinessErrors;
  /** id prefix, so the wizard and Settings can both be on the page without clashes */
  idp: string;
  autoFocus?: boolean;
}

export default function BusinessFields({ value, onChange, errors = {}, idp, autoFocus }: Props) {
  const [filled, setFilled] = useState<CompanyMatch | null>(null);
  const id = (k: string) => `${idp}-${k}`;
  const err = (k: keyof BusinessProfile) => errors[k] && <p className="field-err" id={id(`${k}-err`)} role="alert">{errors[k]}</p>;
  const a11y = (k: keyof BusinessProfile) => ({ 'aria-invalid': !!errors[k] || undefined, 'aria-describedby': errors[k] ? id(`${k}-err`) : undefined });
  const focus = (k: string) => document.getElementById(id(k))?.focus();
  // Enter moves to the next answer instead of submitting the step
  const enterTo = (k: string) => (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); focus(k); } };

  const pick = (m: CompanyMatch) => {
    setFilled(m);
    const country = m.countryCode || countryCodeFor(m.country);
    onChange({
      company: m.name,
      ...(m.website && { website: m.website }),
      ...(m.industry && { industry: m.industry }),
      ...(m.teamSize && { teamSize: m.teamSize }),
      ...(country && { country }),
      logoUrl: m.logoUrl ?? '',
    });
    focus('website');
  };

  return (
    <div className="biz">
      <CompanySearch
        inputId={id('company')} value={value.company} logoUrl={value.logoUrl} autoFocus={autoFocus} a11y={a11y('company')}
        onType={(company) => { setFilled(null); onChange({ company, logoUrl: '' }); }}
        onPick={pick} onEnter={() => focus('website')}
      />
      {err('company')}
      {filled && (
        <p className="biz-filled" role="status">
          Filled in from Wikidata: {[filled.website && 'website', filled.industry && 'industry', filled.teamSize && 'team size', (filled.countryCode || countryCodeFor(filled.country)) && 'country', filled.logoUrl && 'logo (from Wikimedia Commons)']
            .filter(Boolean).join(', ') || 'name only'}. Check them below.
        </p>
      )}

      <div className="biz-grid">
        <div className="field">
          <label htmlFor={id('website')}>Website <span className="biz-opt">optional</span></label>
          <input id={id('website')} className="inp" type="url" inputMode="url" autoComplete="url" placeholder="yourcompany.com"
            value={value.website} maxLength={200} onChange={(e) => onChange({ website: e.target.value })} onKeyDown={enterTo('industry')} {...a11y('website')} />
          {err('website')}
        </div>
        <div className="field">
          <label htmlFor={id('industry')}>Industry</label>
          <select id={id('industry')} className="inp" value={value.industry} onChange={(e) => onChange({ industry: e.target.value })} {...a11y('industry')}>
            <option value="">Choose an industry</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          {err('industry')}
        </div>
        <div className="field">
          <label htmlFor={id('country')}>Country <span className="biz-opt">optional</span></label>
          <select id={id('country')} className="inp" value={value.country} onChange={(e) => onChange({ country: e.target.value })}>
            <option value="">Choose a country</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <Chips id={id('role')} label={<>What best describes your role? <span className="biz-opt">optional</span></>} options={ROLES} value={value.role} onPick={(role) => onChange({ role })} error={errors.role} />
      <Chips id={id('teamSize')} label={<>How many people work there? <span className="biz-opt">optional</span></>} options={TEAM_SIZES} value={value.teamSize} onPick={(teamSize) => onChange({ teamSize })} error={errors.teamSize} />
    </div>
  );
}

function Chips({ id, label, options, value, onPick, error }: { id: string; label: ReactNode; options: readonly string[]; value: string; onPick: (v: string) => void; error?: string }) {
  return (
    <div className="ob-field">
      <div className="ob-label" id={`${id}-label`}>{label}</div>
      <div className="ob-chips" role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={error ? `${id}-err` : undefined}>
        {options.map((o, i) => (
          <button key={o} id={i === 0 ? id : undefined} type="button" role="radio" aria-checked={value === o}
            className={cx('chip', value === o && 'on')} onClick={() => onPick(o)}>{o}</button>
        ))}
      </div>
      {error && <p className="field-err" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  );
}

/* ── company name with live suggestions (ARIA combobox) ── */
function CompanySearch({ inputId, value, logoUrl, autoFocus, a11y, onType, onPick, onEnter }: {
  inputId: string; value: string; logoUrl: string; autoFocus?: boolean; a11y: Record<string, unknown>;
  onType: (v: string) => void; onPick: (m: CompanyMatch) => void; onEnter: () => void;
}) {
  const [search] = useLazyLookupCompaniesQuery();
  const [items, setItems] = useState<CompanyMatch[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef(false);
  const latest = useRef('');
  const listId = useId();

  // search a moment after typing stops; ignore answers to older queries
  useEffect(() => {
    const q = value.trim();
    if (!typed.current || q.length < 2) { setItems([]); setStatus('idle'); return; }
    const t = setTimeout(async () => {
      latest.current = q;
      setStatus('loading');
      try {
        const found = await search(q, true).unwrap();
        if (latest.current !== q) return;
        setItems(found); setActive(-1); setStatus('done'); setOpen(true);
      } catch (e) {
        if (latest.current !== q) return;
        setItems([]); setStatus('error'); setMessage(errorText(e, 'Company search isn’t available right now.')); setOpen(true);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [value, search]);

  const choose = (m: CompanyMatch) => { typed.current = false; setOpen(false); setItems([]); setStatus('idle'); onPick(m); };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setOpen(true); setActive((i) => (i + 1) % items.length); }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setActive((i) => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'Enter') {
      e.preventDefault(); // never submits the step
      if (open && active >= 0 && items[active]) choose(items[active]);
      else { setOpen(false); onEnter(); }
    }
  };

  const showList = open && status !== 'idle' && status !== 'loading';
  return (
    <div className="field biz-company">
      <label htmlFor={inputId}>Company or workspace name</label>
      <div className="biz-combo">
        {logoUrl && <img className="biz-logo" src={logoUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        <input
          id={inputId} className={cx('inp', logoUrl && 'has-logo')} value={value} maxLength={120} autoComplete="organization"
          placeholder="Start typing — we’ll look it up" data-autofocus={autoFocus || undefined}
          role="combobox" aria-autocomplete="list" aria-expanded={showList} aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined} {...a11y}
          onChange={(e) => { typed.current = true; onType(e.target.value); }}
          onKeyDown={onKeyDown} onFocus={() => items.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
        {status === 'loading' && <span className="spin biz-spin" aria-label="Searching" />}
        {showList && (
          <div className="biz-pop">
            {status === 'done' && items.length > 0 && (
              <ul id={listId} role="listbox" aria-label="Matching companies">
                {items.map((m, i) => (
                  // keyboard is handled on the combobox input (aria-activedescendant); clicks land here
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <li key={m.id} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={cx('biz-opt-row', i === active && 'on')}
                    onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => choose(m)}>
                    <span className="biz-mark">{m.logoUrl ? <img src={m.logoUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}{m.name.slice(0, 1)}</span>
                    <span className="biz-opt-t"><b>{m.name}</b><small>{[m.description, m.domain].filter(Boolean).join(' · ')}</small></span>
                  </li>
                ))}
              </ul>
            )}
            {status === 'done' && !items.length && (
              <p className="biz-note" id={listId}>No listed company called “{value.trim()}”. That’s fine — fill in the details below.</p>
            )}
            {status === 'error' && <p className="biz-note" id={listId}>{message} Fill in the details below.</p>}
            <p className="biz-src">Public company data from Wikidata, logos from Wikimedia Commons · free, no account needed</p>
          </div>
        )}
      </div>
    </div>
  );
}
