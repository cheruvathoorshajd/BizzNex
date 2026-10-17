/** Turn an RTK Query error into one readable sentence for a toast or form. */
export function errorText(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  const e = err as { status?: unknown; data?: { message?: unknown; errors?: { fieldErrors?: Record<string, string[]> } } } | undefined;
  if (e?.status === 'FETCH_ERROR') return 'We can’t reach the BizzNex server. Check your connection and try again.';
  if (e?.status === 429) return 'Too many attempts. Wait a minute and try again.';
  const first = e?.data?.errors?.fieldErrors && Object.values(e.data.errors.fieldErrors).flat()[0];
  if (first) return first;
  const m = e?.data?.message;
  return typeof m === 'string' ? m : fallback;
}
