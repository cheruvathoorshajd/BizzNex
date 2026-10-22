import { useCallback, useRef, useState } from 'react';
import type { ToolId } from '../views/tools/registry';

export interface WinRec {
  id: ToolId;
  min: boolean;
  z: number;
  /** initial (cascaded) top-left; the window owns its live geometry after that */
  x: number;
  y: number;
}

/** Tracks which tools are open as windows, their stacking order and minimised state.
 *  Live drag/resize geometry lives inside each ToolWindow to avoid re-rendering on pointer move. */
export function useWindows() {
  const [wins, setWins] = useState<WinRec[]>([]);
  const z = useRef(20);
  const casc = useRef(0);

  const focusWindow = useCallback((id: ToolId) => {
    z.current += 1;
    const nz = z.current;
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z: nz } : w)));
  }, []);

  // Side effects (z / cascade counters) stay outside the state updaters: StrictMode runs updaters
  // twice, which would otherwise skip cascade slots.
  const open = useRef(new Set<ToolId>());

  const openWindow = useCallback((id: ToolId) => {
    z.current += 1;
    const nz = z.current;
    if (open.current.has(id)) {
      setWins((ws) => ws.map((w) => (w.id === id ? { ...w, min: false, z: nz } : w)));
      return;
    }
    open.current.add(id);
    const i = casc.current % 6;
    casc.current += 1;
    setWins((ws) => (ws.some((w) => w.id === id) ? ws : [...ws, { id, min: false, z: nz, x: 96 + i * 34, y: 92 + i * 30 }]));
  }, []);

  const closeWindow = useCallback((id: ToolId) => {
    open.current.delete(id);
    setWins((ws) => ws.filter((w) => w.id !== id));
  }, []);

  const toggleMin = useCallback((id: ToolId) => {
    z.current += 1;
    const nz = z.current;
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, min: !w.min, z: w.min ? nz : w.z } : w)));
  }, []);

  return { wins, openIds: wins.map((w) => w.id), openWindow, closeWindow, focusWindow, toggleMin };
}
