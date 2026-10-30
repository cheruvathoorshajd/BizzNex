import { useMemo, useRef, lazy, Suspense } from 'react';
import { useGetProjectsQuery } from '../services/api';
import { useAppSelector } from '../store';
import { useT } from '../i18n/useT';
import { fmtMoney, fmtShort, sparkPoints, cx, dotClass, todayInput, toDateInput } from '../utils';
import type { Status, Task, ViewId } from '../types';
import CountUp from '../ui/CountUp';
import { dayPart } from '../ui/transitions';

const Globe = lazy(() => import('./Globe'));

function overallStatus(tasks: Task[]): Status {
  if (tasks.length && tasks.every((t) => t.status === 'Completed')) return 'Completed';
  if (tasks.some((t) => t.status === 'In Progress')) return 'In Progress';
  return 'Pending';
}

/** The Sunday that ends the current week, as a "YYYY-MM-DD" calendar date. */
function weekEnd(today: string) {
  const d = new Date(`${today}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7));
  return d.toISOString().slice(0, 10);
}

/** Morning until noon, afternoon until 6 pm, in the viewer's own time. */

export default function Dashboard({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const t = useT();
  const firstName = useAppSelector((s) => s.auth.user?.name?.split(' ')[0] ?? 'there');
  const { data: projects = [], isLoading, isError } = useGetProjectsQuery();

  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const onMove = (e: React.MouseEvent) => {
    const el = stageRef.current;
    if (!el || reduce) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg)`;
  };
  const onLeave = () => { if (stageRef.current) stageRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)'; };

  const m = useMemo(() => {
    const allTasks = projects.flatMap((p) => p.tasks);
    const done = allTasks.filter((tk) => tk.status === 'Completed').length;
    const open = allTasks.length - done;
    const completion = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;
    const spend = projects.reduce((n, p) => n + p.spend, 0);
    // trends end at the latest month, so line them up from the end: a shorter history started later
    const len = Math.max(0, ...projects.map((p) => p.trend.length));
    const series = Array.from({ length: len }, (_, i) =>
      projects.reduce((n, p) => n + (p.trend[p.trend.length - len + i] || 0), 0));
    // a project is active until every task is done, as in its status (an empty one has work ahead)
    const active = projects.filter((p) => overallStatus(p.tasks) !== 'Completed').length;
    return { done, open, completion, spend, series, active };
  }, [projects]);

  const delta = useMemo(() => {
    const s = m.series;
    if (s.length < 2 || !s[0]) return null;
    const pct = ((s[s.length - 1] - s[0]) / Math.abs(s[0])) * 100;
    return { pct, up: pct >= 0 };
  }, [m.series]);

  const insight = useMemo(() => {
    const behind = projects.find((p) => p.tasks.some((tk) => tk.status === 'Pending'));
    if (!behind) return null;
    return { name: behind.name, n: behind.tasks.filter((tk) => tk.status === 'Pending').length };
  }, [projects]);

  // open tasks due by Sunday, overdue ones included (and first); undated tasks are left out
  const weekTasks = useMemo(() => {
    const today = todayInput(), end = weekEnd(today);
    return projects.flatMap((p) => p.tasks.map((tk) => ({ ...tk, project: p.name, due: toDateInput(tk.endDate) })))
      .filter((tk) => tk.status !== 'Completed' && tk.due && tk.due <= end)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 5)
      .map((tk) => ({ ...tk, overdue: tk.due < today }));
  }, [projects]);

  return (
    <div style={{ position: 'relative' }}>
      {/* ── 3D hero scene ── */}
      <div className="d3-scene" onMouseMove={onMove} onMouseLeave={onLeave}>
        <div className="d3-stage" ref={stageRef}>
          <div className="bloom d3-back" />

          <div className="d3-lift-1" style={{ position: 'relative' }}>
            <h1 className="view-title serif">{t('dash.greeting', { name: firstName, part: dayPart() })}</h1>
            <p style={{ color: 'var(--muted)', maxWidth: '44ch' }}>{t('dash.sub')}</p>
          </div>

          {isError && <p className="err mt-4">Couldn't reach the API. Make sure it's running on the configured URL.</p>}
          {isLoading && <p className="loading">Loading your workspace…</p>}

          {!isLoading && !isError && (
            <>
              <div className="metrics mt-5 d3-lift-2">
                <div className="metric-hero">
                  {/* the latest month of the trend, so the figure and the ▲% beside it measure the same thing */}
                  <p className="spec"><span className="k">§ {t('dash.spend')}</span><span>{t(m.series.length ? 'dash.trailing' : 'dash.total')}</span></p>
                  <div className="big num"><CountUp value={m.series.length ? m.series[m.series.length - 1] : m.spend} format={fmtMoney} /></div>
                  {delta && (
                    <div className="delta" style={{ color: delta.up ? 'var(--ok)' : 'var(--bad)' }}>
                      {delta.up ? '▲' : '▼'} {Math.abs(delta.pct).toFixed(1)}%&nbsp;&nbsp;{t('dash.vsStart')}
                    </div>
                  )}
                </div>
                <div className="ledger-list">
                  <div className="lrow"><span className="l">{t('dash.activeProjects')}</span><span><span className="v"><CountUp value={m.active} /></span></span></div>
                  <div className="lrow"><span className="l">{t('dash.openTasks')}</span><span><span className="v"><CountUp value={m.open} /></span></span></div>
                  <div className="lrow"><span className="l">{t('status.Completed')}</span><span><span className="v"><CountUp value={m.done} /></span></span></div>
                  <div className="lrow"><span className="l">{t('dash.completion')}</span><span><span className="v"><CountUp value={m.completion} format={(n) => Math.round(n) + '%'} /></span></span></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── flat editorial sections below ── */}
      {!isLoading && !isError && (
        <>
          <Suspense fallback={<div className="globe-hero mt-5" />}><Globe /></Suspense>
          <div className="sublab" style={{ marginTop: 'var(--s5)' }}>§ {t('dash.recent')}</div>
          <div className="scroll-x"><table className="ledger">
            <thead><tr>
              <th>{t('field.project')}</th><th>{t('field.status')}</th>
              <th className="r">{t('field.spend')}</th><th className="r">{t('field.trend')}</th>
            </tr></thead>
            <tbody>
              {projects.slice(0, 5).map((p) => {
                const st = overallStatus(p.tasks);
                return (
                  <tr key={p.id} onClick={() => onNavigate('projects')} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="pname">{p.name}</div>
                      <div className="pmeta">{p.tasks.length} TASKS · {p.owner.toUpperCase()}</div>
                    </td>
                    <td><span className={cx('stat-dot', dotClass(st))}>{t('status.' + st)}</span></td>
                    <td className="r money">{fmtMoney(p.spend)}</td>
                    <td className="r">
                      <svg className="spark" viewBox="0 0 84 24">
                        <polyline className="draw" pathLength={1} points={sparkPoints(p.trend)} fill="none"
                          stroke={st === 'Completed' ? 'var(--accent)' : st === 'In Progress' ? 'var(--ok)' : 'var(--bad)'}
                          strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
              {!projects.length && <tr><td colSpan={4}><span className="cap">No projects yet — create one from the Projects view.</span></td></tr>}
            </tbody>
          </table></div>

          <div className="split mt-5" style={{ rowGap: 'var(--s5)' }}>
            <div style={{ gridColumn: 'span 7' }}>
              <div className="sublab" style={{ marginTop: 0 }}>§ {t('dash.intelligence')}</div>
              {insight ? (
                <blockquote className="pullquote">
                  <b>{insight.name}</b> has {insight.n} task{insight.n > 1 ? 's' : ''} still pending — assigning {insight.n > 1 ? 'them' : 'it'} now keeps the timeline on track.
                </blockquote>
              ) : (
                <blockquote className="pullquote">Everything is on track. No pending tasks need attention right now.</blockquote>
              )}
            </div>

            <div style={{ gridColumn: 'span 5' }}>
              <div className="sublab" style={{ marginTop: 0 }}>§ {t('dash.week')}</div>
              {weekTasks.map((tk, i) => (
                <div className="titem" key={tk.id}>
                  <span className="idx num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="nm">{tk.name}<div className="desc">{tk.project}</div></span>
                  <span className="dt" style={tk.overdue ? { color: 'var(--bad)' } : undefined}>{tk.overdue ? 'OVERDUE · ' : ''}{fmtShort(tk.due)}</span>
                </div>
              ))}
              {!weekTasks.length && <p className="cap">Nothing due — you're all clear.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
