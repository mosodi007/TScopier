import test from 'node:test'
import assert from 'node:assert/strict'
import {
  initWorkerSentry,
  resetWorkerSentryForTests,
  setSentryAdapterForTests,
} from './sentry'
import {
  resetCriticalHealthForTests,
  SustainedOutageTracker,
} from './criticalHealth'

class MockScope {
  level: string | null = null
  tags: Record<string, string> = {}
  contexts: Record<string, unknown> = {}
  extras: Record<string, unknown> = {}
  fingerprint: string[] | null = null
  setLevel(level: string): void { this.level = level }
  setTag(key: string, value: string): void { this.tags[key] = value }
  setContext(key: string, value: unknown): void { this.contexts[key] = value }
  setExtra(key: string, value: unknown): void { this.extras[key] = value }
  setFingerprint(value: string[]): void { this.fingerprint = value }
}

function mockSentry() {
  const mock = {
    initCalls: [] as unknown[],
    capturedMessages: [] as unknown[],
    capturedExceptions: [] as unknown[],
    breadcrumbs: [] as unknown[],
    tags: {} as Record<string, string>,
    contexts: {} as Record<string, unknown>,
    scopes: [] as MockScope[],
    flushCalls: [] as number[],
    throwCapture: false,
    init(opts: unknown) { mock.initCalls.push(opts) },
    captureException(err: unknown) {
      mock.capturedExceptions.push(err)
      return 'event-id'
    },
    captureMessage(msg: string, level?: string) {
      if (mock.throwCapture) throw new Error('capture failed')
      mock.capturedMessages.push({ msg, level })
      return 'event-id'
    },
    addBreadcrumb(crumb: unknown) { mock.breadcrumbs.push(crumb) },
    setTag(key: string, value: string) { mock.tags[key] = value },
    setContext(key: string, value: unknown) { mock.contexts[key] = value },
    withScope(fn: (scope: MockScope) => void) {
      const scope = new MockScope()
      mock.scopes.push(scope)
      fn(scope)
    },
    async flush(timeout?: number) {
      mock.flushCalls.push(timeout ?? 0)
      return true
    },
  }
  return mock
}

type FakeTimer = {
  id: number
  dueAt: number
  callback: () => void
  cleared: boolean
  unref: () => void
}

class FakeScheduler {
  now = 0
  private nextId = 1
  private timers: FakeTimer[] = []

  setTimeout = ((callback: () => void, ms?: number) => {
    const timer: FakeTimer = {
      id: this.nextId++,
      dueAt: this.now + Math.max(0, Number(ms ?? 0)),
      callback,
      cleared: false,
      unref: () => {},
    }
    this.timers.push(timer)
    return timer as never
  }) as unknown as typeof setTimeout

  clearTimeout = ((timer: FakeTimer) => {
    timer.cleared = true
  }) as unknown as typeof clearTimeout

  advance(ms: number): void {
    this.now += Math.max(0, ms)
    for (;;) {
      const due = this.timers
        .filter(timer => !timer.cleared && timer.dueAt <= this.now)
        .sort((a, b) => a.dueAt - b.dueAt)[0]
      if (!due) return
      due.cleared = true
      due.callback()
    }
  }

  activeTimerCount(): number {
    return this.timers.filter(timer => !timer.cleared).length
  }

  createdTimerCount(): number {
    return this.timers.length
  }
}

function setup(enabled = true) {
  resetWorkerSentryForTests()
  resetCriticalHealthForTests()
  delete process.env.SENTRY_CRITICAL_HEALTH_ENABLED
  delete process.env.SENTRY_CRITICAL_HEALTH_COOLDOWN_MS
  const mock = mockSentry()
  setSentryAdapterForTests(mock as never)
  initWorkerSentry({
    SENTRY_ENABLED: enabled ? 'true' : 'false',
    SENTRY_DSN: 'https://public@example.invalid/1',
  } as NodeJS.ProcessEnv)
  return mock
}

function tracker(scheduler: FakeScheduler): SustainedOutageTracker {
  return new SustainedOutageTracker({
    component: 'fx_socket',
    failureClass: 'sustained_outage',
    provider: 'fxsocket',
    graceMs: 1_000,
    reasonCode: 'FXSOCKET_SOCKET_SUSTAINED_OUTAGE',
    message: 'critical_health.fx_socket.sustained_outage',
    fingerprint: ['critical_health', 'fx_socket', 'sustained_outage', 'fxsocket'],
    dedupeKey: 'fx_socket|fxsocket|mt5|account_hash',
    metadata: {
      endpoint_host: 'api.fxsocket.com',
      platform: 'MT5',
      account_id_hash: 'account_hash',
    },
    nowMs: () => scheduler.now,
    setTimeout: scheduler.setTimeout,
    clearTimeout: scheduler.clearTimeout,
  })
}

test('short fx socket disconnect inside grace period does not emit a critical event', () => {
  const mock = setup()
  const scheduler = new FakeScheduler()
  const health = tracker(scheduler)

  health.recordDisconnected({ reason: 'socket_close' })
  scheduler.advance(999)
  health.recordConnected({ reason: 'socket_open' })
  scheduler.advance(10)

  assert.equal(mock.capturedMessages.length, 0)
})

test('sustained fx socket disconnect beyond grace emits exactly one critical event', () => {
  const mock = setup()
  const scheduler = new FakeScheduler()
  const health = tracker(scheduler)

  health.recordDisconnected({ reason: 'socket_close' })
  scheduler.advance(1_000)
  scheduler.advance(5_000)

  assert.equal(mock.capturedMessages.length, 1)
  assert.equal((mock.capturedMessages[0] as { msg: string }).msg, 'critical_health.fx_socket.sustained_outage')
  assert.deepEqual(mock.scopes[0]!.fingerprint, ['critical_health', 'fx_socket', 'sustained_outage', 'fxsocket'])
  assert.equal(mock.scopes[0]!.tags.component, 'fx_socket')
  assert.equal(mock.scopes[0]!.tags.failure_class, 'sustained_outage')
  assert.equal(mock.scopes[0]!.tags.severity, 'critical')
})

test('fx socket reconnect attempts during one outage do not create an alert storm', () => {
  const mock = setup()
  const scheduler = new FakeScheduler()
  const health = tracker(scheduler)

  health.recordDisconnected({ reason: 'socket_close' })
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    health.recordReconnectAttempt({
      reconnectAttempt: attempt,
      reconnectDelayMs: 2_000 + attempt,
      reason: 'reconnect_scheduled',
    })
    scheduler.advance(250)
  }
  scheduler.advance(5_000)

  assert.equal(mock.capturedMessages.length, 1)
  const extra = mock.scopes[0]!.extras.safe_extra as Record<string, unknown>
  assert.equal(extra.reconnect_attempt, 4)
})

test('fx socket reconnect attempts keep a single pending outage grace timer', () => {
  const mock = setup()
  const scheduler = new FakeScheduler()
  const health = tracker(scheduler)

  health.recordDisconnected({ reason: 'socket_close' })
  assert.equal(scheduler.activeTimerCount(), 1)
  assert.equal(scheduler.createdTimerCount(), 1)

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    health.recordReconnectAttempt({
      reconnectAttempt: attempt,
      reconnectDelayMs: 2_000 + attempt,
      reason: 'reconnect_scheduled',
    })
    assert.equal(scheduler.activeTimerCount(), 1)
    assert.equal(scheduler.createdTimerCount(), 1)
  }

  scheduler.advance(999)
  assert.equal(scheduler.activeTimerCount(), 1)
  assert.equal(mock.capturedMessages.length, 0)

  scheduler.advance(1)
  assert.equal(scheduler.activeTimerCount(), 0)
  assert.equal(mock.capturedMessages.length, 1)

  health.recordConnected({ reason: 'socket_open' })
  health.recordDisconnected({ reason: 'socket_close' })
  assert.equal(scheduler.activeTimerCount(), 1)
  assert.equal(scheduler.createdTimerCount(), 2)
})

test('fx socket recovery resets outage state', () => {
  const mock = setup()
  const scheduler = new FakeScheduler()
  const health = tracker(scheduler)

  health.recordDisconnected({ reason: 'socket_close' })
  scheduler.advance(1_000)
  health.recordConnected({ reason: 'socket_open' })
  scheduler.advance(10_000)

  assert.equal(mock.capturedMessages.length, 1)
  assert.equal(mock.breadcrumbs.length, 1)
})

test('a later sustained fx socket outage can alert again after recovery', () => {
  const mock = setup()
  process.env.SENTRY_CRITICAL_HEALTH_COOLDOWN_MS = '0'
  const scheduler = new FakeScheduler()
  const health = tracker(scheduler)

  health.recordDisconnected({ reason: 'socket_close' })
  scheduler.advance(1_000)
  health.recordConnected({ reason: 'socket_open' })
  health.recordDisconnected({ reason: 'socket_close' })
  scheduler.advance(1_000)

  assert.equal(mock.capturedMessages.length, 2)
})

test('sentry disabled leaves fx socket health tracking fire-and-forget', () => {
  const mock = setup(false)
  const scheduler = new FakeScheduler()
  const health = tracker(scheduler)

  assert.doesNotThrow(() => {
    health.recordDisconnected({ reason: 'socket_close' })
    scheduler.advance(1_000)
    health.recordReconnectAttempt({ reconnectAttempt: 1 })
    health.recordConnected({ reason: 'socket_open' })
  })
  assert.equal(mock.capturedMessages.length, 0)
})

test('sentry capture failure does not break fx socket recovery logic', () => {
  const mock = setup()
  mock.throwCapture = true
  const scheduler = new FakeScheduler()
  const health = tracker(scheduler)

  assert.doesNotThrow(() => {
    health.recordDisconnected({ reason: 'socket_close' })
    scheduler.advance(1_000)
    health.recordReconnectAttempt({ reconnectAttempt: 1 })
    health.recordConnected({ reason: 'socket_open' })
  })
  assert.equal(mock.capturedMessages.length, 0)
})
