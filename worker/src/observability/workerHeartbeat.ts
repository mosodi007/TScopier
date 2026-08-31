import { workerConfig } from '../workerConfig'
import { captureWorkerCheckIn } from './sentry'
import { testFlagEnabled } from '../testFlags'

const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000
const DEFAULT_CHECKIN_MARGIN_MINUTES = 2
const MIN_HEARTBEAT_INTERVAL_MS = 60_000
const MAX_HEARTBEAT_INTERVAL_MS = 60 * 60_000

type MonitorConfig = NonNullable<Parameters<typeof captureWorkerCheckIn>[1]>

let heartbeatTimer: NodeJS.Timeout | null = null

function envBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw === '') return defaultValue
  const value = raw.trim().toLowerCase()
  if (value === '0' || value === 'false' || value === 'no') return false
  if (value === '1' || value === 'true' || value === 'yes') return true
  return defaultValue
}

function envNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function safeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_.:-]/g, '-').replace(/-+/g, '-').slice(0, 120)
}

export function workerHeartbeatMonitorSlug(env: NodeJS.ProcessEnv = process.env): string | null {
  if (!envBool(env.SENTRY_WORKER_HEARTBEAT_ENABLED, true)) return null
  const slug = safeSlug(String(env.SENTRY_WORKER_HEARTBEAT_MONITOR_SLUG ?? ''))
  return slug || null
}

export function workerHeartbeatIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  return envNumber(
    env.SENTRY_WORKER_HEARTBEAT_INTERVAL_MS,
    DEFAULT_HEARTBEAT_INTERVAL_MS,
    MIN_HEARTBEAT_INTERVAL_MS,
    MAX_HEARTBEAT_INTERVAL_MS,
  )
}

export function workerHeartbeatCheckinMarginMinutes(env: NodeJS.ProcessEnv = process.env): number {
  return envNumber(
    env.SENTRY_WORKER_HEARTBEAT_CHECKIN_MARGIN_MINUTES,
    DEFAULT_CHECKIN_MARGIN_MINUTES,
    1,
    60,
  )
}

export function workerHeartbeatMonitorConfig(env: NodeJS.ProcessEnv = process.env): MonitorConfig {
  const intervalMinutes = Math.max(1, Math.ceil(workerHeartbeatIntervalMs(env) / 60_000))
  const marginMinutes = workerHeartbeatCheckinMarginMinutes(env)
  return {
    schedule: { type: 'interval', value: intervalMinutes, unit: 'minute' },
    checkinMargin: marginMinutes,
    maxRuntime: marginMinutes,
    failureIssueThreshold: 1,
    recoveryThreshold: 1,
    timezone: 'UTC',
  }
}

function workerHeartbeatTestForceStop(env: NodeJS.ProcessEnv = process.env): boolean {
  return testFlagEnabled(env, 'WORKER_HEARTBEAT_TEST_FORCE_STOP')
}

export function captureWorkerHeartbeatCheckIn(env: NodeJS.ProcessEnv = process.env): string | null {
  if (workerHeartbeatTestForceStop(env)) return null
  const monitorSlug = workerHeartbeatMonitorSlug(env)
  if (!monitorSlug) return null
  return captureWorkerCheckIn({
    monitorSlug,
    status: 'ok',
  }, workerHeartbeatMonitorConfig(env))
}

export function startWorkerHeartbeatCheckIns(env: NodeJS.ProcessEnv = process.env): boolean {
  stopWorkerHeartbeatCheckIns()
  const monitorSlug = workerHeartbeatMonitorSlug(env)
  if (!monitorSlug) return false
  captureWorkerHeartbeatCheckIn(env)
  heartbeatTimer = setInterval(() => {
    captureWorkerHeartbeatCheckIn(env)
  }, workerHeartbeatIntervalMs(env))
  heartbeatTimer.unref?.()
  console.log(`[sentry] worker heartbeat monitor enabled slug=${monitorSlug} role=${workerConfig.role}`)
  return true
}

export function stopWorkerHeartbeatCheckIns(): void {
  if (!heartbeatTimer) return
  clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

export function resetWorkerHeartbeatForTests(): void {
  stopWorkerHeartbeatCheckIns()
}
