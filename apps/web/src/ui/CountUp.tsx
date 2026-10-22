import { useEffect, useRef, useState } from 'react';
import { countTo, reducedMotion } from './motion';

/** A number that counts up to its value (and on to new values), slowing as it lands. */
export default function CountUp({ value, format = (n) => String(Math.round(n)), ms = 1000 }: {
  value: number;
  format?: (n: number) => string;
  ms?: number;
}) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  const current = useRef(shown);

  useEffect(() => countTo(current.current, value, ms, (v) => { current.current = v; setShown(v); }), [value, ms]);

  // assistive tech reads the final value once; the moving digits are visual only
  return (
    <span>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true">{format(shown)}</span>
    </span>
  );
}
