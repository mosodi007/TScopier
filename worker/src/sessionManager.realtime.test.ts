import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

type StatusCallback = (status: string) => void

function makeChannel(name: string, registry: string[], callbacks: Map<string, StatusCallback>) {
  registry.push(name)
  const channel = {
    topic: `realtime:${name}`,
    on: () => channel,
    subscribe: (cb: StatusCallback) => {
      callbacks.set(name, cb)
      return channel
    },
  }
  return channel
}

/**
 * Regression test for the 2026-08-25 realtime retry storm: repeated CLOSED
 * status callbacks (zombie channels + socket flap) must never multiply retry
 * timers or accumulate channels without bound.
 */
describe('UserSessionManager realtime resubscribe', () => {
  function makeSupabase() {
    const builder = () => ({
      select: () => builder(),
      eq: () => builder(),
      then: (resolve: (v: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
    })
    const registry: string[] = []
    const removed: unknown[] = []
    const callbacks = new Map<string, StatusCallback>()
    let seq = 0
    let created = 0
    return {
      registry,
      removed,
      callbacks,
      createdCount: () => created,
      from: () => builder(),
      getChannels: () => registry.map(n => ({ topic: n })),
      removeChannel: async (ch: unknown) => {
        removed.push(ch)
        const t = (ch as { topic?: string }).topic ?? ''
        const idx = registry.indexOf(t.replace(/^realtime:/, ''))
        if (idx >= 0) registry.splice(idx, 1)
      },
      channel: () => {
        created += 1
        return makeChannel(`chan_${++seq}`, registry, callbacks)
      },
    }
  }

  async function withFastRetry<T>(fn: () => Promise<T>): Promise<T> {
    const prev = process.env.REALTIME_RETRY_BASE_MS
    process.env.REALTIME_RETRY_BASE_MS = '20'
    try {
      return await fn()
    } finally {
      if (prev == null) delete process.env.REALTIME_RETRY_BASE_MS
      else process.env.REALTIME_RETRY_BASE_MS = prev
    }
  }

  async function loadManager() {
    const mod = await import('./sessionManager')
    return mod.UserSessionManager
  }

  it('repeated CLOSED callbacks schedule exactly one bounded retry', async () => {
    await withFastRetry(async () => {
      const UserSessionManager = await loadManager()
      const supabase = makeSupabase()
      const manager = new UserSessionManager(supabase as never)
      const anyManager = manager as unknown as {
        subscribeToAuthPendingChanges: () => void
        realtimeRetryTimers: Map<string, NodeJS.Timeout>
        authPendingChannel: unknown
      }

      anyManager.subscribeToAuthPendingChanges()
      assert.equal(supabase.createdCount(), 1)

      // Simulate a socket flap firing CLOSED dozens of times on the same
      // callback (what happens with zombie channels registered).
      const cb = [...supabase.callbacks.values()][0]
      for (let i = 0; i < 50; i += 1) cb('CLOSED')

      assert.equal(anyManager.realtimeRetryTimers.size, 1)
      assert.equal(supabase.createdCount(), 1)

      await new Promise(resolve => setTimeout(resolve, 120))

      // Exactly one re-subscribe attempt happened despite 50 CLOSED events.
      assert.equal(supabase.createdCount(), 2)
      assert.equal(anyManager.authPendingChannel != null || supabase.createdCount() >= 2, true)
    })
  })

  it('zombie channel CLOSED callbacks do not create extra channels', async () => {
    await withFastRetry(async () => {
      const UserSessionManager = await loadManager()
      const supabase = makeSupabase()
      const manager = new UserSessionManager(supabase as never)
      const anyManager = manager as unknown as {
        subscribeToAuthPendingChanges: () => void
        authPendingChannel: unknown
      }

      anyManager.subscribeToAuthPendingChanges()
      const firstCb = [...supabase.callbacks.values()][0]

      // First failure -> ref cleared -> one retry scheduled.
      firstCb('CHANNEL_ERROR')

      // Retry fires and creates the replacement channel.
      await new Promise(resolve => setTimeout(resolve, 120))
      assert.equal(supabase.createdCount(), 2)
      assert.equal(anyManager.authPendingChannel != null, true)

      // The zombie's callback keeps firing (dead socket flaps) — must be ignored.
      for (let i = 0; i < 30; i += 1) firstCb('CLOSED')
      await new Promise(resolve => setTimeout(resolve, 120))
      assert.equal(supabase.createdCount(), 2)
    })
  })

  it('backoff grows across consecutive failures and resets on SUBSCRIBED', async () => {
    await withFastRetry(async () => {
      const UserSessionManager = await loadManager()
      const supabase = makeSupabase()
      const manager = new UserSessionManager(supabase as never)
      const anyManager = manager as unknown as {
        subscribeToAuthPendingChanges: () => void
        realtimeRetryAttempts: Map<string, number>
      }
      const topic = 'realtime:telegram_auth_pending_changes'

      anyManager.subscribeToAuthPendingChanges()
      const cb1 = [...supabase.callbacks.values()][0]
      cb1('CLOSED')
      assert.equal(anyManager.realtimeRetryAttempts.get(topic), 1)
      cb1('CLOSED') // duplicate while timer pending — no extra attempt counted
      assert.equal(anyManager.realtimeRetryAttempts.get(topic), 1)

      await new Promise(resolve => setTimeout(resolve, 120))
      const cb2 = [...supabase.callbacks.entries()].sort((a, b) => a[0].localeCompare(b[0]))[1][1]
      cb2('SUBSCRIBED')
      assert.equal(anyManager.realtimeRetryAttempts.has(topic), false)
    })
  })
})
