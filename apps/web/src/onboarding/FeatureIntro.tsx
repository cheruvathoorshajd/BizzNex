import type { ViewId } from '../types';
import Icon from '../ui/Icon';
import { INTROS } from './content';

interface Props {
  view: ViewId;
  onDismiss: () => void;
}

/** A dismissible "what is this page" card, shown the first time each page is opened. */
export default function FeatureIntro({ view, onDismiss }: Props) {
  const c = INTROS[view];
  if (!c) return null;
  return (
    <section className="fi" aria-label={`About ${c.kicker}`}>
      <div className="fi-main">
        <p className="spec"><span className="k">New here</span><span>{c.kicker}</span></p>
        <h2 className="fi-t">{c.title}</h2>
        <p className="fi-lede">{c.lede}</p>
      </div>
      <ul className="fi-tips">
        {c.tips.map((t, i) => (
          <li key={i}><span className="num">{String(i + 1).padStart(2, '0')}</span>{t}</li>
        ))}
      </ul>
      <div className="fi-act">
        <button className="btn ghost sm" onClick={onDismiss}>Got it</button>
      </div>
      <button className="x-btn fi-x" onClick={onDismiss} aria-label="Dismiss"><Icon name="x" size={15} /></button>
    </section>
  );
}
