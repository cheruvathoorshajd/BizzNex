import { lazy } from 'react';
import type { ReactNode } from 'react';
import type { ViewId } from '../../types';

// full-page tool views load on first open (App wraps them in Suspense); windows use the eager widgets
const Calculator = lazy(() => import('./Calculator'));
const Chatbot = lazy(() => import('./Chatbot'));
const Notes = lazy(() => import('./Notes'));
const Publisher = lazy(() => import('./Publisher'));
const Notifications = lazy(() => import('./Notifications'));
const Newsletter = lazy(() => import('./Newsletter'));
const Events = lazy(() => import('./Events'));

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
