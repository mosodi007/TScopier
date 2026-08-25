import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import test from 'node:test'
import {
  resetCriticalHealthForTests,
  SustainedOutageTracker,
} from './observability/criticalHealth'
import {
  initWorkerSentry,
  resetWorkerSentryForTests,
  setSentryAdapterForTests,
} from './observability/sentry'

class FakeWebSocket extends EventEmitter {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: FakeWebSocket[] = []

  readonly url: string
  readyState = FakeWebSocket.CONNECTING
  sent: string[] = []
  closeCalls = 0

  constructor(url: string) {
    super()
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(String(data))
  }

  close(): void {
    this.closeCalls += 1
    this.readyState = FakeWebSocket.CLOSING
  }

  emitOpen(): void {
    this.readyState = FakeWebSocket.OPEN
    this.emit('open')
  }

  emitMessage(payload: string): void {
    this.emit('message', payload)
  }

  emitClose(): void {
    this.readyState = FakeWebSocket.CLOSED
    this.emit('close')
  }

  emitError(message = 'socket failed'): void {
    this.emit('error', new Error(message))
  }
}

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
    capturedMessages: [] as unknown[],
    scopes: [] as MockScope[],
    init() {},
    captureException() { return 'event-id' },
    captureMessage(msg: string, level?: string) {
      mock.capturedMessages.push({ msg, level })
      return 'event-id'
    },
    captureCheckIn() { return 'check-in-id' },
    addBreadcrumb() {},
    setTag() {},
    setContext() {},
    withScope(fn: (scope: MockScope) => void) {
      const scope = new MockScope()
      mock.scopes.push(scope)
      fn(scope)
    },
    async flush() { return true },
    logger: {
      info() {},
      warn() {},
      error() {},
    },
  }
  return mock
}

type FakeTimer = {
  dueAt: number
  callback: () => void
  cleared: boolean
  unref: () => void
}

class FakeScheduler {
  now = 0
  private timers: FakeTimer[] = []

  setTimeout = ((callback: () => void, ms?: number) => {
    const timer: FakeTimer = {
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
}

type ClientModule = typeof import('./fxsocketWsClient')

const nodeRequire = createRequire(__filename)
const wsModulePath = nodeRequire.resolve('ws')
const clientModulePath = nodeRequire.resolve('./fxsocketWsClient')
const originalWsModule = nodeRequire.cache[wsModulePath]

function loadClientModule(): ClientModule {
  delete nodeRequire.cache[clientModulePath]
  nodeRequire.cache[wsModulePath] = {
    id: wsModulePath,
    filename: wsModulePath,
    loaded: true,
    exports: FakeWebSocket,
    children: [],
    paths: [],
    isPreloading: false,
    require: nodeRequire,
    parent: null,
  } as unknown as NodeModule
  return nodeRequire('./fxsocketWsClient') as ClientModule
}

function restoreModules(): void {
  delete nodeRequire.cache[clientModulePath]
  if (originalWsModule) nodeRequire.cache[wsModulePath] = originalWsModule
  else delete nodeRequire.cache[wsModulePath]
}

function setupSentry(enabled = true) {
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

function providerTracker(scheduler: FakeScheduler): SustainedOutageTracker {
  return new SustainedOutageTracker({
    component: 'fx_socket',
    failureClass: 'sustained_outage',
    provider: 'fxsocket',
    graceMs: 1_000,
    reasonCode: 'FXSOCKET_SOCKET_SUSTAINED_OUTAGE',
    message: 'critical_health.fx_socket.sustained_outage',
    fingerprint: ['critical_health', 'fx_socket', 'sustained_outage', 'fxsocket'],
    dedupeKey: 'fx_socket|fxsocket|mt5|api.fxsocket.com',
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

function privateState(client: unknown): { reconnectTimer: NodeJS.Timeout | null } {
  return client as { reconnectTimer: NodeJS.Timeout | null }
}

test.afterEach(() => {
  restoreModules()
  FakeWebSocket.instances = []
  resetCriticalHealthForTests()
  resetWorkerSentryForTests()
  delete process.env.SENTRY_CRITICAL_HEALTH_COOLDOWN_MS
})

test('current fx socket sustained outage emits one critical alert through client handlers', () => {
  const mock = setupSentry()
  const scheduler = new FakeScheduler()
  const { FxsocketWsClient } = loadClientModule()
  const client = new FxsocketWsClient({
    accountId: 'acct-a',
    apiKey: 'key',
    reconnectDelayMs: 60_000,
    healthMonitor: providerTracker(scheduler),
  })
  client.onMessage(() => {})
  client.connect()
  const socket = FakeWebSocket.instances[0]!

  socket.emitOpen()
  socket.emitClose()
  scheduler.advance(1_000)

  assert.equal(mock.capturedMessages.length, 1)
  assert.deepEqual(mock.scopes[0]!.fingerprint, ['critical_health', 'fx_socket', 'sustained_outage', 'fxsocket'])
  client.close()
})

test('current fx socket recovery clears outage timer and allows later outage after reset', () => {
  const mock = setupSentry()
  process.env.SENTRY_CRITICAL_HEALTH_COOLDOWN_MS = '0'
  const scheduler = new FakeScheduler()
  const { FxsocketWsClient } = loadClientModule()
  const client = new FxsocketWsClient({
    accountId: 'acct-a',
    apiKey: 'key',
    reconnectDelayMs: 60_000,
    healthMonitor: providerTracker(scheduler),
  })
  client.onMessage(() => {})
  client.connect()
  const first = FakeWebSocket.instances[0]!
  first.emitOpen()
  first.emitClose()

  client.connect()
  const second = FakeWebSocket.instances[1]!
  second.emitOpen()
  scheduler.advance(5_000)
  assert.equal(mock.capturedMessages.length, 0)
  assert.equal(client.connected, true)

  second.emitClose()
  scheduler.advance(1_000)
  assert.equal(mock.capturedMessages.length, 1)
  client.close()
})

test('stale old socket close after replacement open does not create outage or reconnect', () => {
  const mock = setupSentry()
  const scheduler = new FakeScheduler()
  const changes: boolean[] = []
  const { FxsocketWsClient } = loadClientModule()
  const client = new FxsocketWsClient({
    accountId: 'acct-a',
    apiKey: 'key',
    reconnectDelayMs: 60_000,
    onConnectionChange: connected => changes.push(connected),
    healthMonitor: providerTracker(scheduler),
  })
  client.onMessage(() => {})
  client.connect()
  const oldSocket = FakeWebSocket.instances[0]!
  client.close()
  client.connect()
  const currentSocket = FakeWebSocket.instances[1]!
  currentSocket.emitOpen()

  oldSocket.emitClose()
  scheduler.advance(5_000)

  assert.deepEqual(changes, [true])
  assert.equal(privateState(client).reconnectTimer, null)
  assert.equal(mock.capturedMessages.length, 0)
  assert.equal(client.connected, true)
  client.close()
})

test('stale old socket open message and error events are ignored', () => {
  setupSentry()
  const scheduler = new FakeScheduler()
  const changes: boolean[] = []
  let messageCount = 0
  const warns: string[] = []
  const originalWarn = console.warn
  console.warn = (msg?: unknown) => { warns.push(String(msg)) }
  try {
    const { FxsocketWsClient } = loadClientModule()
    const client = new FxsocketWsClient({
      accountId: 'acct-a',
      apiKey: 'key',
      onConnectionChange: connected => changes.push(connected),
      healthMonitor: providerTracker(scheduler),
    })
    client.onMessage(() => { messageCount += 1 })
    client.connect()
    const oldSocket = FakeWebSocket.instances[0]!
    client.close()
    client.connect()
    const currentSocket = FakeWebSocket.instances[1]!
    currentSocket.emitOpen()

    oldSocket.emitOpen()
    oldSocket.emitMessage(JSON.stringify({ type: 'tick', symbol: 'EURUSD', data: { bid: 1.1 } }))
    oldSocket.emitError()

    assert.deepEqual(changes, [true])
    assert.equal(messageCount, 0)
    assert.equal(warns.length, 0)
    assert.equal(client.connected, true)
    client.close()
  } finally {
    console.warn = originalWarn
  }
})

test('multiple fx socket clients share provider-scoped critical outage dedupe', () => {
  const mock = setupSentry()
  const scheduler = new FakeScheduler()
  const { FxsocketWsClient } = loadClientModule()
  const first = new FxsocketWsClient({
    accountId: 'acct-a',
    apiKey: 'key',
    reconnectDelayMs: 60_000,
    healthMonitor: providerTracker(scheduler),
  })
  const second = new FxsocketWsClient({
    accountId: 'acct-b',
    apiKey: 'key',
    reconnectDelayMs: 60_000,
    healthMonitor: providerTracker(scheduler),
  })
  first.onMessage(() => {})
  second.onMessage(() => {})
  first.connect()
  second.connect()
  FakeWebSocket.instances[0]!.emitOpen()
  FakeWebSocket.instances[1]!.emitOpen()
  FakeWebSocket.instances[0]!.emitClose()
  FakeWebSocket.instances[1]!.emitClose()

  scheduler.advance(1_000)

  assert.equal(mock.capturedMessages.length, 1)
  assert.deepEqual(mock.scopes[0]!.fingerprint, ['critical_health', 'fx_socket', 'sustained_outage', 'fxsocket'])
  assert.equal(mock.scopes[0]!.tags.provider, 'fxsocket')
  assert.equal(mock.scopes[0]!.tags.component, 'fx_socket')
  first.close()
  second.close()
})

test('throwing health monitor cannot break open message close or reconnect handling', () => {
  setupSentry()
  const changes: boolean[] = []
  let messageCount = 0
  const throwingMonitor = {
    recordActivity() { throw new Error('monitor activity failed') },
    recordConnected() { throw new Error('monitor connected failed') },
    recordDisconnected() { throw new Error('monitor disconnected failed') },
    recordReconnectAttempt() { throw new Error('monitor reconnect failed') },
    reset() { throw new Error('monitor reset failed') },
  }
  const { FxsocketWsClient } = loadClientModule()
  const client = new FxsocketWsClient({
    accountId: 'acct-a',
    apiKey: 'key',
    reconnectDelayMs: 60_000,
    onConnectionChange: connected => changes.push(connected),
    healthMonitor: throwingMonitor,
  })
  client.onMessage(() => { messageCount += 1 })
  client.connect()
  const socket = FakeWebSocket.instances[0]!

  assert.doesNotThrow(() => socket.emitOpen())
  assert.equal(client.connected, true)
  assert.deepEqual(changes, [true])
  assert.doesNotThrow(() => socket.emitMessage(JSON.stringify({ type: 'tick', symbol: 'EURUSD', data: { bid: 1.1 } })))
  assert.equal(messageCount, 1)
  assert.doesNotThrow(() => socket.emitClose())
  assert.deepEqual(changes, [true, false])
  assert.notEqual(privateState(client).reconnectTimer, null)
  assert.doesNotThrow(() => client.close())
})

test('duplicate current socket close events do not duplicate outage alerts', () => {
  const mock = setupSentry()
  const scheduler = new FakeScheduler()
  const { FxsocketWsClient } = loadClientModule()
  const client = new FxsocketWsClient({
    accountId: 'acct-a',
    apiKey: 'key',
    reconnectDelayMs: 60_000,
    healthMonitor: providerTracker(scheduler),
  })
  client.onMessage(() => {})
  client.connect()
  const socket = FakeWebSocket.instances[0]!

  socket.emitOpen()
  socket.emitClose()
  socket.emitClose()
  scheduler.advance(1_000)

  assert.equal(mock.capturedMessages.length, 1)
  client.close()
})

test('sentry disabled does not change current socket reconnect behavior', () => {
  const mock = setupSentry(false)
  const scheduler = new FakeScheduler()
  const { FxsocketWsClient } = loadClientModule()
  const client = new FxsocketWsClient({
    accountId: 'acct-a',
    apiKey: 'key',
    reconnectDelayMs: 60_000,
    healthMonitor: providerTracker(scheduler),
  })
  client.onMessage(() => {})
  client.connect()
  const socket = FakeWebSocket.instances[0]!

  socket.emitOpen()
  socket.emitClose()
  scheduler.advance(1_000)

  assert.equal(mock.capturedMessages.length, 0)
  assert.notEqual(privateState(client).reconnectTimer, null)
  client.close()
})
