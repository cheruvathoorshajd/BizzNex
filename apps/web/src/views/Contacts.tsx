import { useState, useId } from 'react';
import {
  useGetContactsQuery, useCreateContactMutation, useUpdateContactMutation, useDeleteContactMutation,
  useGetCompaniesQuery,
} from '../services/api';
import { useToast } from '../ui/Toast';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import type { Contact, Company } from '../types';
import { errorText } from '../services/errors';
import { useConfirm } from '../ui/Confirm';
import LoadError from '../ui/LoadError';
import { rows } from '../ui/motion';

export default function Contacts({ query = '' }: { query?: string }) {
  const fid = useId(); // pairs each visible label with its field
  const toast = useToast();
  const confirm = useConfirm();
  const { data: contacts = [], isLoading: fetching, isError, error, refetch } = useGetContactsQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const { data: companies = [] } = useGetCompaniesQuery();
  const [createContact, { isLoading: creating }] = useCreateContactMutation();
  const [updateContact] = useUpdateContactMutation();
  const [deleteContact] = useDeleteContactMutation();
  const [editing, setEditing] = useState<Contact | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');

  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name ?? '';

  const q = query.trim().toLowerCase();
  const shown = q
    ? contacts.filter((c) => (c.name + c.email + c.phone + c.title + companyName(c.companyId)).toLowerCase().includes(q))
    : contacts;

  const add = async () => {
    if (creating) return; // Enter or a double-click while saving
    if (!name.trim()) return;
    try {
      await createContact({
        name: name.trim(), email: email.trim(), phone: phone.trim(), title: title.trim(),
        companyId: companyId || null,
      }).unwrap();
      setName(''); setEmail(''); setPhone(''); setTitle(''); setCompanyId('');
      toast('Contact added');
    } catch (err) { toast(errorText(err)); }
  };

  const remove = async (id: string, name: string) => {
    if (!(await confirm({ title: `Delete “${name}”?`, confirmLabel: 'Delete contact', body: 'Their deals and activities stay, without the contact link.' }))) return;
    try { await deleteContact(id).unwrap(); toast('Deleted'); }
    catch (err) { toast(errorText(err)); }
  };

  const save = async (v: { name: string; email: string; phone: string; title: string; companyId: string | null }) => {
    if (!editing) return;
    try {
      await updateContact({ id: editing.id, body: v }).unwrap();
      setEditing(null);
      toast('Contact updated');
    } catch (err) { toast(errorText(err)); }
  };

  return (
    <div>
      <div className="view-head">
        <p className="spec"><span className="k">§ CRM</span><span>{contacts.length} contacts</span></p>
        <h1 className="view-title">Contacts</h1>
      </div>

      <div className="crm-cols">
        <div className="panel">
          <div className="sublab" style={{ marginTop: 0 }}>§ New contact</div>
          <div className="field"><label htmlFor={`${fid}-name`}>Name</label><input id={`${fid}-name`} className="inp" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor={`${fid}-title`}>Title</label><input id={`${fid}-title`} className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Head of Ops" /></div>
          <div className="field"><label htmlFor={`${fid}-email`}>Email</label><input id={`${fid}-email`} className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label htmlFor={`${fid}-phone`}>Phone</label><input id={`${fid}-phone`} className="inp" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="field">
            <label htmlFor={`${fid}-company`}>Company</label>
            <select id={`${fid}-company`} className="inp" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">— None —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button className="btn primary" onClick={add} disabled={!name.trim() || creating}>Add contact</button>
        </div>

        <div>
          <div className="sublab" style={{ marginTop: 0 }}>§ All contacts</div>
          {isError ? <LoadError what="contacts" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}
          {!isLoading && shown.length === 0 && <div className="cap" style={{ padding: '16px 0' }}>{q ? `No matches for “${query.trim()}”.` : 'No contacts yet.'}</div>}
          {shown.length > 0 && (
            <div className="scroll-x">
              <table className="ledger">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th></th></tr></thead>
                <tbody ref={rows}>
                  {shown.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="pname">{c.name}</div>
                        {c.title && <div className="pmeta">{c.title}</div>}
                      </td>
                      <td>{c.email || '—'}</td>
                      <td className="num">{c.phone || '—'}</td>
                      <td>{companyName(c.companyId) || '—'}</td>
                      <td className="r">
                        <span className="row-act">
                          <button className="btn quiet sm" onClick={() => setEditing(c)} aria-label="Edit"><Icon name="edit" size={14} /></button>
                          <button className="btn quiet sm" onClick={() => remove(c.id, c.name)} aria-label="Delete"><Icon name="trash" size={14} /></button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <ContactModal
          editing={editing}
          companies={companies}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

/* ── Contact modal ── */
function ContactModal({ editing, companies, onClose, onSave }: {
  editing: Contact;
  companies: Company[];
  onClose: () => void;
  onSave: (v: { name: string; email: string; phone: string; title: string; companyId: string | null }) => Promise<void>;
}) {
  const fid = useId(); // pairs each visible label with its field
  const [name, setName] = useState(editing.name);
  const [title, setTitle] = useState(editing.title);
  const [email, setEmail] = useState(editing.email);
  const [phone, setPhone] = useState(editing.phone);
  const [companyId, setCompanyId] = useState(editing.companyId ?? '');
  const valid = name.trim().length > 0;
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      title={`Edit — ${editing.name}`}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn primary"
          disabled={!valid || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                name: name.trim(), email: email.trim(), phone: phone.trim(), title: title.trim(),
                companyId: companyId || null,
              });
            } finally { setSaving(false); }
          }}
        >Save</button>
      </>}
    >
      <div className="modal-body">
        <div className="fields">
          <div className="field full"><label htmlFor={`${fid}-name`}>Name</label><input id={`${fid}-name`} className="inp" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="field full"><label htmlFor={`${fid}-title`}>Title</label><input id={`${fid}-title`} className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Head of Ops" /></div>
          <div className="field wide"><label htmlFor={`${fid}-email`}>Email</label><input id={`${fid}-email`} className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label htmlFor={`${fid}-phone`}>Phone</label><input id={`${fid}-phone`} className="inp" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="field full">
            <label htmlFor={`${fid}-company`}>Company</label>
            <select id={`${fid}-company`} className="inp" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">— None —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
