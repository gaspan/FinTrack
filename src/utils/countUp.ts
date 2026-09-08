import { useEffect, useRef, useState } from 'react';
import { shouldReduceMotion } from './motion';

/** Animates a number toward `target` with ease-out cubic; jumps instantly when reduce-motion is on. */
export const useCountUp = (target: number, duration = 800): number => {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target || shouldReduceMotion()) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (target - from) * eased;
      fromRef.current = current;
      setValue(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
};
