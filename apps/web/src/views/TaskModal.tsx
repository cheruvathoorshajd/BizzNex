import { useState } from 'react';
import { useT } from '../i18n/useT';
import Modal from '../ui/Modal';
import { toDateInput, fromDateInput } from '../utils';
import type { Status, Task } from '../types';

const STATUSES: Status[] = ['Pending', 'In Progress', 'Completed'];

export type TaskValues = { name: string; description: string; startDate: string | null; endDate: string | null; status: Status };

/* ── Task modal (create / edit), used by Tasks and Projects ── */
export default function TaskModal({ editing, projectId: fixedProjectId, projects, onClose, onSave }: {
  editing?: Task;
  /** The project to add to, when the caller already knows it. */
  projectId?: string;
  /** Show a project field: a picker for a new task, read-only when editing. */
  projects?: { id: string; name: string }[];
  onClose: () => void;
  onSave: (projectId: string, v: TaskValues) => void | Promise<void>;
}) {
  const t = useT();
  const [projectId, setProjectId] = useState(editing?.projectId ?? fixedProjectId ?? projects?.[0]?.id ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [start, setStart] = useState(toDateInput(editing?.startDate));
  const [end, setEnd] = useState(toDateInput(editing?.endDate));
  const [status, setStatus] = useState<Status>(editing?.status ?? 'Pending');
  const datesOk = !start || !end || end >= start;
  const valid = name.trim().length > 0 && !!projectId && datesOk;
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      title={editing ? t('action.edit') : t('action.newTask')}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>{t('action.cancel')}</button>
        <button className="btn primary" disabled={!valid || saving} onClick={async () => { setSaving(true); try { await onSave(projectId, { name: name.trim(), description: description.trim(), startDate: fromDateInput(start), endDate: fromDateInput(end), status }); } finally { setSaving(false); } }}>{editing ? t('action.save') : t('action.create')}</button>
      </>}
    >
      <div className="modal-body">
        <div className="fields">
          {projects && (
            <div className="field full">
              <label>{t('field.project')}</label>
              {editing
                ? <input className="inp" value={projects.find((p) => p.id === projectId)?.name ?? ''} disabled />
                : (
                  <select className="inp" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
            </div>
          )}
          <div className="field full"><label>{t('field.name')}</label><input className="inp" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="field full"><label>{t('field.description')}</label><textarea className="inp" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="field wide"><label>{t('field.start')}</label><input className="inp" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="field wide"><label>{t('field.end')}</label><input className="inp" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} /></div>
          {!datesOk && <p className="cap" style={{ gridColumn: '1 / -1', margin: 0, color: 'var(--bad)' }}>The end date is before the start date.</p>}
          <div className="field full">
            <label>{t('field.status')}</label>
            <div className="seg">
              {STATUSES.map((s) => <button key={s} className={s === status ? 'on' : ''} onClick={() => setStatus(s)}>{t('status.' + s)}</button>)}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
