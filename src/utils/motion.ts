import { AccessibilityInfo } from 'react-native';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((v) => {
    reduceMotion = v;
  })
  .catch(() => {});

/** Stagger delay (ms) for list entrance animations; 0 when reduce-motion is on. */
export const staggerDelay = (index: number, step = 30, maxItems = 8): number =>
  reduceMotion ? 0 : Math.min(Math.max(index, 0), maxItems) * step;

/** Whether entrance animations should be skipped entirely. */
export const shouldReduceMotion = (): boolean => reduceMotion;
