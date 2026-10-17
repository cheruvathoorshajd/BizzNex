/** All onboarding copy lives here, so tone stays consistent and edits stay in one place. */
import { ONBOARDING_ROLES, TEAM_SIZES as SHARED_TEAM_SIZES } from '@bizznex/shared';
import type { OnboardingGoal } from '@bizznex/shared';
import type { ViewId } from '../types';

/* ── Setup wizard ─────────────────────────────────────────────── */

export const GOALS: { id: OnboardingGoal; icon: string; title: string; body: string; view: ViewId }[] = [
  { id: 'projects', icon: 'folder', title: 'Run projects & tasks', body: 'Plan work, set due dates and see progress at a glance.', view: 'projects' },
  { id: 'pipeline', icon: 'briefcase', title: 'Close more deals', body: 'Track every opportunity from lead to won on a pipeline board.', view: 'deals' },
  { id: 'relationships', icon: 'user', title: 'Know my customers', body: 'Keep contacts, companies and every call or email in one place.', view: 'contacts' },
  { id: 'marketing', icon: 'upload', title: 'Market my business', body: 'Write social posts and newsletters once, send them everywhere.', view: 'publisher' },
  { id: 'events', icon: 'calendar', title: 'Plan events', body: 'Keep meetups, workshops and launches on one calendar.', view: 'events' },
  { id: 'organise', icon: 'note', title: 'Stay organised', body: 'Notes, a business calculator and an assistant within reach.', view: 'notes' },
];

/** Shared with the API so the wizard and the stored profile never drift apart. */
export const ROLES: readonly string[] = ONBOARDING_ROLES;
export const TEAM_SIZES: readonly string[] = SHARED_TEAM_SIZES;

/* ── Product tour ─────────────────────────────────────────────── */

export interface TourStep {
  /** `data-tour` value of the element to spotlight; omit for a centred card. */
  target?: string;
  /** Switch to this view first (so view-specific controls exist). */
  view?: ViewId;
  title: string;
  body: string;
  /** Only for guided sessions (new users, demo); e.g. the checklist doesn't exist for returning sign-ins. */
  guidedOnly?: boolean;
}

export const TOUR: TourStep[] = [
  {
    view: 'dashboard',
    title: 'A quick look around',
    body: 'A one-minute look at where everything is. Use the arrow keys to move through it, or press Esc to leave at any time.',
  },
  {
    target: 'nav-workspace',
    title: 'Your workspace',
    body: 'The Dashboard sums up your business. Projects and Tasks hold the work. The count next to Tasks shows how many are still open.',
  },
  {
    target: 'nav-crm',
    title: 'A CRM built in',
    body: 'Contacts and Companies are the people you work with. Deals move through a pipeline. Activities log every call, email and meeting.',
  },
  {
    target: 'nav-tools',
    title: 'Click to open, right-click to float',
    body: 'Click a tool to open it as a full page. Right-click it to open a small floating window you can keep beside any other page.',
  },
  {
    target: 'top-search',
    view: 'contacts',
    title: 'Search the current page',
    body: 'On Projects, Tasks and every CRM page, this box filters the current list as you type.',
  },
  {
    target: 'top-prefs',
    title: 'Make it yours',
    body: 'Switch between English, Español and Français, or between light and dark mode. Your choice is saved.',
  },
  {
    target: 'help',
    title: 'Help is always here',
    body: 'Replay this tour, read the tips for the page you\'re on, or browse every page in the Feature guide. Press ? from anywhere to open this menu.',
  },
  {
    target: 'checklist',
    view: 'dashboard',
    guidedOnly: true,
    title: 'Your next steps',
    body: 'A short checklist that ticks off by itself as you use BizzNex. Do the steps in any order.',
  },
];

/* ── Getting-started checklist ────────────────────────────────── */

export type ChecklistKey =
  | 'tour' | 'project' | 'task' | 'contact' | 'company' | 'deal' | 'activity'
  | 'note' | 'assistant' | 'window' | 'publish' | 'event';

export interface ChecklistItem {
  key: ChecklistKey;
  title: string;
  body: string;
  view?: ViewId;
  cta: string;
  goals: OnboardingGoal[];
}

export const CHECKLIST: ChecklistItem[] = [
  { key: 'tour', title: 'Take the product tour', body: 'A one-minute walk through BizzNex.', cta: 'Start tour', goals: [] },
  { key: 'project', title: 'Create a project', body: 'A project groups the tasks for one piece of work.', view: 'projects', cta: 'Open Projects', goals: ['projects'] },
  { key: 'task', title: 'Add a task', body: 'Give it a due date and a status.', view: 'tasks', cta: 'Open Tasks', goals: ['projects'] },
  { key: 'contact', title: 'Add your first contact', body: 'The person behind every deal.', view: 'contacts', cta: 'Open Contacts', goals: ['relationships', 'pipeline'] },
  { key: 'company', title: 'Add a company', body: 'Link your contacts to the company they work for.', view: 'companies', cta: 'Open Companies', goals: ['relationships'] },
  { key: 'deal', title: 'Open a deal', body: 'Give it a value, then move it through the stages until it\'s won.', view: 'deals', cta: 'Open Deals', goals: ['pipeline'] },
  { key: 'activity', title: 'Log an activity', body: 'Record a call, email or meeting against a contact.', view: 'activities', cta: 'Open Activities', goals: ['relationships', 'pipeline'] },
  { key: 'publish', title: 'Draft a post or newsletter', body: 'Write it once and publish it to several channels.', view: 'publisher', cta: 'Open Publisher', goals: ['marketing'] },
  { key: 'event', title: 'Add an event', body: 'Meetups, workshops, launches.', view: 'events', cta: 'Open Events', goals: ['events'] },
  { key: 'note', title: 'Write a note', body: 'For ideas, meeting notes and plans.', view: 'notes', cta: 'Open Notes', goals: ['organise'] },
  { key: 'assistant', title: 'Ask Brenda a question', body: 'Try asking “How is my pipeline?”', view: 'chatbot', cta: 'Open Assistant', goals: ['organise', 'pipeline'] },
  { key: 'window', title: 'Open a tool in a window', body: 'Right-click any tool in the sidebar.', cta: 'Show me', goals: ['organise'] },
];

/* ── First-visit feature intros (one per page) ────────────────── */

export interface FeatureIntro {
  kicker: string;
  title: string;
  lede: string;
  tips: string[];
}

export const INTROS: Record<ViewId, FeatureIntro> = {
  dashboard: {
    kicker: 'Dashboard',
    title: 'Your business at a glance',
    lede: 'Everything on this page updates as you add projects, tasks and deals.',
    tips: [
      'Drag the relationship globe to turn it, and scroll to zoom in or out.',
      'Click a recent project to open it.',
      'The “Intelligence” note names the project with the most pending tasks.',
    ],
  },
  projects: {
    kicker: 'Projects',
    title: 'One place for every piece of work',
    lede: 'Each project tracks its spend, its tasks and how far along it is.',
    tips: [
      'Use “New project” to start one. Add tasks from inside the project.',
      'The small line chart on each row shows recent spend.',
      'Type in the search box at the top to filter the list.',
    ],
  },
  tasks: {
    kicker: 'Tasks',
    title: 'Every task, grouped by project',
    lede: 'Check off a task to complete it. A project counts as done when all of its tasks are done.',
    tips: [
      'Give each task a start date and a due date to plan the week.',
      'Hover over a row to edit or delete it.',
      'The number next to Tasks in the sidebar counts open tasks.',
    ],
  },
  contacts: {
    kicker: 'CRM · Contacts',
    title: 'The people you do business with',
    lede: 'Store each person\'s name, role, email and phone, and link them to their company.',
    tips: [
      'Add a company first, then pick it when you add the contact.',
      'Calls, emails and meetings you log against a contact appear in Activities.',
      'Search works on name, email, title and company.',
    ],
  },
  companies: {
    kicker: 'CRM · Companies',
    title: 'The companies behind your deals',
    lede: 'Group contacts and deals by company, and record each one\'s industry and website.',
    tips: [
      'Deleting a company keeps its contacts. They are just unlinked.',
      'Add the industry so you can see which kinds of customers you win.',
    ],
  },
  deals: {
    kicker: 'CRM · Deals',
    title: 'Your sales pipeline',
    lede: 'Move each deal through Lead → Qualified → Proposal → Won (or Lost). Each column shows its total value.',
    tips: [
      'Use ◀ and ▶ on a card to move it to the previous or next stage.',
      'When you win a deal, BizzNex adds a notification for it.',
      'Link a contact and a company so the assistant can report on the deal.',
    ],
  },
  activities: {
    kicker: 'CRM · Activities',
    title: 'Every touchpoint, logged',
    lede: 'Calls, emails, meetings, notes and follow-ups, each linked to a contact or a deal.',
    tips: [
      'Give follow-ups a due date, then tick them off when they\'re done.',
      'Search covers the subject, notes, type, contact and deal.',
    ],
  },
  calculator: {
    kicker: 'Tool · Calculator',
    title: 'A calculator for business sums',
    lede: 'It has memory keys, a history of past results, and quick calculations for tax, tips, discounts and margin.',
    tips: [
      'Use MC, MR, M+ and M− to keep a running total between calculations.',
      'Right-click Calculator in the sidebar to keep it open in a window.',
    ],
  },
  chatbot: {
    kicker: 'Tool · Assistant',
    title: 'Meet Brenda, your assistant',
    lede: 'Brenda answers questions using your own BizzNex data: deals, tasks, contacts and activities.',
    tips: [
      'Try “How is my pipeline?”, “What’s due this week?” or “Who should I follow up with?”',
      'Brenda runs inside BizzNex itself. Your data is never sent to an outside service.',
    ],
  },
  notes: {
    kicker: 'Tool · Notes',
    title: 'Write it down before you forget it',
    lede: 'Notes can have a date and a location, and they are saved to your account.',
    tips: [
      'Use the search box on this page to find a note quickly.',
      'Open Notes in a window to take notes while you work on another page.',
    ],
  },
  publisher: {
    kicker: 'Tool · Publisher',
    title: 'Write once, post everywhere',
    lede: 'Draft a post, choose your platforms and check the live preview before you publish.',
    tips: [
      'Posts are limited to 280 characters, and the counter shows how many you\'ve used.',
      'Posts are saved in BizzNex. Posting to the real social networks is a preview for now and needs connected accounts.',
    ],
  },
  notifications: {
    kicker: 'Tool · Notifications',
    title: 'What needs your attention',
    lede: 'Won deals, tasks due soon and campaign updates show up here.',
    tips: [
      'Mark notifications as read one at a time, or all at once.',
      'Winning a deal adds a notification automatically.',
    ],
  },
  newsletter: {
    kicker: 'Tool · Newsletter',
    title: 'Email campaigns for your audience',
    lede: 'Write a campaign, choose an audience, then schedule or send it. The Analytics tab tracks its performance.',
    tips: [
      'Write a short, specific subject line. It affects how many people open the email.',
      'Campaigns are saved in BizzNex. Sending real email is a preview for now.',
    ],
  },
  settings: {
    kicker: 'Settings',
    title: 'Your account, your way',
    lede: 'Edit your profile, password, preferences and notifications, and export or delete your data.',
    tips: [
      'Choose the page BizzNex opens on in Preferences.',
      'Export everything you have in BizzNex as one file from Data & privacy.',
    ],
  },
  events: {
    kicker: 'Tool · Events',
    title: 'Your events calendar',
    lede: 'Meetups, client workshops and launches, each with a category, a location and a date.',
    tips: [
      'Filter by category to plan the busy weeks.',
      'Right-click Events in the sidebar to add an event from a small window.',
    ],
  },
};
