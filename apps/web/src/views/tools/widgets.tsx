import { useState } from 'react';
import { calc, cx, fmtDay } from '../../utils';
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
} from '../../services/api';
import type { ToolId } from './registry';
import { useOnboarding } from '../../onboarding/useOnboarding';
import { errorText } from '../../services/errors';

/* Compact tool widgets — the version shown inside a floating window (right-click).
 * Deliberately stripped down (no page header) so everything fits the standard window.
 * These now use the SAME real, persisted API as the full-page views. */

const CALC_KEYS = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='];

function CalcWidget() {
  const [expr, setExpr] = useState('');
  const press = (k: string) => {
    if (k === 'C') return setExpr('');
    if (k === '⌫') return setExpr((e) => (e === 'Error' ? '' : e.slice(0, -1)));
    if (k === '=') {
      try { return setExpr(String(calc(expr))); } catch { return setExpr('Error'); }
    }
    setExpr((e) => (e === 'Error' ? '' : e) + k);
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
    { t: "Hi! I'm Brenda — ask me anything about your business.", u: false },
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
      <div className="chat-log">
        {msgs.map((m, i) => <div key={i} className={`msg ${m.u ? 'user' : 'bot'}`}>{m.t}</div>)}
        {isLoading && <div className="msg bot">…</div>}
      </div>
      <div className="chat-in">
        <input className="inp" value={input} placeholder="Ask Brenda…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
        <button className="btn primary" onClick={send} disabled={!input.trim() || isLoading}><Icon name="send" size={14} /></button>
      </div>
    </div>
  );
}

function NotesWidget() {
  const toast = useToast();
  const { data: notes = [] } = useGetNotesQuery();
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
      <div className="field"><input className="inp" placeholder="Write a note…" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} /></div>
      <button className="btn primary" onClick={add} disabled={!val.trim() || creating}>Add note</button>
      <div style={{ marginTop: 6 }}>
        {notes.length === 0 && <div className="cap">No notes yet.</div>}
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
  const publish = async () => {
    if (!title.trim() || !plats.length) return;
    try {
      await createPost({ title: title.trim(), body: body.trim(), platforms: plats, status: 'published' }).unwrap();
      setTitle(''); setBody(''); setPlats([]);
      toast('Published to ' + plats.join(', '));
    } catch (err) { toast(errorText(err)); }
  };
  return (
    <div className="tw">
      <div className="field"><label>Title</label><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="field"><label>Description</label><input className="inp" value={body} onChange={(e) => setBody(e.target.value)} /></div>
      <div className="sublab">Platforms</div>
      {PLATFORMS.map((p) => (
        <label className="check" key={p} onClick={(e) => { e.preventDefault(); toggle(p); }}>
          <span className={cx('box', plats.includes(p) && 'on')}><Icon name="tick" /></span> {p}
        </label>
      ))}
      <div className="row gap-2" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={!title.trim() || !plats.length || publishing} onClick={publish}>Publish</button>
        <PreviewBadge label="Posting simulated" />
      </div>
    </div>
  );
}

function NotificationsWidget() {
  const { data: notifs = [] } = useGetNotificationsQuery();
  const [updateNotification] = useUpdateNotificationMutation();
  return (
    <div className="tw">
      {notifs.length === 0 && <div className="cap">You're all caught up.</div>}
      {notifs.slice(0, 10).map((n) => (
        <div className="titem" key={n.id} style={{ cursor: n.read ? 'default' : 'pointer' }} onClick={() => { if (!n.read) updateNotification({ id: n.id, body: { read: true } }); }}>
          <span className="tag soft">{n.kind}</span>
          <span className="nm" style={n.read ? { opacity: .6 } : { fontWeight: 600 }}>{n.message}</span>
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
  const send = async () => {
    if (!subject.trim() || !content.trim()) return;
    try {
      const c = await createCampaign({ title: subject.trim(), subject: subject.trim(), content: content.trim(), audience: 'All subscribers', status: 'sent' }).unwrap();
      setSubject(''); setContent('');
      toast(`Campaign sent to ${c.recipients} contact${c.recipients === 1 ? '' : 's'}`);
    } catch (err) { toast(errorText(err)); }
  };
  return (
    <div className="tw">
      <div className="field"><label>Subject</label><input className="inp" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
      <div className="field"><label>Content</label><textarea className="inp" rows={5} value={content} onChange={(e) => setContent(e.target.value)} /></div>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={!subject.trim() || !content.trim() || sending} onClick={send}>Send now</button>
        <PreviewBadge label="Delivery simulated" />
      </div>
    </div>
  );
}

function EventsWidget() {
  const toast = useToast();
  const { data: events = [] } = useGetEventsQuery();
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
      <div className="field"><input className="inp" placeholder="New event…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} /></div>
      <button className="btn primary" onClick={add} disabled={!name.trim() || creating}>Add event</button>
      <div style={{ marginTop: 6 }}>
        {events.length === 0 && <div className="cap">No events yet.</div>}
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
