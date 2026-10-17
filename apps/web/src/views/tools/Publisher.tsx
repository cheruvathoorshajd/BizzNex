import { useState } from 'react';
import { cx, fmtDate } from '../../utils';
import {
  useGetPostsQuery,
  useCreatePostMutation,
  useDeletePostMutation,
} from '../../services/api';
import { useToast } from '../../ui/Toast';
import Icon from '../../ui/Icon';
import PreviewBadge from '../../ui/PreviewBadge';
import { errorText } from '../../services/errors';
import { useConfirm } from '../../ui/Confirm';
import LoadError from '../../ui/LoadError';
import { rows } from '../../ui/motion';

const PLATFORMS = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn'];

export default function Publisher() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: posts = [], isLoading: fetching, isError, error, refetch } = useGetPostsQuery();
  const isLoading = fetching || isError; // an error is not an empty list
  const [createPost] = useCreatePostMutation();
  const [publishing, setPublishing] = useState(false);
  const [deletePost] = useDeletePostMutation();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);

  const toggle = (p: string) => setPlatforms((x) => (x.includes(p) ? x.filter((i) => i !== p) : [...x, p]));

  const publish = async () => {
    if (!title.trim() || !platforms.length) {
      toast('Add a title and pick a platform');
      return;
    }
    setPublishing(true);
    try {
      await createPost({ title: title.trim(), body: body.trim(), platforms, status: 'published' }).unwrap();
      toast('Published to ' + platforms.join(', '));
      setTitle(''); setBody(''); setPlatforms([]);
    } catch (err) {
      toast(errorText(err));
    } finally {
      setPublishing(false);
    }
  };

  const del = async (id: string, name: string) => {
    if (!(await confirm({ title: `Delete “${name}”?`, confirmLabel: 'Delete post' }))) return;
    try {
      await deletePost(id).unwrap();
      toast('Deleted');
    } catch (err) {
      toast(errorText(err));
    }
  };

  return (
    <div>
      <div className="view-head">
        <p className="spec"><span className="k">§ Tool</span><span>Multi-platform publishing</span></p>
        <h1 className="view-title">Publisher</h1>
      </div>
      <p className="cap" style={{ margin: '2px 0 18px' }}>Compose once, publish to every platform.</p>

      <div className="tool-cols">
        <div className="panel">
          <div className="field" style={{ marginTop: 0 }}><label>Content title</label><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="field">
            <label>Description <span className="cap" style={{ float: 'right', margin: 0 }}>{body.length} / 280</span></label>
            <textarea className="inp" rows={4} maxLength={280} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="sublab">§ Platforms</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PLATFORMS.map((p) => <button key={p} className={cx('chip', platforms.includes(p) && 'on')} onClick={() => toggle(p)}>{p}</button>)}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={publish} disabled={publishing}>{publishing ? 'Publishing…' : 'Publish content'}</button>
            <PreviewBadge label="Posting simulated" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div className="sublab" style={{ marginTop: 0 }}>§ Preview</div>
            <div className="panel">
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{title || 'Your title…'}</div>
              <div style={{ color: 'var(--muted)', marginTop: 6, fontSize: 13 }}>{body || 'Description preview appears here.'}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>{platforms.map((p) => <span className="tag" key={p}>{p}</span>)}</div>
            </div>
          </div>
          <div ref={rows}>
            <div className="sublab">§ Recently published</div>
            {isError ? <LoadError what="posts" error={error} onRetry={refetch} /> : isLoading && <p className="loading">Loading…</p>}
            {!isLoading && posts.length === 0 && <div className="cap" style={{ padding: '14px 0' }}>Nothing published yet.</div>}
            {posts.map((p) => (
              <div className="titem" key={p.id}>
                <span className="nm">{p.title}
                  {p.platforms.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {p.platforms.map((x) => <span className="tag soft" key={x}>{x}</span>)}
                    </div>
                  )}
                </span>
                <span className="dt">{fmtDate(p.publishedAt || p.createdAt)}</span>
                <span className="row-act">
                  <button className="btn quiet sm" onClick={() => del(p.id, p.title)} aria-label="Delete"><Icon name="trash" size={14} /></button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
