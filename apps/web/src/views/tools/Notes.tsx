import { useState } from 'react';
import { useGetNotesQuery, useCreateNoteMutation, useUpdateNoteMutation, useDeleteNoteMutation } from '../../services/api';
import { useToast } from '../../ui/Toast';
import Icon from '../../ui/Icon';
import Modal from '../../ui/Modal';
import { toDateInput, fromDateInput, todayInput, fmtDay } from '../../utils';
import type { Note } from '../../types';
import { errorText } from '../../services/errors';
import { useConfirm } from '../../ui/Confirm';
import LoadError from '../../ui/LoadError';
import { rows } from '../../ui/motion';


export default function Notes() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: notes = [], isLoading: fetching, isError, error, refetch } = useGetNotesQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const [createNote, { isLoading: creating }] = useCreateNoteMutation();
  const [updateNote, { isLoading: saving }] = useUpdateNoteMutation();
  const [deleteNote] = useDeleteNoteMutation();
  const [editing, setEditing] = useState<Note | null>(null);

  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayInput());
  const [description, setDescription] = useState('');

  const q = search.trim().toLowerCase();
  const shown = q ? notes.filter((n) => (n.title + n.location + n.description).toLowerCase().includes(q)) : notes;

  const add = async () => {
    if (creating) return; // Enter or a double-click while saving
    if (!title.trim()) return;
    try {
      await createNote({ title: title.trim(), location: location.trim(), date: fromDateInput(date), description: description.trim() }).unwrap();
      setTitle(''); setLocation(''); setDescription('');
      toast('Note added');
    } catch (err) { toast(errorText(err)); }
  };

  const save = async (v: { title: string; location: string; date: string | null; description: string }) => {
    if (!editing) return;
    try {
      await updateNote({ id: editing.id, body: v }).unwrap();
      setEditing(null);
      toast('Note updated');
    } catch (err) { toast(errorText(err)); }
  };

  return (
    <div>
      <div className="view-head">
        <p className="spec"><span className="k">§ Tool</span><span>{notes.length} notes</span></p>
        <h1 className="view-title">Notes</h1>
      </div>

      <div className="row-head" style={{ marginTop: 6 }}>
        <input className="inp" placeholder="Search notes…" aria-label="Search notes" style={{ maxWidth: 280 }} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="tool-cols">
        <div className="panel">
          <div className="sublab" style={{ marginTop: 0 }}>§ New note</div>
          <div className="field"><label htmlFor="nt-title">Title</label><input id="nt-title" className="inp" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}><label htmlFor="nt-location">Location</label><input id="nt-location" className="inp" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <div className="field" style={{ flex: 1 }}><label htmlFor="nt-date">Date</label><input id="nt-date" className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div className="field"><label htmlFor="nt-desc">Description</label><textarea id="nt-desc" className="inp" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <button className="btn primary" onClick={add} disabled={!title.trim() || creating}>Add note</button>
        </div>

        <div ref={rows}>
          <div className="sublab" style={{ marginTop: 0 }}>§ All notes</div>
          {isError ? <LoadError what="notes" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}
          {!isLoading && shown.length === 0 && <div className="cap" style={{ padding: '16px 0' }}>{notes.length === 0 ? 'No notes yet.' : 'No matching notes.'}</div>}
          {shown.map((n) => (
            <div className="titem" key={n.id}>
              <span className="nm">{n.title}<div className="desc">{n.description}</div></span>
              <span className="dt">{fmtDay(n.date ?? '')}{n.location ? ' · ' + n.location : ''}</span>
              <span className="row-act">
                <button className="btn quiet sm" onClick={() => setEditing(n)} aria-label="Edit"><Icon name="edit" size={14} /></button>
                <button className="btn quiet sm" onClick={async () => { if (!(await confirm({ title: `Delete “${n.title}”?`, confirmLabel: 'Delete note' }))) return; try { await deleteNote(n.id).unwrap(); toast('Deleted'); } catch (err) { toast(errorText(err)); } }} aria-label="Delete"><Icon name="trash" size={14} /></button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <NoteModal editing={editing} onClose={() => setEditing(null)} onSave={save} saving={saving} />
      )}
    </div>
  );
}

/* ── Note modal ── */
function NoteModal({ editing, onClose, onSave, saving }: {
  editing: Note;
  saving: boolean;
  onClose: () => void;
  onSave: (v: { title: string; location: string; date: string | null; description: string }) => void;
}) {
  const [title, setTitle] = useState(editing.title);
  const [location, setLocation] = useState(editing.location);
  const [date, setDate] = useState(toDateInput(editing.date));
  const [description, setDescription] = useState(editing.description);
  const valid = title.trim().length > 0;

  return (
    <Modal
      title={`Edit — ${editing.title}`}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn primary"
          disabled={!valid || saving}
          onClick={() => onSave({
            title: title.trim(), location: location.trim(), date: fromDateInput(date), description: description.trim(),
          })}
        >{saving ? 'Saving…' : 'Save'}</button>
      </>}
    >
      <div className="modal-body">
        <div className="fields">
          <div className="field full"><label htmlFor="ntm-title">Title</label><input id="ntm-title" className="inp" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div className="field wide"><label htmlFor="ntm-location">Location</label><input id="ntm-location" className="inp" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div className="field"><label htmlFor="ntm-date">Date</label><input id="ntm-date" className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field full"><label htmlFor="ntm-desc">Description</label><textarea id="ntm-desc" className="inp" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
      </div>
    </Modal>
  );
}
