import { useT } from '../i18n/useT';
import { LABELS } from '../nav';
import { toolWidget } from '../views/tools/widgets';
import ToolWindow from './ToolWindow';
import type { WinRec } from './useWindows';

interface Props {
  wins: WinRec[];
  onFocus: (id: WinRec['id']) => void;
  onClose: (id: WinRec['id']) => void;
  onMinimize: (id: WinRec['id']) => void;
}

/** Floating layer that renders every open tool window above the app. */
export default function WindowLayer({ wins, onFocus, onClose, onMinimize }: Props) {
  const t = useT();
  if (!wins.length) return null;

  const topZ = Math.max(...wins.filter((w) => !w.min).map((w) => w.z), -1);

  return (
    <div className="win-layer">
      {wins.map((w) => (
        <ToolWindow
          key={w.id}
          rec={w}
          title={t(LABELS[w.id])}
          focused={!w.min && w.z === topZ}
          onFocus={() => onFocus(w.id)}
          onClose={() => onClose(w.id)}
          onMinimize={() => onMinimize(w.id)}
        >
          {toolWidget(w.id)}
        </ToolWindow>
      ))}
    </div>
  );
}
