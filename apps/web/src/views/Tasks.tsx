import { useState } from 'react';
import {
  useGetProjectsQuery, useAddTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation,
} from '../services/api';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import TaskModal from './TaskModal';
import { cx, fmtShort, dotClass } from '../utils';
import Icon from '../ui/Icon';
import type { Status, Task, ViewId } from '../types';
import { errorText } from '../services/errors';
import { useConfirm } from '../ui/Confirm';
import LoadError from '../ui/LoadError';
import { rows } from '../ui/motion';

const STATUSES: Status[] = ['In Progress', 'Pending', 'Completed'];

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
