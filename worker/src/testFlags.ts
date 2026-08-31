/**
 * Test-only feature flags (STAGING ONLY).
 *
 * These flags intentionally force failures so operators can verify Sentry alerts
 * fire. They are refused in a production environment so a staging env set can
 * never be accidentally copied into prod and crash-loop / take offline the live
 * trade worker.
 */

const TEST_FLAG_ENABLED_TRUE = new Set(['1', 'true', 'yes'])

function isProductionEnvironment(env: NodeJS.ProcessEnv): boolean {
  const name = String(
    env.SENTRY_ENVIRONMENT
    ?? env.RAILWAY_ENVIRONMENT_NAME
    ?? env.NODE_ENV
    ?? 'production',
  ).trim().toLowerCase()
  return name === 'production' || name === 'prod'
}

/** True only when the flag is set to a truthy value AND we are not in production. */
export function testFlagEnabled(env: NodeJS.ProcessEnv, name: string): boolean {
  if (isProductionEnvironment(env)) return false
  const raw = env[name]
  if (raw === undefined || raw === '') return false
  return TEST_FLAG_ENABLED_TRUE.has(raw.trim().toLowerCase())
}

/** Numeric test-flag value, clamped to >= 0; returns the fallback when absent or invalid. */
export function testFlagNumber(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  if (isProductionEnvironment(env)) return fallback
  const parsed = Number(env[name])
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.floor(parsed))
}

/** Test-flag percentage (0-100) for failure-rate injection; clamped to 0-100. */
export function testFlagPercent(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  if (isProductionEnvironment(env)) return fallback
  const parsed = Number(env[name])
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(100, Math.floor(parsed)))
}
