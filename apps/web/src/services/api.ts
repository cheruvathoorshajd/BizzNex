import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { logout } from '../store/authSlice';
import type {
  Project, Task, Note, User, AuthResponse,
  RegisterInput, LoginInput,
  CreateProjectInput, UpdateProjectInput,
  CreateTaskInput, UpdateTaskInput,
  CreateNoteInput, UpdateNoteInput,
  Company, CreateCompanyInput, UpdateCompanyInput,
  Contact, CreateContactInput, UpdateContactInput,
  Deal, CreateDealInput, UpdateDealInput,
  Activity, CreateActivityInput, UpdateActivityInput,
  Campaign, CreateCampaignInput, UpdateCampaignInput,
  Post, CreatePostInput, UpdatePostInput,
  EventItem, CreateEventInput, UpdateEventInput,
  NotificationItem, CreateNotificationInput, UpdateNotificationInput,
  AssistantReply, AssistantAskInput,
  UpdateOnboardingInput,
  UpdateProfileInput, UpdatePreferencesInput, ChangePasswordInput, DeleteAccountInput,
} from '@bizznex/shared';

export const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';
const baseUrl = API_BASE;

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

/** These answer 401 for a wrong password, which must not end the session. */
const PASSWORD_CHECKS = ['/auth/login', '/auth/register', '/account/password', '/account'];

/** A 401 anywhere else means the session expired or was revoked: sign out instead of failing every action. */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, apiCtx, extra) => {
  const result = await rawBaseQuery(args, apiCtx, extra);
  const url = typeof args === 'string' ? args : args.url;
  if (result.error?.status === 401 && (apiCtx.getState() as RootState).auth.token && !PASSWORD_CHECKS.includes(url)) {
    apiCtx.dispatch(logout());
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Projects', 'Tasks', 'Notes', 'Me',
    'Companies', 'Contacts', 'Deals', 'Activities',
    'Campaigns', 'Posts', 'Events', 'Notifications',
  ],
  endpoints: (b) => ({
    // ── auth ──
    register: b.mutation<AuthResponse, RegisterInput>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    login: b.mutation<AuthResponse, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    me: b.query<User, void>({ query: () => '/auth/me', providesTags: ['Me'] }),

    // ── onboarding ──
    updateOnboarding: b.mutation<User, UpdateOnboardingInput>({
      query: (body) => ({ url: '/onboarding', method: 'PATCH', body }),
      // optimistic: progress (seen intros, checklist, wizard step) should feel instant
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        const undo = dispatch(api.util.updateQueryData('me', undefined, (u) => {
          const o = u.onboarding ?? (u.onboarding = {});
          if (patch.wizard !== undefined) o.wizard = patch.wizard;
          if (patch.tourDone !== undefined) o.tourDone = patch.tourDone;
          if (patch.checklistDismissed !== undefined) o.checklistDismissed = patch.checklistDismissed;
          if (patch.profile) o.profile = { ...o.profile, ...patch.profile };
          if (patch.seen) o.seen = Array.from(new Set([...(o.seen ?? []), ...patch.seen]));
          if (patch.actions) o.actions = Array.from(new Set([...(o.actions ?? []), ...patch.actions]));
        }));
        try {
          const { data } = await queryFulfilled;
          dispatch(api.util.updateQueryData('me', undefined, () => data));
        } catch { undo.undo(); }
      },
    }),
    // ── account settings ──
    updateProfile: b.mutation<AuthResponse, UpdateProfileInput>({
      query: (body) => ({ url: '/account/profile', method: 'PATCH', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try { const { data } = await queryFulfilled; dispatch(api.util.updateQueryData('me', undefined, () => data.user)); } catch { /* shown by the caller */ }
      },
    }),
    updatePreferences: b.mutation<User, UpdatePreferencesInput>({
      query: (body) => ({ url: '/account/preferences', method: 'PATCH', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try { const { data } = await queryFulfilled; dispatch(api.util.updateQueryData('me', undefined, () => data)); } catch { /* shown by the caller */ }
      },
    }),
    changePassword: b.mutation<AuthResponse, ChangePasswordInput>({
      query: (body) => ({ url: '/account/password', method: 'POST', body }),
    }),
    deleteAccount: b.mutation<{ ok: boolean }, DeleteAccountInput>({
      query: (body) => ({ url: '/account', method: 'DELETE', body }),
    }),
    seedSample: b.mutation<User, void>({
      query: () => ({ url: '/onboarding/sample', method: 'POST' }),
      invalidatesTags: ['Me', 'Projects', 'Tasks', 'Notes', 'Companies', 'Contacts', 'Deals', 'Activities', 'Campaigns', 'Posts', 'Events', 'Notifications'],
    }),
    clearSample: b.mutation<User, void>({
      query: () => ({ url: '/onboarding/sample', method: 'DELETE' }),
      invalidatesTags: ['Me', 'Projects', 'Tasks', 'Notes', 'Companies', 'Contacts', 'Deals', 'Activities', 'Campaigns', 'Posts', 'Events', 'Notifications'],
    }),

    // ── projects ──
    getProjects: b.query<Project[], void>({ query: () => '/projects', providesTags: ['Projects'] }),
    createProject: b.mutation<Project, CreateProjectInput>({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Projects'],
    }),
    updateProject: b.mutation<Project, { id: string; body: UpdateProjectInput }>({
      query: ({ id, body }) => ({ url: `/projects/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Projects'],
    }),
    deleteProject: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Projects', 'Tasks'],
    }),

    // ── tasks ──
    addTask: b.mutation<Task, { projectId: string; body: CreateTaskInput }>({
      query: ({ projectId, body }) => ({ url: `/projects/${projectId}/tasks`, method: 'POST', body }),
      invalidatesTags: ['Projects', 'Tasks'],
    }),
    updateTask: b.mutation<Task, { projectId: string; taskId: string; body: UpdateTaskInput }>({
      query: ({ projectId, taskId, body }) => ({ url: `/projects/${projectId}/tasks/${taskId}`, method: 'PATCH', body }),
      invalidatesTags: ['Projects', 'Tasks'],
    }),
    deleteTask: b.mutation<{ ok: boolean }, { projectId: string; taskId: string }>({
      query: ({ projectId, taskId }) => ({ url: `/projects/${projectId}/tasks/${taskId}`, method: 'DELETE' }),
      invalidatesTags: ['Projects', 'Tasks'],
    }),

    // ── notes ──
    getNotes: b.query<Note[], void>({ query: () => '/notes', providesTags: ['Notes'] }),
    createNote: b.mutation<Note, CreateNoteInput>({
      query: (body) => ({ url: '/notes', method: 'POST', body }),
      invalidatesTags: ['Notes'],
    }),
    updateNote: b.mutation<Note, { id: string; body: UpdateNoteInput }>({
      query: ({ id, body }) => ({ url: `/notes/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Notes'],
    }),
    deleteNote: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/notes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Notes'],
    }),

    // ── companies (CRM) ──
    getCompanies: b.query<Company[], void>({ query: () => '/companies', providesTags: ['Companies'] }),
    createCompany: b.mutation<Company, CreateCompanyInput>({
      query: (body) => ({ url: '/companies', method: 'POST', body }),
      invalidatesTags: ['Companies'],
    }),
    updateCompany: b.mutation<Company, { id: string; body: UpdateCompanyInput }>({
      query: ({ id, body }) => ({ url: `/companies/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Companies'],
    }),
    deleteCompany: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/companies/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Companies', 'Contacts', 'Deals'],
    }),

    // ── contacts (CRM) ──
    getContacts: b.query<Contact[], void>({ query: () => '/contacts', providesTags: ['Contacts'] }),
    createContact: b.mutation<Contact, CreateContactInput>({
      query: (body) => ({ url: '/contacts', method: 'POST', body }),
      invalidatesTags: ['Contacts'],
    }),
    updateContact: b.mutation<Contact, { id: string; body: UpdateContactInput }>({
      query: ({ id, body }) => ({ url: `/contacts/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Contacts'],
    }),
    deleteContact: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/contacts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Contacts', 'Deals', 'Activities'],
    }),

    // ── deals (CRM) ──
    getDeals: b.query<Deal[], void>({ query: () => '/deals', providesTags: ['Deals'] }),
    createDeal: b.mutation<Deal, CreateDealInput>({
      query: (body) => ({ url: '/deals', method: 'POST', body }),
      invalidatesTags: ['Deals'],
    }),
    updateDeal: b.mutation<Deal, { id: string; body: UpdateDealInput }>({
      query: ({ id, body }) => ({ url: `/deals/${id}`, method: 'PATCH', body }),
      // optimistic: the card moves to its new column on click, and moves back if the save fails
      async onQueryStarted({ id, body }, { dispatch, queryFulfilled }) {
        const patch = dispatch(api.util.updateQueryData('getDeals', undefined, (deals) => {
          const d = deals.find((x) => x.id === id);
          if (d) Object.assign(d, body);
        }));
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: ['Deals'],
    }),
    deleteDeal: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/deals/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Deals', 'Activities'],
    }),

    // ── activities (CRM) ──
    getActivities: b.query<Activity[], void>({ query: () => '/activities', providesTags: ['Activities'] }),
    createActivity: b.mutation<Activity, CreateActivityInput>({
      query: (body) => ({ url: '/activities', method: 'POST', body }),
      invalidatesTags: ['Activities'],
    }),
    updateActivity: b.mutation<Activity, { id: string; body: UpdateActivityInput }>({
      query: ({ id, body }) => ({ url: `/activities/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Activities'],
    }),
    deleteActivity: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/activities/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Activities'],
    }),

    // ── campaigns (Newsletter) ──
    getCampaigns: b.query<Campaign[], void>({ query: () => '/campaigns', providesTags: ['Campaigns'] }),
    createCampaign: b.mutation<Campaign, CreateCampaignInput>({
      query: (body) => ({ url: '/campaigns', method: 'POST', body }),
      invalidatesTags: ['Campaigns'],
    }),
    updateCampaign: b.mutation<Campaign, { id: string; body: UpdateCampaignInput }>({
      query: ({ id, body }) => ({ url: `/campaigns/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Campaigns'],
    }),
    deleteCampaign: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/campaigns/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Campaigns'],
    }),

    // ── posts (Publisher) ──
    getPosts: b.query<Post[], void>({ query: () => '/posts', providesTags: ['Posts'] }),
    createPost: b.mutation<Post, CreatePostInput>({
      query: (body) => ({ url: '/posts', method: 'POST', body }),
      invalidatesTags: ['Posts'],
    }),
    updatePost: b.mutation<Post, { id: string; body: UpdatePostInput }>({
      query: ({ id, body }) => ({ url: `/posts/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Posts'],
    }),
    deletePost: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/posts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Posts'],
    }),

    // ── events ──
    getEvents: b.query<EventItem[], void>({ query: () => '/events', providesTags: ['Events'] }),
    createEvent: b.mutation<EventItem, CreateEventInput>({
      query: (body) => ({ url: '/events', method: 'POST', body }),
      invalidatesTags: ['Events'],
    }),
    updateEvent: b.mutation<EventItem, { id: string; body: UpdateEventInput }>({
      query: ({ id, body }) => ({ url: `/events/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Events'],
    }),
    deleteEvent: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/events/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Events'],
    }),

    // ── notifications ──
    getNotifications: b.query<NotificationItem[], void>({ query: () => '/notifications', providesTags: ['Notifications'] }),
    createNotification: b.mutation<NotificationItem, CreateNotificationInput>({
      query: (body) => ({ url: '/notifications', method: 'POST', body }),
      invalidatesTags: ['Notifications'],
    }),
    updateNotification: b.mutation<NotificationItem, { id: string; body: UpdateNotificationInput }>({
      query: ({ id, body }) => ({ url: `/notifications/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Notifications'],
    }),
    deleteNotification: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Notifications'],
    }),

    // ── assistant (AI) ──
    askAssistant: b.mutation<AssistantReply, AssistantAskInput>({
      query: (body) => ({ url: '/assistant/ask', method: 'POST', body }),
    }),
  }),
});

export const {
  useRegisterMutation, useLoginMutation, useMeQuery,
  useUpdateOnboardingMutation, useSeedSampleMutation, useClearSampleMutation,
  useUpdateProfileMutation, useUpdatePreferencesMutation, useChangePasswordMutation, useDeleteAccountMutation,
  useGetProjectsQuery, useCreateProjectMutation, useUpdateProjectMutation, useDeleteProjectMutation,
  useAddTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation,
  useGetNotesQuery, useCreateNoteMutation, useUpdateNoteMutation, useDeleteNoteMutation,
  useGetCompaniesQuery, useCreateCompanyMutation, useUpdateCompanyMutation, useDeleteCompanyMutation,
  useGetContactsQuery, useCreateContactMutation, useUpdateContactMutation, useDeleteContactMutation,
  useGetDealsQuery, useCreateDealMutation, useUpdateDealMutation, useDeleteDealMutation,
  useGetActivitiesQuery, useCreateActivityMutation, useUpdateActivityMutation, useDeleteActivityMutation,
  useGetCampaignsQuery, useCreateCampaignMutation, useUpdateCampaignMutation, useDeleteCampaignMutation,
  useGetPostsQuery, useCreatePostMutation, useUpdatePostMutation, useDeletePostMutation,
  useGetEventsQuery, useCreateEventMutation, useUpdateEventMutation, useDeleteEventMutation,
  useGetNotificationsQuery, useCreateNotificationMutation, useUpdateNotificationMutation, useDeleteNotificationMutation,
  useAskAssistantMutation,
} = api;
