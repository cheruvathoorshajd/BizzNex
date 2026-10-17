import { useState } from 'react';
import {
  useGetProjectsQuery, useCreateProjectMutation, useUpdateProjectMutation, useDeleteProjectMutation,
  useAddTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation,
} from '../services/api';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import { cx, fmtShort, toDateInput, fromDateInput, dotClass } from '../utils';
import type { Project, Task, Status, ViewId } from '../types';
import { errorText } from '../services/errors';
import { useConfirm } from '../ui/Confirm';
import LoadError from '../ui/LoadError';
import { rows } from '../ui/motion';

const STATUSES: Status[] = ['Pending', 'In Progress', 'Completed'];

export default function Projects({ query, onNavigate }: { query: string; onNavigate: (v: ViewId) => void }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: projects = [], isLoading: fetching, isError, error, refetch } = useGetProjectsQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const [createProject] = useCreateProjectMutation();
  const [updateProject] = useUpdateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [addTask] = useAddTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const [pModal, setPModal] = useState<{ editing?: Project } | null>(null);
  const [tModal, setTModal] = useState<{ projectId: string; editing?: Task } | null>(null);

  const q = query.trim().toLowerCase();
  const shown = q
    ? projects.filter((p) => p.name.toLowerCase().includes(q) || p.tasks.some((tk) => tk.name.toLowerCase().includes(q)))
    : projects;

  const toggleDone = async (projectId: string, task: Task) => {
    try {
      await updateTask({ projectId, taskId: task.id, body: { status: task.status === 'Completed' ? 'Pending' : 'Completed' } }).unwrap();
    } catch (err) { toast(errorText(err)); }
  };

  return (
    <div>
      <div className="view-head row between wrap-g gap-3">
        <div>
          <p className="spec"><span className="k">§ {t('projects.sub')}</span><span>{projects.length} {t('nav.projects')}</span></p>
          <h1 className="view-title">{t('projects.title')}</h1>
        </div>
        <button className="btn primary" onClick={() => setPModal({})}><Icon name="plus" /> {t('action.newProject')}</button>
      </div>

      {isError ? <LoadError what="projects" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}

      {!isLoading && !shown.length && (
        <div className="empty">
          <span className="serif">{t('empty.projects')}</span>
          {t('empty.projectsSub')}
        </div>
      )}

      <div ref={rows}>
      {shown.map((p) => {
        const done = p.tasks.filter((tk) => tk.status === 'Completed').length;
        const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
        return (
          <section key={p.id} style={{ marginBottom: 'var(--s5)' }}>
            <div className="row between wrap-g gap-3" style={{ alignItems: 'baseline' }}>
              <div>
                <h2 className="serif" style={{ fontSize: 24, fontWeight: 500, margin: 0, letterSpacing: '-.02em' }}>{p.name}</h2>
                <p className="pmeta">{p.owner.toUpperCase()} · {p.tasks.length} TASKS · {done}/{p.tasks.length} DONE</p>
              </div>
              <div className="row gap-2">
                <button className="btn ghost sm" onClick={() => setTModal({ projectId: p.id })}><Icon name="plus" size={14} /> {t('action.newTask')}</button>
                <button className="btn quiet sm" onClick={() => setPModal({ editing: p })} aria-label="Edit"><Icon name="edit" size={15} /></button>
                <button className="btn quiet sm" onClick={async () => { if (!(await confirm({ title: `Delete “${p.name}”?`, confirmLabel: 'Delete project', body: p.tasks.length ? `Its ${p.tasks.length} task${p.tasks.length === 1 ? '' : 's'} will be deleted too. This can’t be undone.` : undefined }))) return; try { await deleteProject(p.id).unwrap(); toast(t('action.delete') + ' · ' + p.name); } catch (err) { toast(errorText(err)); } }} aria-label="Delete"><Icon name="trash" size={15} /></button>
              </div>
            </div>

            <div className="bar mt-3" style={{ maxWidth: 260 }}><i style={{ width: pct + '%' }} /></div>

            <div className="mt-3" ref={rows}>
              {p.tasks.map((tk, i) => (
                <div className="titem" key={tk.id}>
                  <label className="check done-check">
                    <input type="checkbox" checked={tk.status === 'Completed'} onChange={() => toggleDone(p.id, tk)} />
                    <span className="box"><Icon name="tick" /></span>
                  </label>
                  <span className="idx num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="nm" style={{ textDecoration: tk.status === 'Completed' ? 'line-through' : 'none', opacity: tk.status === 'Completed' ? 0.6 : 1 }}>
                    {tk.name}{tk.description && <div className="desc">{tk.description}</div>}
                  </span>
                  <span className={cx('stat-dot', dotClass(tk.status))}>{t('status.' + tk.status)}</span>
                  <span className="dt">{fmtShort(tk.endDate ?? '')}</span>
                  <span className="row-act">
                    <button className="btn quiet sm" onClick={() => setTModal({ projectId: p.id, editing: tk })} aria-label="Edit"><Icon name="edit" size={14} /></button>
                    <button className="btn quiet sm" onClick={async () => { if (!(await confirm({ title: `Delete “${tk.name}”?`, confirmLabel: 'Delete task' }))) return; try { await deleteTask({ projectId: p.id, taskId: tk.id }).unwrap(); toast(t('action.delete') + ' · ' + tk.name); } catch (err) { toast(errorText(err)); } }} aria-label="Delete"><Icon name="trash" size={14} /></button>
                  </span>
                </div>
              ))}
              {!p.tasks.length && <p className="cap">{t('empty.tasks')}</p>}
            </div>
            <hr className="rule mt-4" />
          </section>
        );
      })}
      </div>

      {pModal && (
        <ProjectModal
          editing={pModal.editing}
          onClose={() => setPModal(null)}
          onSave={async (v) => {
            try {
              if (pModal.editing) { await updateProject({ id: pModal.editing.id, body: v }).unwrap(); toast(t('action.save')); }
              else { await createProject(v).unwrap(); toast(t('action.create') + ' · ' + v.name); }
              setPModal(null);
            } catch (err) { toast(errorText(err)); }
          }}
        />
      )}

      {tModal && (
        <TaskModal
          editing={tModal.editing}
          onClose={() => setTModal(null)}
          onSave={async (v) => {
            try {
              if (tModal.editing) { await updateTask({ projectId: tModal.projectId, taskId: tModal.editing.id, body: v }).unwrap(); toast(t('action.save')); }
              else { await addTask({ projectId: tModal.projectId, body: v }).unwrap(); toast(t('action.create') + ' · ' + v.name); }
              setTModal(null);
            } catch (err) { toast(errorText(err)); }
          }}
        />
      )}

      <div className="mt-5">
        <button className="link" onClick={() => onNavigate('tasks')}>{t('nav.tasks')} <span>→</span></button>
      </div>
    </div>
  );
}

/* ── Project modal ── */
function ProjectModal({ editing, onClose, onSave }: {
  editing?: Project; onClose: () => void; onSave: (v: { name: string; owner: string; spend: number }) => void;
}) {
  const t = useT();
  const [name, setName] = useState(editing?.name ?? '');
  const [owner, setOwner] = useState(editing?.owner ?? 'You');
  const [spend, setSpend] = useState(String(editing?.spend ?? 0));
  const valid = name.trim().length > 0;
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      title={editing ? `${t('action.edit')} — ${editing.name}` : t('action.newProject')}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>{t('action.cancel')}</button>
        <button className="btn primary" disabled={!valid || saving} onClick={async () => { setSaving(true); try { await onSave({ name: name.trim(), owner: owner.trim() || 'You', spend: Math.round(Number(spend)) || 0 }); } finally { setSaving(false); } }}>{editing ? t('action.save') : t('action.create')}</button>
      </>}
    >
      <div className="modal-body">
        <div className="fields">
          <div className="field full"><label>{t('field.name')}</label><input className="inp" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="field wide"><label>{t('field.owner')}</label><input className="inp" value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
          <div className="field"><label>{t('field.spend')}</label><input className="inp num" type="number" value={spend} onChange={(e) => setSpend(e.target.value)} /></div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Task modal ── */
function TaskModal({ editing, onClose, onSave }: {
  editing?: Task; onClose: () => void;
  onSave: (v: { name: string; description: string; startDate: string | null; endDate: string | null; status: Status }) => void;
}) {
  const t = useT();
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [start, setStart] = useState(toDateInput(editing?.startDate));
  const [end, setEnd] = useState(toDateInput(editing?.endDate));
  const [status, setStatus] = useState<Status>(editing?.status ?? 'Pending');
  const valid = name.trim().length > 0;
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      title={editing ? t('action.edit') : t('action.newTask')}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>{t('action.cancel')}</button>
        <button className="btn primary" disabled={!valid || saving} onClick={async () => { setSaving(true); try { await onSave({ name: name.trim(), description: description.trim(), startDate: fromDateInput(start), endDate: fromDateInput(end), status }); } finally { setSaving(false); } }}>{editing ? t('action.save') : t('action.create')}</button>
      </>}
    >
      <div className="modal-body">
        <div className="fields">
          <div className="field full"><label>{t('field.name')}</label><input className="inp" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="field full"><label>{t('field.description')}</label><textarea className="inp" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="field wide"><label>{t('field.start')}</label><input className="inp" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="field wide"><label>{t('field.end')}</label><input className="inp" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
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
