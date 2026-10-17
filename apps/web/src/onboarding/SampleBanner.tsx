import { useState } from 'react';
import { useClearSampleMutation } from '../services/api';
import { useToast } from '../ui/Toast';
import { useOnboarding } from './useOnboarding';

/** Thin strip reminding the user that sample records are mixed into their workspace. */
export default function SampleBanner() {
  const toast = useToast();
  const { state } = useOnboarding();
  const [clear, { isLoading }] = useClearSampleMutation();
  const [hidden, setHidden] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!state.sample || hidden) return null;

  const remove = async () => {
    try { await clear().unwrap(); toast('Sample data removed'); }
    catch { toast('Couldn’t remove sample data'); }
  };

  return (
    <div className="sample-bar" role="status">
      <span className="stat-dot progress">Sample data</span>
      <span className="sample-t">
        {confirm
          ? 'Remove all sample records? Records you created yourself are kept.'
          : 'Your workspace includes example records. Edit them, add your own, or remove them whenever you like.'}
      </span>
      <span className="row gap-2">
        {confirm ? (
          <>
            <button className="btn quiet sm" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn danger sm" onClick={remove} disabled={isLoading}>{isLoading ? 'Removing…' : 'Remove sample data'}</button>
          </>
        ) : (
          <>
            <button className="btn ghost sm" onClick={() => setConfirm(true)}>Remove sample data</button>
            <button className="x-btn" onClick={() => setHidden(true)} aria-label="Hide for now">×</button>
          </>
        )}
      </span>
    </div>
  );
}
