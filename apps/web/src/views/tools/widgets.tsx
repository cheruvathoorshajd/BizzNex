import { useState } from 'react';
import { calc, calcInput, cx, fmtDay } from '../../utils';
import Icon from '../../ui/Icon';
import { useToast } from '../../ui/Toast';
import PreviewBadge from '../../ui/PreviewBadge';
import {
  useGetNotesQuery, useCreateNoteMutation,
  useCreatePostMutation,
  useCreateCampaignMutation,
  useGetNotificationsQuery, useUpdateNotificationMutation,
  useGetEventsQuery, useCreateEventMutation,
  useAskAssistantMutation,
  useGetContactsQuery,
} from '../../services/api';
import type { ToolId } from './registry';
import { useOnboarding } from '../../onboarding/useOnboarding';
import { errorText } from '../../services/errors';
import LoadError from '../../ui/LoadError';
import { BRENDA_GREETING } from './Chatbot';
import { POST_BODY_MAX, postBodyLimit } from '@bizznex/shared';

/* Compact tool widgets — the version shown inside a floating window (right-click).
 * Deliberately stripped down (no page header) so everything fits the standard window.
 * These now use the SAME real, persisted API as the full-page views. */

const CALC_KEYS = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='];

function CalcWidget() {
  const [expr, setExpr] = useState('');
  const [fresh, setFresh] = useState(false); // showing a result: a digit starts over
  const press = (k: string) => {
    setFresh(k === '=');
    if (k === 'C') return setExpr('');
    if (k === '⌫') return setExpr((e) => (e === 'Error' ? '' : e.slice(0, -1)));
    if (k === '=') {
      try { return setExpr(String(calc(expr))); } catch { return setExpr('Error'); }
    }
    setExpr((e) => calcInput(e, k, fresh));
  };
  return (
    <div className="tw">
      <div className="calc-screen sm">{expr || '0'}</div>
      <div className="calc-keys">
        {CALC_KEYS.map((k) => (
          <button key={k} className={cx('key', '÷×−+%'.includes(k) && 'op', k === '=' && 'eq', k === '0' && 'span2')} onClick={() => press(k)}>{k}</button>
        ))}
      </div>
    </div>
  );
}

function AssistantWidget() {
  const [msgs, setMsgs] = useState<{ t: string; u: boolean }[]>([
    { t: BRENDA_GREETING, u: false },
  ]);
  const [input, setInput] = useState('');
  const [ask, { isLoading }] = useAskAssistantMutation();
  const { track } = useOnboarding();

  const send = async () => {
    const q = input.trim();
    if (!q || isLoading) return;
    setMsgs((m) => [...m, { t: q, u: true }]);
    setInput('');
    try {
      const r = await ask({ prompt: q }).unwrap();
      track('assistant');
      setMsgs((m) => [...m, { t: r.reply, u: false }]);
    } catch {
      setMsgs((m) => [...m, { t: 'Could not reach the assistant.', u: false }]);
    }
  };
  return (
    <div className="tw chat-w">
      <div className="chat-log" role="log" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`msg ${m.u ? 'user' : 'bot'}`}>{m.t}</div>)}
        {isLoading && <div className="msg bot">…</div>}
      </div>
      <div className="chat-in">
        <input className="inp" value={input} placeholder="Ask Brenda…" aria-label="Ask Brenda" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
        <button className="btn primary" onClick={send} disabled={!input.trim() || isLoading} aria-label="Send"><Icon name="send" size={14} /></button>
      </div>
    </div>
  );
}

function NotesWidget() {
  const toast = useToast();
  const { data: notes = [], isLoading, isError, error, refetch } = useGetNotesQuery();
  const [createNote, { isLoading: creating }] = useCreateNoteMutation();
  const [val, setVal] = useState('');
  const add = async () => {
    if (creating) return;
    const v = val.trim();
    if (!v) return;
    try { await createNote({ title: v, description: '', location: '' }).unwrap(); setVal(''); toast('Note added'); }
    catch (err) { toast(errorText(err)); }
  };
  return (
    <div className="tw">
      <div className="field"><input className="inp" placeholder="Write a note…" aria-label="New note" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} /></div>
      <button className="btn primary" onClick={add} disabled={!val.trim() || creating}>Add note</button>
      <div style={{ marginTop: 6 }}>
        {isError ? <LoadError what="notes" error={error} onRetry={refetch} />
          : isLoading ? <p className="loading">Loading…</p>
          : notes.length === 0 && <div className="cap">No notes yet.</div>}
        {notes.slice(0, 8).map((n) => (
          <div className="titem" key={n.id}><span className="nm">{n.title}{n.description && <div className="desc">{n.description}</div>}</span></div>
        ))}
      </div>
    </div>
  );
}

const PLATFORMS = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn'];

function PublisherWidget() {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [plats, setPlats] = useState<string[]>([]);
  const [createPost, { isLoading: publishing }] = useCreatePostMutation();
  const toggle = (p: string) => setPlats((x) => (x.includes(p) ? x.filter((i) => i !== p) : [...x, p]));
  const max = postBodyLimit(plats);
  const tooLong = body.length > max;
  const publish = async () => {
    if (!title.trim() || !plats.length || tooLong) return;
    try {
      await createPost({ title: title.trim(), body: body.trim(), platforms: plats, status: 'published' }).unwrap();
      setTitle(''); setBody(''); setPlats([]);
      toast('Published to ' + plats.join(', '));
    } catch (err) { toast(errorText(err)); }
  };
  return (
    <div className="tw">
      <div className="field"><label htmlFor="pw-title">Title</label><input id="pw-title" className="inp" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="field">
        <label htmlFor="pw-body">Description <span className={cx('cap', tooLong && 'err')} style={{ float: 'right', margin: 0 }}>{body.length} / {max}</span></label>
        <input id="pw-body" className="inp" value={body} maxLength={POST_BODY_MAX} aria-invalid={tooLong} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="sublab" id="pw-platforms">Platforms</div>
      <div role="group" aria-labelledby="pw-platforms">
        {PLATFORMS.map((p) => (
          <label className="check" key={p}>
            <input type="checkbox" checked={plats.includes(p)} onChange={() => toggle(p)} />
            <span className="box"><Icon name="tick" /></span> {p}
          </label>
        ))}
      </div>
      <div className="row gap-2" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={!title.trim() || !plats.length || tooLong || publishing} onClick={publish}>Publish</button>
        <PreviewBadge label="Posting simulated" />
      </div>
    </div>
  );
}

function NotificationsWidget() {
  const { data: notifs = [], isLoading, isError, error, refetch } = useGetNotificationsQuery();
  const [updateNotification] = useUpdateNotificationMutation();
  const markRead = (id: string) => updateNotification({ id, body: { read: true } });
  return (
    <div className="tw">
      {isError ? <LoadError what="notifications" error={error} onRetry={refetch} />
        : isLoading ? <p className="loading">Loading…</p>
        : notifs.length === 0 && <div className="cap">You're all caught up.</div>}
      {notifs.slice(0, 10).map((n) => (
        <div className="titem" key={n.id} style={{ cursor: n.read ? 'default' : 'pointer' }} onClick={() => { if (!n.read) markRead(n.id); }}>
          <span className="tag soft">{n.kind}</span>
          <span className="nm" style={n.read ? { opacity: .6 } : { fontWeight: 600 }}>{n.message}</span>
          {!n.read && (
            <button className="btn quiet sm" onClick={(e) => { e.stopPropagation(); markRead(n.id); }} aria-label={`Mark as read: ${n.message}`}><Icon name="check" size={14} /></button>
          )}
        </div>
      ))}
    </div>
  );
}

function NewsletterWidget() {
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [createCampaign, { isLoading: sending }] = useCreateCampaignMutation();
  const { data: contacts } = useGetContactsQuery();
  const reachable = contacts?.filter((c) => c.email).length;
  const send = async () => {
    if (!subject.trim() || !content.trim()) return;
    try {
      const c = await createCampaign({ title: subject.trim(), subject: subject.trim(), content: content.trim(), status: 'sent' }).unwrap();
      setSubject(''); setContent('');
      toast(`Campaign sent to ${c.recipients} contact${c.recipients === 1 ? '' : 's'}`);
    } catch (err) { toast(errorText(err)); }
  };
  return (
    <div className="tw">
      <div className="field"><label htmlFor="nw-subject">Subject</label><input id="nw-subject" className="inp" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
      <div className="field"><label htmlFor="nw-content">Content</label><textarea id="nw-content" className="inp" rows={5} value={content} onChange={(e) => setContent(e.target.value)} /></div>
      <div className="cap" style={{ margin: 0 }}>Sends to all contacts with an email{reachable !== undefined ? ` (${reachable})` : ''}.</div>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={!subject.trim() || !content.trim() || sending} onClick={send}>Send now</button>
        <PreviewBadge label="Delivery simulated" />
      </div>
    </div>
  );
}

function EventsWidget() {
  const toast = useToast();
  const { data: events = [], isLoading, isError, error, refetch } = useGetEventsQuery();
  const [createEvent, { isLoading: creating }] = useCreateEventMutation();
  const [name, setName] = useState('');
  const add = async () => {
    if (creating) return;
    if (!name.trim()) return;
    try { await createEvent({ name: name.trim(), category: 'General', location: '' }).unwrap(); setName(''); toast('Event added'); }
    catch (err) { toast(errorText(err)); }
  };
  return (
    <div className="tw">
      <div className="field"><input className="inp" placeholder="New event…" aria-label="New event" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} /></div>
      <button className="btn primary" onClick={add} disabled={!name.trim() || creating}>Add event</button>
      <div style={{ marginTop: 6 }}>
        {isError ? <LoadError what="events" error={error} onRetry={refetch} />
          : isLoading ? <p className="loading">Loading…</p>
          : events.length === 0 && <div className="cap">No events yet.</div>}
        {events.slice(0, 8).map((ev) => (
          <div className="titem" key={ev.id}><span className="nm">{ev.name}{ev.location && <div className="desc">{ev.location}</div>}</span><span className="dt">{ev.startsAt ? fmtDay(ev.startsAt) : ''}</span></div>
        ))}
      </div>
    </div>
  );
}

export function toolWidget(id: ToolId) {
  switch (id) {
    case 'calculator': return <CalcWidget />;
    case 'chatbot': return <AssistantWidget />;
    case 'notes': return <NotesWidget />;
    case 'publisher': return <PublisherWidget />;
    case 'notifications': return <NotificationsWidget />;
    case 'newsletter': return <NewsletterWidget />;
    case 'events': return <EventsWidget />;
  }
}
