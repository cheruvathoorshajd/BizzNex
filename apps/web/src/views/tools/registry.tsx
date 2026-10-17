import type { ReactNode } from 'react';
import type { ViewId } from '../../types';
import Calculator from './Calculator';
import Chatbot from './Chatbot';
import Notes from './Notes';
import Publisher from './Publisher';
import Notifications from './Notifications';
import Newsletter from './Newsletter';
import Events from './Events';

/** The tool views that can also open as floating windows (right-click in the sidebar).
 *  Workspace views (dashboard/projects/tasks) are inline-only. */
export const TOOL_IDS = [
  'calculator', 'chatbot', 'notes', 'publisher', 'notifications', 'newsletter', 'events',
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export const isToolId = (id: ViewId): id is ToolId =>
  (TOOL_IDS as readonly string[]).includes(id);

/** The full-page inline version of a tool (left-click). Windows use the compact `toolWidget`. */
export function toolNode(id: ToolId): ReactNode {
  switch (id) {
    case 'calculator': return <Calculator />;
    case 'chatbot': return <Chatbot />;
    case 'notes': return <Notes />;
    case 'publisher': return <Publisher />;
    case 'notifications': return <Notifications />;
    case 'newsletter': return <Newsletter />;
    case 'events': return <Events />;
  }
}
