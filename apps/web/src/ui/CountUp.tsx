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

  // the final value stays available to assistive tech while the digits move
  return <span aria-label={format(value)}>{format(shown)}</span>;
}
