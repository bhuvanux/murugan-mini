let active = 0;

export function getActiveMediaLoads(): number {
  return active;
}

export function tryAcquireMediaSlot(limit: number | null | undefined): boolean {
  if (limit == null) {
    active += 1;
    return true;
  }

  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  if (active >= safeLimit) return false;
  active += 1;
  return true;
}

export function releaseMediaSlot() {
  active = Math.max(0, active - 1);
}
