import { useState, useId } from 'react';
import {
  useGetActivitiesQuery, useCreateActivityMutation, useUpdateActivityMutation, useDeleteActivityMutation,
  useGetContactsQuery, useGetDealsQuery,
} from '../services/api';
import { ACTIVITY_TYPES } from '@bizznex/shared';
import type { ActivityType } from '../types';
import { useToast } from '../ui/Toast';
import Icon from '../ui/Icon';
import { fromDateInput, fmtDay } from '../utils';
import { errorText } from '../services/errors';
import { useConfirm } from '../ui/Confirm';
import LoadError from '../ui/LoadError';
import { rows } from '../ui/motion';

/** The stored 'Task' type is a to-do on a contact or deal, not a project task: say so. */
const typeLabel = (t: ActivityType) => (t === 'Task' ? 'Follow-up' : t);

export default function Activities({ query = '' }: { query?: string }) {
  const fid = useId(); // pairs each visible label with its field
  const toast = useToast();
  const confirm = useConfirm();
  const { data: activities = [], isLoading: fetching, isError, error, refetch } = useGetActivitiesQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const { data: contacts = [] } = useGetContactsQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const [createActivity, { isLoading: creating }] = useCreateActivityMutation();
  const [updateActivity] = useUpdateActivityMutation();
  const [deleteActivity] = useDeleteActivityMutation();

  const [type, setType] = useState<ActivityType>('Call');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');

  const contactName = (id: string | null) => contacts.find((c) => c.id === id)?.name ?? '';
  const dealName = (id: string | null) => deals.find((d) => d.id === id)?.title ?? '';

  const q = query.trim().toLowerCase();
  const shown = q
    ? activities.filter((a) => (a.subject + a.notes + a.type + typeLabel(a.type) + contactName(a.contactId) + dealName(a.dealId)).toLowerCase().includes(q))
    : activities;

  const add = async () => {
    if (creating) return; // Enter or a double-click while saving
    if (!subject.trim()) return;
    try {
      await createActivity({
        type, subject: subject.trim(), notes: notes.trim(), done: false,
        dueDate: fromDateInput(dueDate),
        contactId: contactId || null, dealId: dealId || null,
      }).unwrap();
      setSubject(''); setNotes(''); setDueDate(''); setContactId(''); setDealId('');
      toast('Activity logged');
    } catch (err) { toast(errorText(err)); }
  };

  const toggle = async (id: string, done: boolean) => {
    try { await updateActivity({ id, body: { done: !done } }).unwrap(); }
    catch (err) { toast(errorText(err)); }
  };

  const remove = async (id: string, name: string) => {
    if (!(await confirm({ title: `Delete “${name}”?`, confirmLabel: 'Delete activity' }))) return;
    try { await deleteActivity(id).unwrap(); toast('Deleted'); }
    catch (err) { toast(errorText(err)); }
  };

  return (
    <div>
      <div className="view-head">
        <p className="spec"><span className="k">§ CRM</span><span>{activities.length} activities</span><span>{activities.filter((a) => !a.done).length} open</span></p>
        <h1 className="view-title">Activities</h1>
      </div>

      <div className="crm-cols">
        <div className="panel">
          <div className="sublab" style={{ marginTop: 0 }}>§ Log activity</div>
          <div className="field"><label htmlFor={`${fid}-type`}>Type</label>
            <select id={`${fid}-type`} className="inp" value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
              {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor={`${fid}-subject`}>Subject</label><input id={`${fid}-subject`} className="inp" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="field"><label htmlFor={`${fid}-notes`}>Notes</label><textarea id={`${fid}-notes`} className="inp" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="field"><label htmlFor={`${fid}-due-date`}>Due date</label><input id={`${fid}-due-date`} className="inp" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div className="field"><label htmlFor={`${fid}-contact`}>Contact</label>
            <select id={`${fid}-contact`} className="inp" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">— None —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor={`${fid}-deal`}>Deal</label>
            <select id={`${fid}-deal`} className="inp" value={dealId} onChange={(e) => setDealId(e.target.value)}>
              <option value="">— None —</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <button className="btn primary" onClick={add} disabled={!subject.trim() || creating}>Log activity</button>
        </div>

        <div ref={rows}>
          <div className="sublab" style={{ marginTop: 0 }}>§ Timeline</div>
          {isError ? <LoadError what="activities" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}
          {!isLoading && shown.length === 0 && <div className="cap" style={{ padding: '16px 0' }}>{q ? `No matches for “${query.trim()}”.` : 'No activities logged yet.'}</div>}
          {shown.map((a) => {
            const rel = [contactName(a.contactId), dealName(a.dealId)].filter(Boolean).join(' · ');
            return (
              <div className="titem" key={a.id}>
                <span className="actkind">{typeLabel(a.type)}</span>
                <span className="nm" style={a.done ? { textDecoration: 'line-through', opacity: .6 } : undefined}>
                  {a.subject}
                  {(rel || a.notes) && <div className="desc">{[rel, a.notes].filter(Boolean).join(' — ')}</div>}
                </span>
                <span className="dt">{a.dueDate ? fmtDay(a.dueDate) : ''}</span>
                <span className="row-act">
                  <button className="btn quiet sm" onClick={() => toggle(a.id, a.done)} aria-label={a.done ? 'Mark open' : 'Mark done'}>
                    <Icon name={a.done ? 'refresh' : 'tick'} size={14} />
                  </button>
                  <button className="btn quiet sm" onClick={() => remove(a.id, a.subject)} aria-label="Delete"><Icon name="trash" size={14} /></button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
