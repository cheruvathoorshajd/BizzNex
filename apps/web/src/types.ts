/** Domain types come from the shared contract; client-only types stay local. */
export type {
  Project, Task, Note, Status, User,
  Company, Contact, Deal, DealStage, Activity, ActivityType,
  Campaign, CampaignStatus, Post, PostStatus, EventItem, NotificationItem,
  AssistantReply,
} from '@bizznex/shared';

export type Language = 'en' | 'es' | 'fr';

export type ViewId =
  | 'dashboard' | 'projects' | 'tasks'
  | 'contacts' | 'companies' | 'deals' | 'activities'
  | 'calculator' | 'chatbot' | 'notes' | 'publisher'
  | 'notifications' | 'newsletter' | 'events'
  | 'settings';
