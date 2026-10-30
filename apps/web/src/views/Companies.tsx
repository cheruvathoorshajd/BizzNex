import { useState, useId } from 'react';
import {
  useGetCompaniesQuery, useCreateCompanyMutation, useUpdateCompanyMutation, useDeleteCompanyMutation,
  useGetContactsQuery, useGetDealsQuery,
} from '../services/api';
import { useToast } from '../ui/Toast';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import type { Company } from '../types';
import { errorText } from '../services/errors';
import { useConfirm } from '../ui/Confirm';
import LoadError from '../ui/LoadError';
import { rows } from '../ui/motion';

export default function Companies({ query = '' }: { query?: string }) {
  const fid = useId(); // pairs each visible label with its field
  const toast = useToast();
  const confirm = useConfirm();
  const { data: companies = [], isLoading: fetching, isError, error, refetch } = useGetCompaniesQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const { data: contacts = [] } = useGetContactsQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const [createCompany, { isLoading: creating }] = useCreateCompanyMutation();
  const [updateCompany] = useUpdateCompanyMutation();
  const [deleteCompany] = useDeleteCompanyMutation();
  const [editing, setEditing] = useState<Company | null>(null);

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');

  const q = query.trim().toLowerCase();
  const shown = q
    ? companies.filter((c) => (c.name + c.industry + c.website).toLowerCase().includes(q))
    : companies;

  const add = async () => {
    if (creating) return; // Enter or a double-click while saving
    if (!name.trim()) return;
    try {
      await createCompany({ name: name.trim(), industry: industry.trim(), website: website.trim() }).unwrap();
      setName(''); setIndustry(''); setWebsite('');
      toast('Company added');
    } catch (err) { toast(errorText(err)); }
  };

  const remove = async (id: string, name: string) => {
    if (!(await confirm({ title: `Delete “${name}”?`, confirmLabel: 'Delete company', body: 'Its contacts and deals stay, without the company link.' }))) return;
    try { await deleteCompany(id).unwrap(); toast('Deleted'); }
    catch (err) { toast(errorText(err)); }
  };

  const save = async (v: { name: string; industry: string; website: string }) => {
    if (!editing) return;
    try {
      await updateCompany({ id: editing.id, body: v }).unwrap();
      setEditing(null);
      toast('Company updated');
    } catch (err) { toast(errorText(err)); }
  };

  return (
    <div>
      <div className="view-head">
        <p className="spec"><span className="k">§ CRM</span><span>{companies.length} companies</span></p>
        <h1 className="view-title">Companies</h1>
      </div>

      <div className="crm-cols">
        <div className="panel">
          <div className="sublab" style={{ marginTop: 0 }}>§ New company</div>
          <div className="field"><label htmlFor={`${fid}-name`}>Name</label><input id={`${fid}-name`} className="inp" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor={`${fid}-industry`}>Industry</label><input id={`${fid}-industry`} className="inp" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Retail" /></div>
          <div className="field"><label htmlFor={`${fid}-website`}>Website</label><input id={`${fid}-website`} className="inp" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="example.com" /></div>
          <button className="btn primary" onClick={add} disabled={!name.trim() || creating}>Add company</button>
        </div>

        <div>
          <div className="sublab" style={{ marginTop: 0 }}>§ All companies</div>
          {isError ? <LoadError what="companies" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}
          {!isLoading && shown.length === 0 && <div className="cap" style={{ padding: '16px 0' }}>{q ? `No matches for “${query.trim()}”.` : 'No companies yet.'}</div>}
          {shown.length > 0 && (
            <div className="scroll-x">
              <table className="ledger">
                <thead><tr><th>Company</th><th>Industry</th><th>Contacts</th><th>Deals</th><th></th></tr></thead>
                <tbody ref={rows}>
                  {shown.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="pname">{c.name}</div>
                        {c.website && <div className="pmeta">{c.website}</div>}
                      </td>
                      <td>{c.industry || '—'}</td>
                      <td className="num">{contacts.filter((x) => x.companyId === c.id).length}</td>
                      <td className="num">{deals.filter((x) => x.companyId === c.id).length}</td>
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
        <CompanyModal editing={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

/* ── Company modal ── */
function CompanyModal({ editing, onClose, onSave }: {
  editing: Company;
  onClose: () => void;
  onSave: (v: { name: string; industry: string; website: string }) => Promise<void>;
}) {
  const fid = useId(); // pairs each visible label with its field
  const [name, setName] = useState(editing.name);
  const [industry, setIndustry] = useState(editing.industry);
  const [website, setWebsite] = useState(editing.website);
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
            try { await onSave({ name: name.trim(), industry: industry.trim(), website: website.trim() }); }
            finally { setSaving(false); }
          }}
        >Save</button>
      </>}
    >
      <div className="modal-body">
        <div className="fields">
          <div className="field full"><label htmlFor={`${fid}-name`}>Name</label><input id={`${fid}-name`} className="inp" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="field"><label htmlFor={`${fid}-industry`}>Industry</label><input id={`${fid}-industry`} className="inp" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Retail" /></div>
          <div className="field wide"><label htmlFor={`${fid}-website`}>Website</label><input id={`${fid}-website`} className="inp" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="example.com" /></div>
        </div>
      </div>
    </Modal>
  );
}
