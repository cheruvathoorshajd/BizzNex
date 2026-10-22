import { useRef, useState } from 'react';
import { useAskAssistantMutation } from '../../services/api';
import { useOnboarding } from '../../onboarding/useOnboarding';

/* Brenda is rule-based: these are exactly the questions she can answer (see assistant.service.ts). */
const SUGGESTIONS = [
  'How is my pipeline?',
  'Tasks due this week',
  'How many contacts do I have?',
  'Open activities',
];
export const BRENDA_GREETING = "Hi! I'm Brenda, BizzNex's built-in assistant. I can tell you about your deals, tasks due this week, contacts and open activities.";

export default function Chatbot() {
  const [msgs, setMsgs] = useState<{ t: string; u: boolean }[]>([
    { t: BRENDA_GREETING, u: false },
  ]);
  const [input, setInput] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const [ask, { isLoading }] = useAskAssistantMutation();
  const { track } = useOnboarding();

  const send = async (q0?: string) => {
    const q = (q0 ?? input).trim();
    if (!q || isLoading) return;
    setMsgs((m) => [...m, { t: q, u: true }]);
    setInput('');
    setRecent((r) => [q, ...r].slice(0, 12));
    try {
      const r = await ask({ prompt: q }).unwrap();
      track('assistant');
      setMsgs((m) => [...m, { t: r.reply, u: false }]);
    } catch {
      setMsgs((m) => [...m, { t: 'Could not reach the assistant. Please try again.', u: false }]);
    }
    requestAnimationFrame(() => logRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }));
  };

  return (
    <div>
      <div className="view-head">
        <p className="spec"><span className="k">§ Tool</span><span>Brenda · local assistant</span></p>
        <h1 className="view-title">Assistant</h1>
      </div>
      <p className="cap" style={{ margin: '2px 0 18px' }}>
        Brenda answers from your BizzNex data — try “deals” or “tasks due this week”.
      </p>

      <div className="tool-cols">
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: 440 }}>
          <div className="chat-log" ref={logRef} style={{ flex: 1, maxHeight: 'none' }} role="log" aria-live="polite">
            {msgs.map((m, i) => <div key={i} className={`msg ${m.u ? 'user' : 'bot'}`} style={{ whiteSpace: 'pre-wrap' }}>{m.t}</div>)}
            {isLoading && <div className="msg bot">…</div>}
          </div>
          <div className="chat-in" style={{ marginTop: 10 }}>
            <input className="inp" value={input} placeholder="Ask Brenda…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <button className="btn primary" onClick={() => send()} disabled={!input.trim() || isLoading}>{isLoading ? 'Thinking…' : 'Ask'}</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div className="sublab" style={{ marginTop: 0 }}>§ Try asking</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
          <div>
            <div className="sublab">§ Recent</div>
            <div className="tape">
              {recent.length === 0
                ? <div className="row" style={{ color: 'var(--faint)' }}><span>Nothing yet</span></div>
                : recent.map((q, i) => <div className="row" key={i}><span>{q}</span></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
