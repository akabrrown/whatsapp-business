// Injectable clock — all TTL logic (cart sessions, order tokens, retention)
// reads time from here so tests can advance time deterministically.
let override: Date | null = null;

export function now(): Date {
  return override ? new Date(override.getTime()) : new Date();
}

export function setNow(d: Date | string | null): void {
  override = d ? new Date(d) : null;
}

export function advance(ms: number): Date {
  override = new Date(now().getTime() + ms);
  return now();
}

export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

/** §8.6 — an order sitting in PACKED longer than this many hours is flagged on the dashboard. */
export const STALE_PACKED_HOURS = 24;
