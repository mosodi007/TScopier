import { createHash } from 'node:crypto'
import { workerConfig } from '../workerConfig'
import { addWorkerBreadcrumb, captureWorkerMessage } from './sentry'
import { safeForSentry } from './sentryRedaction'

export type CriticalHealthComponent =
  | 'fx_socket'
  | 'copier_worker'
  | 'trade_pipeline'
  | 'broker_rpc'
  | 'scheduler'
  | 'queue_consumer'
  | 'telegram_dependency'
  | 'backend'

export type CriticalHealthFailureClass =
  | 'sustained_outage'
  | 'heartbeat_missing'
  | 'stalled'
  | 'missed_schedule'
  | 'retry_exhausted'
  | 'systemic_failure'

export type CriticalHealthSeverity = 'critical' | 'error' | 'warning'
export type CriticalHealthState = 'unavailable' | 'failed' | 'stalled' | 'degraded' | 'recovered'

export interface CriticalHealthIssueInput {
  component: CriticalHealthComponent
  failureClass: CriticalHealthFailureClass
  severity?: CriticalHealthSeverity
  state: CriticalHealthState
  provider?: string
  subsystem?: string
  message?: string
  reasonCode?: string
  fingerprint?: string[]
  dedupeKey?: string
  metadata?: Record<string, unknown>
}

interface SustainedOutageTrackerOptions {
  component: CriticalHealthComponent
  failureClass?: Extract<CriticalHealthFailureClass, 'sustained_outage'>
  provider?: string
  graceMs: number
  reasonCode?: string
  message?: string
  fingerprint?: string[]
  dedupeKey: string
  metadata?: Record<string, unknown>
  nowMs?: () => number
  setTimeout?: typeof setTimeout
  clearTimeout?: typeof clearTimeout
}

export interface OutageTransitionMetadata {
  reconnectAttempt?: number
  reconnectDelayMs?: number
  lastSuccessfulActivityAt?: number | Date | string | null
  reason?: string
  metadata?: Record<string, unknown>
}

const DEFAULT_CRITICAL_HEALTH_COOLDOWN_MS = 300_000
const DEFAULT_FXSOCKET_OUTAGE_GRACE_MS = 60_000
const MIN_FXSOCKET_OUTAGE_GRACE_MS = 5_000
const MAX_FXSOCKET_OUTAGE_GRACE_MS = 10 * 60_000
const MAX_SUPPRESSION_KEYS = 500

const suppressedUntil = new Map<string, number>()

function envBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw === '') return defaultValue
  const value = raw.trim().toLowerCase()
  if (value === '0' || value === 'false' || value === 'no') return false
  if (value === '1' || value === 'true' || value === 'yes') return true
  return defaultValue
}

function envDurationMs(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function safeName(value: unknown, fallback: string): string {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]/g, '_')
    .slice(0, 80)
  return normalized || fallback
}

function environmentFromProcess(): string {
  return String(
    process.env.SENTRY_ENVIRONMENT
    ?? process.env.RAILWAY_ENVIRONMENT_NAME
    ?? process.env.NODE_ENV
    ?? 'production',
  ).trim().toLowerCase()
}

function currentCriticalHealthCooldownMs(): number {
  return envDurationMs(
    process.env.SENTRY_CRITICAL_HEALTH_COOLDOWN_MS,
    DEFAULT_CRITICAL_HEALTH_COOLDOWN_MS,
    0,
    24 * 60 * 60 * 1000,
  )
}

function pruneSuppressionKeys(): void {
  if (suppressedUntil.size <= MAX_SUPPRESSION_KEYS) return
  const keys = [...suppressedUntil.keys()].slice(0, suppressedUntil.size - MAX_SUPPRESSION_KEYS)
  for (const key of keys) suppressedUntil.delete(key)
}

function shouldCapture(key: string, now: number): boolean {
  const until = suppressedUntil.get(key) ?? 0
  if (until > now) return false
  const cooldownMs = currentCriticalHealthCooldownMs()
  if (cooldownMs > 0) {
    suppressedUntil.set(key, now + cooldownMs)
    pruneSuppressionKeys()
  }
  return true
}

function normalizeTimestamp(value: number | Date | string | null | undefined): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString()
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString()
  const raw = String(value).trim()
  return raw ? raw.slice(0, 80) : undefined
}

export function criticalHealthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envBool(env.SENTRY_CRITICAL_HEALTH_ENABLED, true)
}

export function fxsocketSocketOutageGraceMs(env: NodeJS.ProcessEnv = process.env): number {
  return envDurationMs(
    env.FXSOCKET_SOCKET_OUTAGE_GRACE_MS,
    DEFAULT_FXSOCKET_OUTAGE_GRACE_MS,
    MIN_FXSOCKET_OUTAGE_GRACE_MS,
    MAX_FXSOCKET_OUTAGE_GRACE_MS,
  )
}

export function hashHealthResourceId(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

export function captureCriticalHealthIssue(input: CriticalHealthIssueInput): void {
  if (!criticalHealthEnabled()) return
  try {
    const component = safeName(input.component, 'unknown')
    const failureClass = safeName(input.failureClass, 'systemic_failure')
    const provider = safeName(input.provider ?? 'system', 'system')
    const state = safeName(input.state, 'failed')
    const severity = safeName(input.severity ?? 'critical', 'critical')
    const operation = `${component}_${failureClass}`
    const reasonCode = safeName(input.reasonCode ?? `CRITICAL_${component}_${failureClass}`, 'CRITICAL_HEALTH').toUpperCase()
    const dedupeKey = input.dedupeKey ?? `${component}|${failureClass}|${provider}|${state}`
    const now = Date.now()
    if (!shouldCapture(dedupeKey, now)) return

    const metadata = safeForSentry({
      component,
      failure_class: failureClass,
      environment: environmentFromProcess(),
      severity,
      state,
      provider,
      worker_instance_id: workerConfig.instanceId,
      worker_role: workerConfig.role,
      ...(input.metadata ?? {}),
    }) as Record<string, unknown>

    captureWorkerMessage(input.message ?? `critical_health.${component}.${failureClass}`, {
      subsystem: input.subsystem ?? 'critical_health',
      operation,
      level: 'error',
      errorCode: reasonCode,
      fingerprint: input.fingerprint ?? ['critical_health', component, failureClass, provider],
      context: {
        stage: 'critical_health',
        operation,
        extra: metadata,
      },
      tags: {
        event_category: 'critical_health',
        component,
        failure_class: failureClass,
        severity,
        state,
        provider,
      },
      extra: metadata,
    })
  } catch {
    // Critical-health reporting must never become a runtime dependency.
  }
}

export class SustainedOutageTracker {
  private readonly nowMs: () => number
  private readonly setTimer: typeof setTimeout
  private readonly clearTimer: typeof clearTimeout
  private outageStartedAt: number | null = null
  private lastSuccessfulActivityAt: number | null = null
  private lastReconnectAttempt = 0
  private lastReconnectDelayMs: number | undefined
  private lastReason: string | undefined
  private metadata: Record<string, unknown>
  private alertEmitted = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly opts: SustainedOutageTrackerOptions) {
    this.nowMs = opts.nowMs ?? (() => Date.now())
    this.setTimer = opts.setTimeout ?? setTimeout
    this.clearTimer = opts.clearTimeout ?? clearTimeout
    this.metadata = { ...(opts.metadata ?? {}) }
  }

  recordActivity(meta: OutageTransitionMetadata = {}): void {
    const timestamp = meta.lastSuccessfulActivityAt
      ? new Date(normalizeTimestamp(meta.lastSuccessfulActivityAt) ?? this.nowMs()).getTime()
      : this.nowMs()
    if (Number.isFinite(timestamp)) this.lastSuccessfulActivityAt = timestamp
    if (meta.metadata) this.metadata = { ...this.metadata, ...meta.metadata }
  }

  recordDisconnected(meta: OutageTransitionMetadata = {}): void {
    try {
      const now = this.nowMs()
      if (this.outageStartedAt == null) this.outageStartedAt = now
      this.applyMetadata(meta)
      this.scheduleAlert()
    } catch {
      // State tracking is best-effort only.
    }
  }

  recordReconnectAttempt(meta: OutageTransitionMetadata = {}): void {
    try {
      this.applyMetadata(meta)
      if (this.outageStartedAt != null) this.scheduleAlert()
    } catch {
      // State tracking is best-effort only.
    }
  }

  recordConnected(meta: OutageTransitionMetadata = {}): void {
    try {
      this.recordActivity(meta)
      if (this.outageStartedAt != null && this.alertEmitted) {
        addWorkerBreadcrumb({
          category: 'worker',
          level: 'info',
          message: 'critical health recovered',
          data: {
            component: this.opts.component,
            failure_class: this.opts.failureClass ?? 'sustained_outage',
            provider: this.opts.provider,
            state: 'recovered',
            duration_ms: Math.max(0, this.nowMs() - this.outageStartedAt),
          },
        })
      }
      this.reset()
    } catch {
      this.reset()
    }
  }

  reset(): void {
    if (this.timer) {
      this.clearTimer(this.timer)
      this.timer = null
    }
    this.outageStartedAt = null
    this.lastReconnectAttempt = 0
    this.lastReconnectDelayMs = undefined
    this.lastReason = undefined
    this.alertEmitted = false
  }

  checkNow(): boolean {
    try {
      if (this.outageStartedAt == null || this.alertEmitted) return false
      const now = this.nowMs()
      const durationMs = Math.max(0, now - this.outageStartedAt)
      if (durationMs < this.opts.graceMs) {
        this.scheduleAlert()
        return false
      }
      this.alertEmitted = true
      captureCriticalHealthIssue({
        component: this.opts.component,
        failureClass: this.opts.failureClass ?? 'sustained_outage',
        provider: this.opts.provider,
        state: 'unavailable',
        severity: 'critical',
        reasonCode: this.opts.reasonCode,
        message: this.opts.message,
        fingerprint: this.opts.fingerprint,
        dedupeKey: this.opts.dedupeKey,
        metadata: {
          ...this.metadata,
          disconnected_at: normalizeTimestamp(this.outageStartedAt),
          duration_ms: durationMs,
          grace_ms: this.opts.graceMs,
          reconnect_attempt: this.lastReconnectAttempt,
          reconnect_delay_ms: this.lastReconnectDelayMs,
          last_successful_activity_at: normalizeTimestamp(this.lastSuccessfulActivityAt),
          reason: this.lastReason,
        },
      })
      return true
    } catch {
      return false
    }
  }

  private applyMetadata(meta: OutageTransitionMetadata): void {
    if (typeof meta.reconnectAttempt === 'number' && Number.isFinite(meta.reconnectAttempt)) {
      this.lastReconnectAttempt = Math.max(this.lastReconnectAttempt, Math.floor(meta.reconnectAttempt))
    }
    if (typeof meta.reconnectDelayMs === 'number' && Number.isFinite(meta.reconnectDelayMs)) {
      this.lastReconnectDelayMs = Math.max(0, Math.floor(meta.reconnectDelayMs))
    }
    const lastActivityAt = normalizeTimestamp(meta.lastSuccessfulActivityAt)
    if (lastActivityAt) {
      const parsed = new Date(lastActivityAt).getTime()
      if (Number.isFinite(parsed)) this.lastSuccessfulActivityAt = parsed
    }
    if (meta.reason) this.lastReason = safeName(meta.reason, 'unknown')
    if (meta.metadata) this.metadata = { ...this.metadata, ...meta.metadata }
  }

  private scheduleAlert(): void {
    if (this.outageStartedAt == null || this.alertEmitted) return
    if (this.timer) return
    const now = this.nowMs()
    const dueInMs = Math.max(0, this.opts.graceMs - Math.max(0, now - this.outageStartedAt))
    this.timer = this.setTimer(() => {
      this.timer = null
      this.checkNow()
    }, dueInMs)
    this.timer.unref?.()
  }
}

export function resetCriticalHealthForTests(): void {
  suppressedUntil.clear()
}
