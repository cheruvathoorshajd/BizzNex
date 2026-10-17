import { useState } from 'react';
import {
  useGetProjectsQuery, useAddTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation,
} from '../services/api';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import { cx, fmtShort, toDateInput, fromDateInput, dotClass } from '../utils';
import Icon from '../ui/Icon';
import type { Status, Task, ViewId } from '../types';
import { errorText } from '../services/errors';
import { useConfirm } from '../ui/Confirm';
import LoadError from '../ui/LoadError';
import { rows } from '../ui/motion';

const STATUSES: Status[] = ['In Progress', 'Pending', 'Completed'];
const ALL_STATUSES: Status[] = ['Pending', 'In Progress', 'Completed'];

type TaskRow = Task & { project: string };

export default function Tasks({ query, onNavigate }: { query: string; onNavigate: (v: ViewId) => void }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: projects = [], isLoading: fetching, isError, error, refetch } = useGetProjectsQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const [addTask] = useAddTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const [modal, setModal] = useState<{ editing?: TaskRow } | null>(null);

  const q = query.trim().toLowerCase();
  const all = projects.flatMap((p) => p.tasks.map((tk) => ({ ...tk, projectId: p.id, project: p.name })))
    .filter((tk) => !q || tk.name.toLowerCase().includes(q) || tk.project.toLowerCase().includes(q));

  const cycle = async (projectId: string, id: string, current: Status) => {
    const order: Status[] = ['Pending', 'In Progress', 'Completed'];
    const next = order[(order.indexOf(current) + 1) % order.length];
    try { await updateTask({ projectId, taskId: id, body: { status: next } }).unwrap(); }
    catch (err) { toast(errorText(err)); }
  };

  const remove = async (projectId: string, taskId: string, name: string) => {
    if (!(await confirm({ title: `Delete “${name}”?`, confirmLabel: 'Delete task' }))) return;
    try { await deleteTask({ projectId, taskId }).unwrap(); toast(t('action.delete') + ' · ' + name); }
    catch (err) { toast(errorText(err)); }
  };

  return (
    <div>
      <div className="view-head row between wrap-g gap-3">
        <div>
          <p className="spec"><span className="k">§ {t('tasks.sub')}</span><span>{all.length} {t('nav.tasks')}</span></p>
          <h1 className="view-title">{t('tasks.title')}</h1>
        </div>
        <button className="btn primary" onClick={() => setModal({})} disabled={!projects.length}><Icon name="plus" /> {t('action.newTask')}</button>
      </div>

      {isError ? <LoadError what="tasks" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}
      {!isLoading && !projects.length && (
        <div className="empty"><span className="serif">{t('empty.projects')}</span>{t('empty.projectsSub')}</div>
      )}
      {!isLoading && !!projects.length && !all.length && (
        <div className="empty"><span className="serif">{t('empty.tasks')}</span>{t('empty.projectsSub')}</div>
      )}

      {STATUSES.map((st) => {
        const items = all.filter((tk) => tk.status === st);
        if (!items.length) return null;
        return (
          <div key={st} ref={rows}>
            <div className="tgrp">{t('status.' + st)} · {items.length}</div>
            {items.map((tk, i) => (
              <div className="titem" key={tk.id}>
                <span className="idx num">{String(i + 1).padStart(2, '0')}</span>
                <span className="nm">{tk.name}{tk.description && <div className="desc">{tk.description}</div>}<div className="desc">{tk.project}</div></span>
                <button className={cx('stat-dot', dotClass(tk.status))} onClick={() => cycle(tk.projectId, tk.id, tk.status)}
                  title="Change status" style={{ background: 'none', border: 0, cursor: 'pointer' }}>
                  {t('status.' + tk.status)}
                </button>
                <span className="dt">{fmtShort(tk.endDate ?? '')}</span>
                <span className="row-act">
                  <button className="btn quiet sm" onClick={() => setModal({ editing: tk })} aria-label={t('action.edit')}><Icon name="edit" size={14} /></button>
                  <button className="btn quiet sm" onClick={() => remove(tk.projectId, tk.id, tk.name)} aria-label={t('action.delete')}><Icon name="trash" size={14} /></button>
                </span>
              </div>
            ))}
          </div>
        );
      })}

      {modal && (
        <TaskModal
          editing={modal.editing}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          onClose={() => setModal(null)}
          onSave={async (projectId, v) => {
            try {
              if (modal.editing) {
                await updateTask({ projectId, taskId: modal.editing.id, body: v }).unwrap();
                toast(t('action.save'));
              } else {
                await addTask({ projectId, body: v }).unwrap();
                toast(t('action.create') + ' · ' + v.name);
              }
              setModal(null);
            } catch (err) { toast(errorText(err)); }
          }}
        />
      )}

      <div className="mt-5">
        <button className="link" onClick={() => onNavigate('projects')}><Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} /> {t('nav.projects')}</button>
      </div>
    </div>
  );
}

/* ── Task modal (create / edit) ── */
function TaskModal({ editing, projects, onClose, onSave }: {
  editing?: TaskRow;
  projects: { id: string; name: string }[];
  onClose: () => void;
  onSave: (projectId: string, v: { name: string; description: string; startDate: string | null; endDate: string | null; status: Status }) => void;
}) {
  const t = useT();
  const [projectId, setProjectId] = useState(editing?.projectId ?? projects[0]?.id ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [start, setStart] = useState(toDateInput(editing?.startDate));
  const [end, setEnd] = useState(toDateInput(editing?.endDate));
  const [status, setStatus] = useState<Status>(editing?.status ?? 'Pending');
  const valid = name.trim().length > 0 && !!projectId;
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
          <div className="field full">
            <label>{t('field.project')}</label>
            {editing
              ? <input className="inp" value={editing.project} disabled />
              : (
                <select className="inp" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
          </div>
          <div className="field full"><label>{t('field.name')}</label><input className="inp" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div className="field full"><label>{t('field.description')}</label><textarea className="inp" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="field wide"><label>{t('field.start')}</label><input className="inp" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="field wide"><label>{t('field.end')}</label><input className="inp" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          <div className="field full">
            <label>{t('field.status')}</label>
            <div className="seg">
              {ALL_STATUSES.map((s) => <button key={s} className={s === status ? 'on' : ''} onClick={() => setStatus(s)}>{t('status.' + s)}</button>)}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
