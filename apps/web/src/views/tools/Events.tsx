import { useState } from 'react';
import {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} from '../../services/api';
import { useToast } from '../../ui/Toast';
import Icon from '../../ui/Icon';
import Modal from '../../ui/Modal';
import { toDateInput, fromDateInput, todayInput, fmtDay } from '../../utils';
import type { EventItem } from '../../types';
import { errorText } from '../../services/errors';
import { useConfirm } from '../../ui/Confirm';
import LoadError from '../../ui/LoadError';
import { rows } from '../../ui/motion';

const CATEGORIES = ['General', 'Festival', 'Concert', 'Sports', 'Food & Drink', 'Business & Networking'];
const FILTERS = ['All categories', ...CATEGORIES];


export default function Events({ query = '' }: { query?: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: events = [], isLoading: fetching, isError, error, refetch } = useGetEventsQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const [createEvent, { isLoading: creating }] = useCreateEventMutation();
  const [updateEvent] = useUpdateEventMutation();
  const [deleteEvent] = useDeleteEventMutation();
  const [editing, setEditing] = useState<EventItem | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayInput());
  const [filter, setFilter] = useState(FILTERS[0]);

  const add = async () => {
    if (creating) return; // Enter or a double-click while saving
    if (!name.trim()) {
      toast('Add an event name');
      return;
    }
    try {
      await createEvent({
        name: name.trim(),
        category,
        location: location.trim(),
        startsAt: fromDateInput(date),
      }).unwrap();
      setName(''); setLocation('');
      toast('Event added');
    } catch (err) {
      toast(errorText(err));
    }
  };

  const del = async (id: string, name: string) => {
    if (!(await confirm({ title: `Delete “${name}”?`, confirmLabel: 'Delete event' }))) return;
    try {
      await deleteEvent(id).unwrap();
      toast('Deleted');
    } catch (err) {
      toast(errorText(err));
    }
  };

  const save = async (v: { name: string; category: string; location: string; startsAt: string | null }) => {
    if (!editing) return;
    try {
      await updateEvent({ id: editing.id, body: v }).unwrap();
      setEditing(null);
      toast('Event updated');
    } catch (err) {
      toast(errorText(err));
    }
  };

  const q = query.trim().toLowerCase();
  const shown = [...events]
    .filter((e) => (filter === 'All categories' || e.category === filter))
    .filter((e) => (q ? (e.name + ' ' + e.category + ' ' + e.location).toLowerCase().includes(q) : true))
    .sort((a, b) => {
      const at = a.startsAt ? new Date(a.startsAt).getTime() : Infinity;
      const bt = b.startsAt ? new Date(b.startsAt).getTime() : Infinity;
      return at - bt;
    });

  return (
    <div>
      <div className="view-head">
        <p className="spec"><span className="k">§ Tool</span><span>{events.length} event{events.length === 1 ? '' : 's'}</span></p>
        <h1 className="view-title">Events</h1>
      </div>
      <p className="cap" style={{ margin: '2px 0 18px' }}>Your events & calendar.</p>

      <div className="tool-cols">
        <div className="panel">
          <div className="sublab" style={{ marginTop: 0 }}>§ New event</div>
          <div className="field"><label>Name</label><input className="inp" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>Category</label>
            <select className="inp" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label>Location</label><input className="inp" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <div className="field" style={{ flex: 1 }}><label>Date</label><input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <button className="btn primary" onClick={add} disabled={!name.trim() || creating}>Add event</button>
        </div>

        <div>
          <div className="row-head" style={{ marginTop: 0 }}>
            <div className="sublab" style={{ margin: 0 }}>§ Upcoming</div>
            <select className="inp" style={{ maxWidth: 220 }} value={filter} onChange={(e) => setFilter(e.target.value)}>{FILTERS.map((f) => <option key={f}>{f}</option>)}</select>
          </div>
          {isError ? <LoadError what="events" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}
          {!isLoading && events.length === 0 && <div className="cap" style={{ padding: '14px 0' }}>No events yet.</div>}
          {!isLoading && events.length > 0 && shown.length === 0 && <div className="cap" style={{ padding: '14px 0' }}>No events match your filters.</div>}
          {shown.length > 0 && (
            <div className="scroll-x" style={{ marginTop: 12 }}><table className="ledger">
              <thead><tr><th>Event</th><th>Category</th><th>When</th><th>Location</th><th></th></tr></thead>
              <tbody ref={rows}>
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td><div className="pname">{e.name}</div></td>
                    <td><span className="tag">{e.category}</span></td>
                    <td className="num">{e.startsAt ? fmtDay(e.startsAt) : '—'}</td>
                    <td>{e.location || '—'}</td>
                    <td>
                      <span className="row-act">
                        <button className="btn quiet sm" onClick={() => setEditing(e)} aria-label="Edit"><Icon name="edit" size={14} /></button>
                        <button className="btn quiet sm" onClick={() => del(e.id, e.name)} aria-label="Delete"><Icon name="trash" size={14} /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      {editing && (
        <EventModal editing={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

/* ── Event modal ── */
function EventModal({ editing, onClose, onSave }: {
  editing: EventItem;
  onClose: () => void;
  onSave: (v: { name: string; category: string; location: string; startsAt: string | null }) => void;
}) {
  const [name, setName] = useState(editing.name);
  const [category, setCategory] = useState(editing.category || CATEGORIES[0]);
  const [location, setLocation] = useState(editing.location);
  const [date, setDate] = useState(toDateInput(editing.startsAt));
  const valid = name.trim().length > 0;

  return (
    <Modal
      title={`Edit — ${editing.name}`}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn primary"
          disabled={!valid}
          onClick={() => onSave({
            name: name.trim(), category, location: location.trim(), startsAt: fromDateInput(date),
          })}
        >Save</button>
      </>}
    >
      <div className="modal-body">
        <div className="fields">
          <div className="field full"><label>Name</label><input className="inp" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="field full">
            <label>Category</label>
            <select className="inp" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field wide"><label>Location</label><input className="inp" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div className="field"><label>Date</label><input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
      </div>
    </Modal>
  );
}
