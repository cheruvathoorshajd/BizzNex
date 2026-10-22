import { z } from 'zod';

/* ── Domain ── */
export const STATUSES = ['Pending', 'In Progress', 'Completed'] as const;
export type Status = (typeof STATUSES)[number];
export const statusSchema = z.enum(STATUSES);

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  onboarding: OnboardingState;
  preferences: UserPreferences;
}

/* ── Account settings ── */
/** The shared demo account: its account settings are read-only, because every visitor uses it. */
export const DEMO_EMAIL = 'demo@bizznex.app';
export const START_PAGES = [
  'dashboard', 'projects', 'tasks', 'contacts', 'companies', 'deals', 'activities',
  'calculator', 'chatbot', 'notes', 'publisher', 'notifications', 'newsletter', 'events',
] as const;
export interface UserPreferences {
  /** The page BizzNex opens on after sign-in. */
  startPage?: (typeof START_PAGES)[number];
  notifications?: { dealWon?: boolean; weeklySummary?: boolean; productNews?: boolean };
}
/** One email rule for sign-up, sign-in and profile changes. */
export const emailSchema = z.string().trim().max(254).email('Enter a valid email address');
/** bcrypt only reads the first 72 bytes, so anything longer is refused instead of silently truncated. */
const within72Bytes = (pw: string) => new TextEncoder().encode(pw).length <= 72;
const PW_TOO_LONG = 'Use a shorter password (72 bytes at most)';
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(80).optional(),
  email: emailSchema.optional(),
  /** Required by the server when the email changes. */
  currentPassword: z.string().min(1).optional(),
});
export const updatePreferencesSchema = z.object({
  startPage: z.enum(START_PAGES).optional(),
  notifications: z.object({ dealWon: z.boolean().optional(), weeklySummary: z.boolean().optional(), productNews: z.boolean().optional() }).optional(),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Use at least 8 characters').refine(within72Bytes, PW_TOO_LONG),
});
export const deleteAccountSchema = z.object({ password: z.string().min(1, 'Enter your password') });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/* ── Onboarding ── */
export const ONBOARDING_ROLES = ['Founder', 'Sales', 'Marketing', 'Operations', 'Freelancer', 'Other'] as const;
export const TEAM_SIZES = ['Just me', '2–10', '11–50', '51–200', '200+'] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];
export const INDUSTRIES = [
  'Retail & e-commerce', 'Professional services', 'Marketing & creative', 'Food & hospitality',
  'Events & entertainment', 'Construction & trades', 'Health & wellness', 'Real estate',
  'Technology & software', 'Education & training', 'Finance & insurance', 'Manufacturing',
  'Non-profit', 'Other',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

/** A company found by the business lookup (public data from Wikidata; no API key). */
export interface CompanyMatch {
  id: string;
  name: string;
  description: string;
  website: string | null;
  domain: string | null;
  /** The source's own industry wording, e.g. "e-commerce". */
  industryLabel: string | null;
  /** That wording mapped onto BizzNex's industry list, when it maps cleanly. */
  industry: Industry | null;
  employees: number | null;
  teamSize: TeamSize | null;
  /** Country name in English, e.g. "Canada". */
  country: string | null;
  /** ISO 3166-1 alpha-2 of that country, e.g. "CA", when Wikidata has it. */
  countryCode: string | null;
  /** The company's logo on Wikimedia Commons, when Wikidata lists one. */
  logoUrl: string | null;
}
export const ONBOARDING_GOALS = ['projects', 'pipeline', 'relationships', 'marketing', 'events', 'organise'] as const;
export type OnboardingGoal = (typeof ONBOARDING_GOALS)[number];

/** Record ids created by "Start with sample data", so they can be excluded and cleared. */
export interface SampleIds {
  projects: string[]; tasks: string[]; companies: string[]; contacts: string[]; deals: string[]; activities: string[];
  notes: string[]; posts: string[]; campaigns: string[]; events: string[]; notifications: string[];
}

export interface OnboardingState {
  /** 'pending' right after sign-up → the setup wizard shows; 'done' once finished or skipped. */
  wizard?: 'pending' | 'done';
  profile?: {
    company?: string; website?: string; industry?: string; country?: string; logoUrl?: string;
    role?: string; teamSize?: string; goals?: OnboardingGoal[];
  };
  tourDone?: boolean;
  checklistDismissed?: boolean;
  /** Views whose first-visit feature intro has been dismissed. */
  seen?: string[];
  /** In-app actions that leave no record (asking the assistant, opening a window). */
  actions?: string[];
  sample?: SampleIds | null;
}

export const updateOnboardingSchema = z.object({
  wizard: z.enum(['pending', 'done']).optional(),
  profile: z.object({
    company: z.string().max(120).optional(),
    website: z.string().trim().max(200).optional(),
    industry: z.enum(INDUSTRIES).or(z.literal('')).optional(),
    /** ISO 3166-1 alpha-2, e.g. "CA" */
    country: z.string().regex(/^([A-Z]{2})?$/).optional(),
    // Commons file names run to 240 bytes, which percent-encoding can triple
    logoUrl: z.string().url().max(2048).startsWith('https://').or(z.literal('')).optional(),
    role: z.string().max(40).optional(),
    teamSize: z.string().max(20).optional(),
    goals: z.array(z.enum(ONBOARDING_GOALS)).max(ONBOARDING_GOALS.length).optional(),
  }).optional(),
  tourDone: z.boolean().optional(),
  checklistDismissed: z.boolean().optional(),
  seen: z.array(z.string().max(40)).max(50).optional(),
  actions: z.array(z.string().max(40)).max(50).optional(),
});
export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>;

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: Status;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  owner: string;
  spend: number;
  trend: number[];
  createdAt: string;
  tasks: Task[];
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  date: string | null;
  location: string;
  description: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/* ── Auth schemas ── */
export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').refine(within72Bytes, PW_TOO_LONG),
  name: z.string().trim().min(1, 'Tell us your name').max(80),
});
export const loginSchema = z.object({
  email: emailSchema,
  // same byte cap as sign-up, so a longer password can't sign in on its first 72 bytes alone
  password: z.string().min(1).refine(within72Bytes, PW_TOO_LONG),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** Whole dollars; also keeps every amount inside a Postgres integer. */
export const MAX_AMOUNT = 1_000_000_000;

/* ── Project schemas ── */
export const createProjectSchema = z.object({
  name: z.string().trim().max(200).min(1),
  owner: z.string().max(80).default('You'),
  spend: z.number().int().nonnegative().max(MAX_AMOUNT).default(0),
  trend: z.array(z.number().int().nonnegative().max(MAX_AMOUNT)).max(24).optional(),
});
export const updateProjectSchema = createProjectSchema.partial();
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/* ── Task schemas ── */
const isoOrNull = z.string().datetime().nullable().optional();
const taskFields = z.object({
  name: z.string().trim().max(200).min(1),
  description: z.string().max(10000).default(''),
  startDate: isoOrNull,
  endDate: isoOrNull,
  status: statusSchema.default('Pending'),
});
/** True when the dates are in order (or either is missing). The server also checks merged values on update. */
export const taskDatesInOrder = (t: { startDate?: string | null; endDate?: string | null }) =>
  !t.startDate || !t.endDate || new Date(t.endDate).getTime() >= new Date(t.startDate).getTime();
export const TASK_DATES_MESSAGE = 'End date must be on or after the start date.';
export const createTaskSchema = taskFields.refine(taskDatesInOrder, { message: TASK_DATES_MESSAGE, path: ['endDate'] });
export const updateTaskSchema = taskFields.partial();
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/* ── Note schemas ── */
export const createNoteSchema = z.object({
  title: z.string().max(200).min(1),
  date: isoOrNull,
  location: z.string().max(200).default(''),
  description: z.string().max(10000).default(''),
});
export const updateNoteSchema = createNoteSchema.partial();
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

/* ══ CRM ══════════════════════════════════════════════ */

/* ── Company ── */
export interface Company {
  id: string; userId: string;
  name: string; industry: string; website: string;
  createdAt: string;
}
export const createCompanySchema = z.object({
  name: z.string().trim().max(200).min(1),
  industry: z.string().max(80).default(''),
  website: z.string().max(300).default(''),
});
export const updateCompanySchema = createCompanySchema.partial();
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

/* ── Contact ── */
export interface Contact {
  id: string; userId: string;
  name: string; email: string; phone: string; title: string;
  companyId: string | null;
  createdAt: string;
}
export const createContactSchema = z.object({
  name: z.string().trim().max(200).min(1),
  email: z.string().trim().max(254).email().or(z.literal('')).default(''),
  phone: z.string().max(40).default(''),
  title: z.string().max(200).default(''),
  companyId: z.string().max(64).nullable().optional(),
});
export const updateContactSchema = createContactSchema.partial();
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

/* ── Deal ── */
export const DEAL_STAGES = ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
export const dealStageSchema = z.enum(DEAL_STAGES);
export interface Deal {
  id: string; userId: string;
  title: string; value: number; stage: DealStage;
  contactId: string | null; companyId: string | null;
  closeDate: string | null; createdAt: string;
}
export const createDealSchema = z.object({
  title: z.string().trim().max(200).min(1),
  value: z.number().int().nonnegative().max(MAX_AMOUNT).default(0),
  stage: dealStageSchema.default('Lead'),
  contactId: z.string().max(64).nullable().optional(),
  companyId: z.string().max(64).nullable().optional(),
  closeDate: isoOrNull,
});
export const updateDealSchema = createDealSchema.partial();
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

/* ── Activity ── */
export const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'Task'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export const activityTypeSchema = z.enum(ACTIVITY_TYPES);
export interface Activity {
  id: string; userId: string;
  type: ActivityType; subject: string; notes: string;
  dueDate: string | null; done: boolean;
  contactId: string | null; dealId: string | null;
  createdAt: string;
}
export const createActivitySchema = z.object({
  type: activityTypeSchema.default('Note'),
  subject: z.string().trim().max(200).min(1),
  notes: z.string().max(10000).default(''),
  dueDate: isoOrNull,
  done: z.boolean().default(false),
  contactId: z.string().max(64).nullable().optional(),
  dealId: z.string().max(64).nullable().optional(),
});
export const updateActivitySchema = createActivitySchema.partial();
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

/* ══ Persisted tools ══════════════════════════════════ */

/* ── Campaign (Newsletter) ── */
export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sent'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export interface Campaign {
  id: string; userId: string;
  title: string; subject: string; content: string; audience: string;
  status: CampaignStatus; recipients: number;
  scheduledAt: string | null; sentAt: string | null;
  createdAt: string;
}
export const createCampaignSchema = z.object({
  title: z.string().max(200).min(1),
  subject: z.string().max(200).default(''),
  content: z.string().max(10000).default(''),
  /** 'sent' sends now; 'scheduled' needs a future scheduledAt. Omitted = draft. */
  status: campaignStatusSchema.optional(),
  scheduledAt: isoOrNull,
});
export const updateCampaignSchema = z.object({
  title: z.string().max(200).min(1).optional(),
  subject: z.string().max(200).optional(),
  content: z.string().max(10000).optional(),
  /** Same rules as create; recipients and sentAt are always set by the server. */
  status: campaignStatusSchema.optional(),
  scheduledAt: isoOrNull,
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

/* ── Post (Publisher) ── */
export const POST_STATUSES = ['draft', 'published'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export const postStatusSchema = z.enum(POST_STATUSES);
/** Longest post body BizzNex stores. */
export const POST_BODY_MAX = 10000;
/** X (Twitter) caps a post at 280 characters, so a post that goes there must fit. */
export const POST_PLATFORM_LIMITS: Record<string, number> = { Twitter: 280 };
/** The body limit for a set of platforms: the strictest one that applies. */
export function postBodyLimit(platforms: readonly string[]): number {
  return Math.min(POST_BODY_MAX, ...platforms.map((p) => POST_PLATFORM_LIMITS[p] ?? POST_BODY_MAX));
}
export interface Post {
  id: string; userId: string;
  title: string; body: string; platforms: string[];
  status: PostStatus; publishedAt: string | null;
  createdAt: string;
}
export const createPostSchema = z.object({
  title: z.string().max(200).min(1),
  body: z.string().max(POST_BODY_MAX).default(''),
  platforms: z.array(z.string().max(40)).max(10).default([]),
  /** 'published' publishes now. Omitted = draft. */
  status: postStatusSchema.optional(),
});
export const updatePostSchema = z.object({
  title: z.string().max(200).min(1).optional(),
  body: z.string().max(POST_BODY_MAX).optional(),
  platforms: z.array(z.string().max(40)).max(10).optional(),
  /** 'published' publishes now; publishedAt is always set by the server. */
  status: postStatusSchema.optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

/* ── Event ── */
export interface EventItem {
  id: string; userId: string;
  name: string; category: string; location: string;
  startsAt: string | null; createdAt: string;
}
export const createEventSchema = z.object({
  name: z.string().max(200).min(1),
  category: z.string().max(80).default('General'),
  location: z.string().max(200).default(''),
  startsAt: isoOrNull,
});
export const updateEventSchema = createEventSchema.partial();
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/* ── Notification ── */
export interface NotificationItem {
  id: string; userId: string;
  kind: string; message: string; read: boolean;
  createdAt: string;
}
export const updateNotificationSchema = z.object({
  read: z.boolean().optional(),
});
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;

/* ── Assistant (AI) ── */
export interface AssistantReply {
  reply: string;
}
export const assistantAskSchema = z.object({
  prompt: z.string().max(2000).min(1),
});
export type AssistantAskInput = z.infer<typeof assistantAskSchema>;
