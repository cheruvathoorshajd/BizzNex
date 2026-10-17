/** Marks a feature whose EXTERNAL integration is simulated in this build
 *  (e.g. real email/social delivery). The in-app data is real and persisted. */
export default function PreviewBadge({ label = 'Preview' }: { label?: string }) {
  return (
    <span className="preview-badge" title="In-app data is real and saved. The external delivery step is simulated in this build.">
      {label}
    </span>
  );
}
