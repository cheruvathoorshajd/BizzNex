import { useT } from '../i18n/useT';
import { LABELS } from '../nav';
import { cx } from '../utils';
import type { WinRec } from './useWindows';

interface Props {
  wins: WinRec[];
  onToggle: (id: WinRec['id']) => void;
}

/** Bottom dock — appears only while at least one tool window is open. */
export default function Dock({ wins, onToggle }: Props) {
  const t = useT();
  if (!wins.length) return null;

  return (
    <div className="dock" role="toolbar" aria-label="Open windows">
      {wins.map((w) => (
        <button key={w.id} type="button" data-dock={w.id} className={cx('dock-item', !w.min && 'active')} aria-pressed={!w.min}
          title={w.min ? 'Restore window' : 'Minimise window'} onClick={() => onToggle(w.id)}>
          {t(LABELS[w.id])}
        </button>
      ))}
    </div>
  );
}
