let unlocked = false;
let waiters: (() => void)[] = [];

export function markUnlocked(): void {
  if (unlocked) return;
  unlocked = true;
  const pending = waiters;
  waiters = [];
  pending.forEach((resolve) => resolve());
}

export function waitForUnlock(): Promise<void> {
  if (unlocked) return Promise.resolve();
  return new Promise<void>((resolve) => waiters.push(resolve));
}
