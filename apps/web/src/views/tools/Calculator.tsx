import { useState } from 'react';
import { calc, cx } from '../../utils';

const MEM_KEYS = ['MC', 'MR', 'M+', 'M−'];
const KEYS = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='];

type Mode = 'tax' | 'tip' | 'disc' | 'margin';
const BC_LABELS: Record<Mode, [string, string, string]> = {
  tax: ['Amount', 'Rate %', 'Total'],
  tip: ['Bill', 'Tip %', 'Each, split two ways'],
  disc: ['Price', 'Discount %', 'You pay'],
  margin: ['Cost', 'Sale price', 'Margin'],
};

export default function Calculator() {
  const [expr, setExpr] = useState('');
  const [mem, setMem] = useState(0);
  const [tape, setTape] = useState<{ e: string; r: string }[]>([]);
  const [mode, setMode] = useState<Mode>('tax');
  const [a, setA] = useState('100');
  const [b, setB] = useState('8');

  const pressKey = (k: string) => {
    if (k === 'C') return setExpr('');
    if (k === '⌫') return setExpr((e) => (e === 'Error' ? '' : e.slice(0, -1)));
    if (k === '=') {
      try {
        const r = String(calc(expr));
        setTape((t) => [{ e: expr, r }, ...t]);
        setExpr(r);
      } catch { setExpr('Error'); }
      return;
    }
    setExpr((e) => (e === 'Error' ? '' : e) + k);
  };

  const pressMem = (m: string) => {
    const cur = Number(expr) || 0;
    if (m === 'MC') setMem(0);
    else if (m === 'MR') setExpr(String(mem));
    else if (m === 'M+') setMem((x) => x + cur);
    else setMem((x) => x - cur);
  };

  const A = Number(a) || 0;
  const B = Number(b) || 0;
  const result =
    mode === 'tax' ? '$' + (A * (1 + B / 100)).toFixed(2)
    : mode === 'tip' ? '$' + ((A * (1 + B / 100)) / 2).toFixed(2)
    : mode === 'disc' ? '$' + (A * (1 - B / 100)).toFixed(2)
    : (B ? (((B - A) / B) * 100).toFixed(1) : '0') + '%';
  const [la, lb, lr] = BC_LABELS[mode];

  return (
    <div>
      <div className="view-head">
        <p className="spec"><span className="k">§ Tool</span><span>Calculator</span></p>
        <h1 className="view-title">Calculator</h1>
      </div>

      <div className="tool-cols">
        <div className="panel" style={{ maxWidth: 380 }}>
          <div className="calc-screen">{mem !== 0 && <span className="cap" style={{ float: 'left', margin: 0 }}>M</span>}{expr || '0'}</div>
          <div className="calc-keys" style={{ marginTop: 12 }}>
            {MEM_KEYS.map((k) => <button key={k} className="key op" onClick={() => pressMem(k)}>{k}</button>)}
            {KEYS.map((k) => (
              <button key={k} className={cx('key', '÷×−+%'.includes(k) && 'op', k === '=' && 'eq')} onClick={() => pressKey(k)}>{k}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div className="sublab" style={{ marginTop: 0 }}>§ History</div>
            <div className="tape">
              {tape.length === 0
                ? <div className="row" style={{ color: 'var(--faint)' }}><span>No calculations yet</span></div>
                : tape.map((t, i) => <div className="row" key={i}><span>{t.e}</span><b>{t.r}</b></div>)}
            </div>
          </div>

          <div>
            <div className="sublab">§ Business quick-calc</div>
            <div className="field"><label>Mode</label>
              <select className="inp" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                <option value="tax">Sales tax</option>
                <option value="tip">Tip &amp; split (÷2)</option>
                <option value="disc">Discount</option>
                <option value="margin">Profit margin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="field" style={{ flex: 1 }}><label>{la}</label><input className="inp num" value={a} onChange={(e) => setA(e.target.value)} /></div>
              <div className="field" style={{ flex: 1 }}><label>{lb}</label><input className="inp num" value={b} onChange={(e) => setB(e.target.value)} /></div>
            </div>
            <div className="metric" style={{ marginTop: 2 }}>
              <div className="l">{lr}</div>
              <div className="big num" style={{ fontSize: '2rem' }}>{result}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
