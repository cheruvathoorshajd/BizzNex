import { errorText } from '../services/errors';

/** Shown instead of an empty state when a list failed to load, so "nothing here" never hides an outage. */
export default function LoadError({ what, error, onRetry }: { what: string; error?: unknown; onRetry: () => void }) {
  return (
    <div className="load-error" role="alert">
      <span>Couldn’t load {what}. {errorText(error, 'Try again in a moment.')}</span>
      <button className="btn ghost sm" onClick={onRetry}>Retry</button>
    </div>
  );
}
