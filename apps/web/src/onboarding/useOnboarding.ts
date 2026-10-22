import { useCallback, useMemo } from 'react';
import type { Industry, OnboardingState, UpdateOnboardingInput } from '@bizznex/shared';
import { useAppDispatch, useAppSelector } from '../store';
import { updateDemoOnboarding } from '../store/authSlice';
import {
  useMeQuery, useUpdateOnboardingMutation,
  useGetProjectsQuery, useGetContactsQuery, useGetCompaniesQuery, useGetDealsQuery,
  useGetActivitiesQuery, useGetNotesQuery, useGetPostsQuery, useGetCampaignsQuery, useGetEventsQuery,
} from '../services/api';
import { CHECKLIST, INDUSTRY_GOALS } from './content';
import type { ChecklistItem, ChecklistKey } from './content';

/**
 * The signed-in user's onboarding state, plus helpers that persist it.
 *
 * Who gets onboarding:
 *   signup → guided; progress saved on the account (follows them across devices)
 *   demo   → guided; progress kept in this browser, because every demo visitor shares one account
 *   signin → not guided; only the Help (?) menu
 */
export function useOnboarding() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const fallback = useAppSelector((s) => s.auth.user);
  const session = useAppSelector((s) => s.auth.session);
  const demoState = useAppSelector((s) => s.auth.demoOnboarding);
  const { data: me } = useMeQuery(undefined, { skip: !token });
  const [patch] = useUpdateOnboardingMutation();

  const kind = session?.kind ?? 'signin';
  const demo = kind === 'demo';
  const guided = kind === 'signup' || demo;
  const user = me ?? fallback;
  const state: OnboardingState = demo ? demoState : user?.onboarding ?? {};

  /** Rejects when the save fails, for callers that await it; fire-and-forget callers can ignore it safely. */
  const update = useCallback((p: UpdateOnboardingInput): Promise<void> => {
    if (demo) { dispatch(updateDemoOnboarding(p)); return Promise.resolve(); }
    const saved = patch(p).unwrap().then(() => undefined);
    saved.catch(() => undefined); // no unhandled rejection for callers that don't await
    return saved;
  }, [demo, dispatch, patch]);

  const markSeen = useCallback((view: string) => {
    if (!state.seen?.includes(view)) update({ seen: [view] });
  }, [update, state.seen]);

  /** Record an action that leaves no record of its own (e.g. asking the assistant). */
  const track = useCallback((action: string) => {
    if (guided && !state.actions?.includes(action)) update({ actions: [action] });
  }, [guided, update, state.actions]);

  return {
    user, state, kind, demo, guided,
    /** Demo checklist only counts records made during this visit (the demo account is already full). */
    since: demo ? session?.startedAt : undefined,
    loaded: !!me, update, markSeen, track,
  };
}

/** Checklist progress, computed from the user's real records (sample/pre-existing demo data doesn't count). */
export function useChecklist() {
  const { state, since } = useOnboarding();
  const sample = state.sample;
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: contacts = [] } = useGetContactsQuery();
  const { data: companies = [] } = useGetCompaniesQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const { data: activities = [] } = useGetActivitiesQuery();
  const { data: notes = [] } = useGetNotesQuery();
  const { data: posts = [] } = useGetPostsQuery();
  const { data: campaigns = [] } = useGetCampaignsQuery();
  const { data: events = [] } = useGetEventsQuery();

  return useMemo(() => {
    type Row = { id: string; createdAt: string };
    const own = (rows: Row[], ids?: string[]) =>
      since ? rows.some((r) => r.createdAt > since) : rows.some((r) => !ids?.includes(r.id));
    const tasks = projects.flatMap((p) => p.tasks);
    const acts = state.actions ?? [];

    const done: Record<ChecklistKey, boolean> = {
      tour: !!state.tourDone,
      project: own(projects, sample?.projects),
      // older sample sets didn't list task ids, so fall back to "any task outside a sample project"
      task: !since && sample && !sample.tasks
        ? tasks.some((t) => !sample.projects.includes(t.projectId))
        : own(tasks, sample?.tasks),
      contact: own(contacts, sample?.contacts),
      company: own(companies, sample?.companies),
      deal: own(deals, sample?.deals),
      activity: own(activities, sample?.activities),
      note: own(notes, sample?.notes),
      publish: own(posts, sample?.posts) || own(campaigns, sample?.campaigns),
      event: own(events, sample?.events),
      assistant: acts.includes('assistant'),
      window: acts.includes('window'),
    };

    // Recommended first: items matching the goals picked in setup, then what the industry usually needs.
    const goals = state.profile?.goals ?? [];
    const suggested = INDUSTRY_GOALS[state.profile?.industry as Industry] ?? [];
    const rank = (i: ChecklistItem) => (i.key === 'tour' ? -1
      : i.goals.some((g) => goals.includes(g)) ? 0
        : i.goals.some((g) => suggested.includes(g)) ? 1 : 2);
    const items = [...CHECKLIST]
      .sort((a, b) => rank(a) - rank(b))
      .map((i) => ({ ...i, done: done[i.key], recommended: rank(i) >= 0 && rank(i) <= 1 }));

    const count = items.filter((i) => i.done).length;
    return { items, count, total: items.length, complete: count === items.length };
  }, [projects, contacts, companies, deals, activities, notes, posts, campaigns, events, state, sample, since]);
}
