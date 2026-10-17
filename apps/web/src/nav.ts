import type { ViewId } from './types';

export interface NavItem { id: ViewId; icon: string; labelKey: string; }

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'group.workspace',
    items: [
      { id: 'dashboard', icon: 'grid', labelKey: 'nav.dashboard' },
      { id: 'projects', icon: 'folder', labelKey: 'nav.projects' },
      { id: 'tasks', icon: 'check', labelKey: 'nav.tasks' },
    ],
  },
  {
    group: 'group.crm',
    items: [
      { id: 'contacts', icon: 'user', labelKey: 'nav.contacts' },
      { id: 'companies', icon: 'building', labelKey: 'nav.companies' },
      { id: 'deals', icon: 'briefcase', labelKey: 'nav.deals' },
      { id: 'activities', icon: 'activity', labelKey: 'nav.activities' },
    ],
  },
  {
    group: 'group.tools',
    items: [
      { id: 'calculator', icon: 'calculator', labelKey: 'nav.calculator' },
      { id: 'chatbot', icon: 'chat', labelKey: 'nav.chatbot' },
      { id: 'notes', icon: 'note', labelKey: 'nav.notes' },
      { id: 'publisher', icon: 'upload', labelKey: 'nav.publisher' },
      { id: 'notifications', icon: 'bell', labelKey: 'nav.notifications' },
      { id: 'newsletter', icon: 'mail', labelKey: 'nav.newsletter' },
      { id: 'events', icon: 'calendar', labelKey: 'nav.events' },
    ],
  },
];

export const LABELS: Record<ViewId, string> = {
  dashboard: 'nav.dashboard', projects: 'nav.projects', tasks: 'nav.tasks',
  contacts: 'nav.contacts', companies: 'nav.companies', deals: 'nav.deals', activities: 'nav.activities',
  calculator: 'nav.calculator', chatbot: 'nav.chatbot', notes: 'nav.notes', publisher: 'nav.publisher',
  notifications: 'nav.notifications', newsletter: 'nav.newsletter', events: 'nav.events',
  settings: 'nav.settings',
};
