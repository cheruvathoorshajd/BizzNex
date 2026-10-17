import { useState } from 'react';
import { cx, fmtDate, fmtDateTime, nowLocal } from '../../utils';
import {
  useGetCampaignsQuery,
  useCreateCampaignMutation,
  useDeleteCampaignMutation,
} from '../../services/api';
import { useToast } from '../../ui/Toast';
import Icon from '../../ui/Icon';
import PreviewBadge from '../../ui/PreviewBadge';
import { errorText } from '../../services/errors';
import { useConfirm } from '../../ui/Confirm';
import LoadError from '../../ui/LoadError';
import { rows } from '../../ui/motion';

const AUDIENCES = ['All subscribers', 'Monthly plan', 'Quarterly plan', 'Yearly plan'];

export default function Newsletter() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: campaigns = [], isLoading: fetching, isError, error, refetch } = useGetCampaignsQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const [createCampaign] = useCreateCampaignMutation();
  const [sending, setSending] = useState(false);
  const [sendAt, setSendAt] = useState('');
  const [deleteCampaign] = useDeleteCampaignMutation();

  const [tab, setTab] = useState<'compose' | 'analytics'>('compose');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState(AUDIENCES[0]);

  const send = async (mode: 'sent' | 'scheduled') => {
    if (!title.trim() || !subject.trim() || !content.trim()) {
      toast('Fill in title, subject and content');
      return;
    }
    // datetime-local is the user's own time; the API stores the instant
    const scheduledAt = mode === 'scheduled' && sendAt ? new Date(sendAt).toISOString() : null;
    setSending(true);
    try {
      const c = await createCampaign({
        title: title.trim(), subject: subject.trim(), content: content.trim(), audience,
        status: mode, scheduledAt,
      }).unwrap();
      toast(mode === 'sent' ? `Campaign sent to ${c.recipients} contact${c.recipients === 1 ? '' : 's'}` : 'Campaign scheduled for ' + fmtDateTime(c.scheduledAt ?? ''));
      setTitle(''); setSubject(''); setContent(''); setSendAt('');
    } catch (err) {
      toast(errorText(err));
    } finally {
      setSending(false);
    }
  };

  const del = async (id: string, name: string) => {
    if (!(await confirm({ title: `Delete “${name}”?`, confirmLabel: 'Delete campaign' }))) return;
    try {
      await deleteCampaign(id).unwrap();
      toast('Deleted');
    } catch (err) {
      toast(errorText(err));
    }
  };

  const total = campaigns.length;
  const sent = campaigns.filter((c) => c.status === 'sent').length;
  const scheduled = campaigns.filter((c) => c.status === 'scheduled').length;

  return (
    <div>
      <div className="view-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="spec"><span className="k">§ Tool</span><span>Email campaigns</span></p>
          <h1 className="view-title">Newsletter</h1>
        </div>
        <div className="seg">
          <button className={cx(tab === 'compose' && 'on')} onClick={() => setTab('compose')}>Compose</button>
          <button className={cx(tab === 'analytics' && 'on')} onClick={() => setTab('analytics')}>Analytics</button>
        </div>
      </div>

      {tab === 'compose' ? (
        <div style={{ maxWidth: 620 }}>
          <div className="field"><label>Campaign title</label><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="field"><label>Subject line</label><input className="inp" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="field"><label>Email content</label><textarea className="inp" rows={6} value={content} onChange={(e) => setContent(e.target.value)} /></div>
          <div className="field"><label>Target audience</label>
            <select className="inp" value={audience} onChange={(e) => setAudience(e.target.value)}>{AUDIENCES.map((a) => <option key={a}>{a}</option>)}</select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={() => send('sent')} disabled={sending}>Send now</button>
            <input className="inp nl-when" type="datetime-local" aria-label="Schedule for" value={sendAt} min={nowLocal()} onChange={(e) => setSendAt(e.target.value)} />
            <button className="btn ghost" onClick={() => send('scheduled')} disabled={sending || !sendAt}>Schedule</button>
            <PreviewBadge label="Delivery simulated" />
          </div>
        </div>
      ) : (
        <div>
          <div className="metric-row" style={{ marginTop: 8 }}>
            <div className="metric"><div className="l">Campaigns</div><div className="big num">{total}</div></div>
            <div className="metric"><div className="l">Sent</div><div className="big num">{sent}</div></div>
            <div className="metric"><div className="l">Scheduled</div><div className="big num">{scheduled}</div></div>
          </div>
          <div className="sublab">§ Campaigns</div>
          {isError ? <LoadError what="campaigns" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}
          {!isLoading && campaigns.length === 0 && (
            <div className="cap" style={{ padding: '14px 0' }}>No campaigns yet — compose and send one.</div>
          )}
          {!isLoading && campaigns.length > 0 && (
            <div className="scroll-x"><table className="ledger">
              <thead><tr><th>Title</th><th>Audience</th><th>Status</th><th className="r">Recipients</th><th>Date</th><th></th></tr></thead>
              <tbody ref={rows}>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td><div className="pname">{c.title}</div><div className="pmeta">{c.subject}</div></td>
                    <td>{c.audience}</td>
                    <td><span className={`stat-dot ${c.status === 'sent' ? 'done' : 'pending'}`}>{c.status}</span></td>
                    <td className="num r">{c.status === 'sent' ? c.recipients : '—'}</td>
                    <td className="num">{c.scheduledAt && c.status === 'scheduled' ? fmtDateTime(c.scheduledAt) : fmtDate(c.sentAt || c.createdAt)}</td>
                    <td>
                      <span className="row-act">
                        <button className="btn quiet sm" onClick={() => del(c.id, c.title)} aria-label="Delete"><Icon name="trash" size={14} /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  );
}
