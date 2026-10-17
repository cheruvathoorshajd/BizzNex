import {
  useGetNotificationsQuery,
  useUpdateNotificationMutation,
  useDeleteNotificationMutation,
} from '../../services/api';
import { useToast } from '../../ui/Toast';
import Icon from '../../ui/Icon';
import { fmtDate } from '../../utils';
import { errorText } from '../../services/errors';
import LoadError from '../../ui/LoadError';
import { rows } from '../../ui/motion';

export default function Notifications() {
  const toast = useToast();
  const { data: notifications = [], isLoading: fetching, isError, error, refetch } = useGetNotificationsQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const [updateNotification] = useUpdateNotificationMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const unread = notifications.filter((n) => !n.read);

  const markRead = async (id: string) => {
    try {
      await updateNotification({ id, body: { read: true } }).unwrap();
    } catch (err) {
      toast(errorText(err));
    }
  };

  const markAll = async () => {
    if (!unread.length) return;
    try {
      for (const n of unread) {
        await updateNotification({ id: n.id, body: { read: true } }).unwrap();
      }
      toast('All caught up');
    } catch (err) {
      toast(errorText(err));
    }
  };

  const del = async (id: string) => {
    try {
      await deleteNotification(id).unwrap();
      toast('Deleted');
    } catch (err) {
      toast(errorText(err));
    }
  };

  return (
    <div>
      <div className="view-head">
        <p className="spec"><span className="k">§ Tool</span><span>{unread.length} unread</span></p>
        <h1 className="view-title">Notifications</h1>
      </div>
      <p className="cap" style={{ margin: '2px 0 18px' }}>Everything happening across your workspace.</p>

      <div className="row-head">
        <span className="cap" style={{ margin: 0 }}>{unread.length} unread of {notifications.length}</span>
        <button className="btn ghost sm" onClick={markAll} disabled={!unread.length}><Icon name="check" size={14} /> Mark all read</button>
      </div>

      <div ref={rows} style={{ marginTop: 16 }}>
        {isError ? <LoadError what="notifications" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}
        {!isLoading && notifications.length === 0 && (
          <div className="cap" style={{ padding: '16px 0' }}>You're all caught up.</div>
        )}
        {notifications.map((n) => (
          <div
            className="titem"
            key={n.id}
            onClick={() => { if (!n.read) markRead(n.id); }}
            style={{ cursor: n.read ? 'default' : 'pointer' }}
          >
            <span className="nm" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: n.read ? 400 : 600 }}>
              {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />}
              <span className="tag soft">{n.kind}</span>
              <span style={{ minWidth: 0 }}>{n.message}</span>
            </span>
            <span className="dt">{fmtDate(n.createdAt)}</span>
            <span className="row-act">
              <button
                className="btn quiet sm"
                onClick={(e) => { e.stopPropagation(); del(n.id); }}
                aria-label="Delete"
              ><Icon name="trash" size={14} /></button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
