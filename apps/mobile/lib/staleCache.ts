/** Lightweight TTL helpers for focus-triggered loads (no React Query). */

export const STALE_TTL = {
  trades: 30_000,
  charts: 45_000,
  signals: 30_000,
  extras: 30_000,
} as const

export function isFresh(lastFetchedAt: number | null | undefined, ttlMs: number): boolean {
  if (lastFetchedAt == null) return false
  return Date.now() - lastFetchedAt < ttlMs
}

/**
 * Returns true when a focus-triggered load should run.
 * Pull-to-refresh / realtime should pass `force: true`.
 */
export function shouldLoadOnFocus(opts: {
  force?: boolean
  lastFetchedAt: number | null | undefined
  ttlMs: number
  /** Skip when we already have a successful load within TTL. */
  hasData?: boolean
}): boolean {
  if (opts.force) return true
  if (opts.hasData === false) return true
  return !isFresh(opts.lastFetchedAt, opts.ttlMs)
}
