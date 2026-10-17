import type { CSSProperties } from 'react';
import { cx } from '../utils';

/**
 * BizzNex "Skyline" logo, adopted 2026-10-16
 * (design-style-guides/bizznex-identity-skyline.html).
 * Three towers drawn with one 2.6-unit stroke on a 48-unit grid, standing on a baseline,
 * with one lit window (the accent). Ink follows `currentColor`; the window uses --accent.
 */
export function SkylineMark({ size, className, title }: { size?: number | string; className?: string; title?: string }) {
  return (
    <svg
      className={cx('sky-mark', className)} viewBox="0 0 48 48" width={size} height={size}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M6 42V25H16" />
        <path d="M16 42V11L28 6V42" />
        <path d="M28 18H41V42" />
        <path d="M32 24.5H37M32 29.5H37M32 34.5H37" />
        <path d="M10 30V36" />
        <path d="M3.5 42H44.5" />
      </g>
      <rect x="20.4" y="15.6" width="3.6" height="4.6" rx=".6" fill="var(--accent)" />
    </svg>
  );
}

interface Props {
  /** Run the baseline on under the name (the full lockup). */
  rule?: boolean;
  /** Add "Business, run beautifully." underneath. */
  tagline?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Symbol + "BizzNex" wordmark. Sized by the surrounding font-size. */
export default function Logo({ rule = false, tagline = false, className, style }: Props) {
  return (
    <span className={cx('logo', rule && 'ruled', className)} style={style} aria-label="BizzNex" role="img">
      <span className="logo-row" aria-hidden="true">
        <SkylineMark />
        <span className="logo-name">Bi<span className="zz">zz</span>Nex</span>
        {rule && <span className="logo-rule" />}
      </span>
      {tagline && <span className="logo-tag" aria-hidden="true">Business, run beautifully.</span>}
    </span>
  );
}
