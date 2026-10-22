import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** What failed, for the message ("this page", "Notes"). */
  what?: string;
  /** Compact fallback for small spaces (tool windows). */
  compact?: boolean;
}
interface State { error: Error | null; }

/** A new deploy replaced the lazily loaded file this tab still points at: only a reload fixes it. */
const isChunkError = (e: Error) =>
  e.name === 'ChunkLoadError' || /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(e.message);

/** Contains a render crash to the part of the screen it happened in, so one broken view
 *  doesn't blank the whole app. Key it by view so moving on starts fresh. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkError(error);
    const what = this.props.what ?? 'this part of BizzNex';
    return (
      <div className={this.props.compact ? 'crash compact' : 'crash'} role="alert">
        <h2 className="crash-t">{chunk ? 'A newer version is available' : 'Something went wrong'}</h2>
        <p className="crash-d">
          {chunk
            ? 'BizzNex was updated since this tab opened. Reload to get the latest version.'
            : `${what[0].toUpperCase()}${what.slice(1)} hit an unexpected error. Your saved data is safe.`}
        </p>
        <div className="row gap-2">
          <button type="button" className="btn primary sm" onClick={() => window.location.reload()}>Reload</button>
          {!chunk && <button type="button" className="btn ghost sm" onClick={this.reset}>Try again</button>}
        </div>
      </div>
    );
  }
}
