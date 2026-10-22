import { useLayoutEffect, useRef, useState } from 'react';
import {
  useGetDealsQuery, useCreateDealMutation, useUpdateDealMutation, useDeleteDealMutation,
  useGetContactsQuery, useGetCompaniesQuery,
} from '../services/api';
import { DEAL_STAGES } from '@bizznex/shared';
import type { Deal, DealStage } from '../types';
import { useToast } from '../ui/Toast';
import Icon from '../ui/Icon';
import { fmtMoney, fmtDay, cx } from '../utils';
import { errorText } from '../services/errors';
import { useConfirm } from '../ui/Confirm';
import LoadError from '../ui/LoadError';
import { animate } from '../ui/motion';

/** ◀/▶ walk these; Won and Lost are end states, reached by "Mark won"/"Mark lost" and left by "Reopen". */
const OPEN_STAGES: DealStage[] = ['Lead', 'Qualified', 'Proposal'];
const isClosed = (s: DealStage) => s === 'Won' || s === 'Lost';

export default function Deals({ query = '' }: { query?: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: deals = [], isLoading: fetching, isError, error, refetch } = useGetDealsQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const { data: contacts = [] } = useGetContactsQuery();
  const { data: companies = [] } = useGetCompaniesQuery();
  const [createDeal, { isLoading: creating }] = useCreateDealMutation();
  const [updateDeal] = useUpdateDealMutation();
  const [deleteDeal] = useDeleteDealMutation();

  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState<DealStage>('Lead');
  const [contactId, setContactId] = useState('');
  const [companyId, setCompanyId] = useState('');

  const nameOf = (id: string | null, list: { id: string; name: string }[]) => list.find((x) => x.id === id)?.name ?? '';

  const q = query.trim().toLowerCase();
  const shown = q
    ? deals.filter((d) => (d.title + nameOf(d.contactId, contacts) + nameOf(d.companyId, companies)).toLowerCase().includes(q))
    : deals;

  const add = async () => {
    if (creating) return; // Enter or a double-click while saving
    if (!title.trim()) return;
    try {
      await createDeal({
        title: title.trim(), value: Math.round(Number(value)) || 0, stage,
        contactId: contactId || null, companyId: companyId || null,
      }).unwrap();
      setTitle(''); setValue(''); setStage('Lead'); setContactId(''); setCompanyId('');
      toast('Deal created');
    } catch (err) { toast(errorText(err)); }
  };

  // a moved card lifts, arcs across to its new column and settles (see ui/motion.ts)
  const flights = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    flights.current.forEach((from, id) => {
      const el = document.querySelector<HTMLElement>(`[data-deal="${id}"]`);
      if (!el) return;
      flights.current.delete(id);
      const to = el.getBoundingClientRect(), dx = from.left - to.left, dy = from.top - to.top;
      if (!dx && !dy) return;
      el.style.zIndex = '5';
      const a = animate(el, [
        { transform: `translate(${dx}px, ${dy}px) scale(1)`, boxShadow: '0 0 0 rgba(0,0,0,0)' },
        { transform: `translate(${dx / 2}px, ${dy / 2 - 18}px) scale(1.06)`, boxShadow: '0 16px 30px -12px rgba(20,16,10,.45)', offset: .5 },
        { transform: 'none', boxShadow: '0 0 0 rgba(0,0,0,0)' },
      ], 480);
      const done = () => { el.style.zIndex = ''; };
      if (a) a.finished.then(done, done); else done();
    });
  }, [deals]);

  // the server stamps the close date and posts the "Deal won" notification
  const changeStage = async (d: Deal, next: DealStage) => {
    if (next === d.stage) return;
    const card = document.querySelector<HTMLElement>(`[data-deal="${d.id}"]`);
    if (card) flights.current.set(d.id, card.getBoundingClientRect());
    try { await updateDeal({ id: d.id, body: { stage: next } }).unwrap(); }
    catch (err) { toast(errorText(err)); }
  };
  const move = (d: Deal, dir: -1 | 1) => {
    const i = OPEN_STAGES.indexOf(d.stage);
    if (i < 0) return;
    return changeStage(d, OPEN_STAGES[Math.min(OPEN_STAGES.length - 1, Math.max(0, i + dir))]);
  };

  const remove = async (id: string, name: string) => {
    if (!(await confirm({ title: `Delete “${name}”?`, confirmLabel: 'Delete deal' }))) return;
    try { await deleteDeal(id).unwrap(); toast('Deleted'); }
    catch (err) { toast(errorText(err)); }
  };

  const pipelineValue = deals.filter((d) => !isClosed(d.stage)).reduce((s, d) => s + d.value, 0);
  const wonValue = deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="view-head">
        <p className="spec"><span className="k">§ CRM</span><span>{deals.length} deals</span><span>Pipeline {fmtMoney(pipelineValue)}</span><span>Won {fmtMoney(wonValue)}</span></p>
        <h1 className="view-title">Deals</h1>
      </div>

      <div className="panel">
        <div className="sublab" style={{ marginTop: 0 }}>§ New deal</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}><label>Title</label><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="field" style={{ margin: 0 }}><label>Value ($)</label><input className="inp num" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} /></div>
          <div className="field" style={{ margin: 0 }}><label>Stage</label>
            <select className="inp" value={stage} onChange={(e) => setStage(e.target.value as DealStage)}>
              {DEAL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}><label>Contact</label>
            <select className="inp" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">— None —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}><label>Company</label>
            <select className="inp" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">— None —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button className="btn primary" onClick={add} disabled={!title.trim() || creating}>Add deal</button>
        </div>
      </div>

      {isError ? <LoadError what="deals" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}
      {!isLoading && deals.length === 0 && <div className="cap" style={{ padding: '16px 0' }}>No deals yet — add one above.</div>}

      {deals.length > 0 && (
        <div className="pipeline mt-4">
          {DEAL_STAGES.map((s) => {
            const col = shown.filter((d) => d.stage === s);
            const total = col.reduce((sum, d) => sum + d.value, 0);
            return (
              <div key={s} className={cx('pcol', s === 'Won' && 'won', s === 'Lost' && 'lost')}>
                <div className="phead">
                  <span className="pt">{s} · {col.length}</span>
                  <span className="pv num">{fmtMoney(total)}</span>
                </div>
                {col.map((d) => {
                  const i = OPEN_STAGES.indexOf(d.stage);
                  return (
                    <div className="dcard" key={d.id} data-deal={d.id}>
                      <div className="dt">{d.title}</div>
                      {(d.contactId || d.companyId) && (
                        <div className="dm">{[nameOf(d.contactId, contacts), nameOf(d.companyId, companies)].filter(Boolean).join(' · ')}</div>
                      )}
                      <div className="dval num">{fmtMoney(d.value)}</div>
                      {isClosed(d.stage) && d.closeDate && <div className="dm">Closed {fmtDay(d.closeDate)}</div>}
                      <div className="dnav" style={{ flexWrap: 'wrap' }}>
                        {isClosed(d.stage) ? (
                          <button className="btn ghost sm" onClick={() => changeStage(d, 'Proposal')}>Reopen</button>
                        ) : (<>
                          <button className="btn ghost sm" onClick={() => move(d, -1)} disabled={i === 0} aria-label="Move back">◀</button>
                          <button className="btn ghost sm" onClick={() => move(d, 1)} disabled={i === OPEN_STAGES.length - 1} aria-label="Move forward">▶</button>
                          <button className="btn ghost sm" onClick={() => changeStage(d, 'Won')}>Mark won</button>
                          <button className="btn ghost sm" onClick={() => changeStage(d, 'Lost')}>Mark lost</button>
                        </>)}
                        <button className="btn quiet sm" onClick={() => remove(d.id, d.title)} aria-label="Delete" style={{ marginLeft: 'auto' }}><Icon name="trash" size={13} /></button>
                      </div>
                    </div>
                  );
                })}
                {col.length === 0 && <div className="cap" style={{ padding: '4px 0', opacity: .6 }}>—</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
