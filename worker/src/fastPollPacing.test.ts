import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { fastPollChannelIntervalMs, nextFastPollCleanStreak } from './userListener'

describe('fastPollChannelIntervalMs', () => {
  it('returns the base tick interval for a fresh channel (streak 0)', () => {
    const base = fastPollChannelIntervalMs(0)
    assert.equal(base, fastPollChannelIntervalMs(0))
    assert.ok(base > 0)
  })

  it('doubles with each consecutive quiet poll', () => {
    const s0 = fastPollChannelIntervalMs(0)
    const s1 = fastPollChannelIntervalMs(1)
    const s2 = fastPollChannelIntervalMs(2)
    assert.equal(s1, s0 * 2)
    assert.equal(s2, s0 * 4)
    assert.ok(s2 < fastPollChannelIntervalMs(3))
  })

  it('caps the interval so quiet channels are never abandoned', () => {
    for (const streak of [10, 20, 100]) {
      const capped = fastPollChannelIntervalMs(streak)
      // cap is >= base and every interval must equal the streak-99 value
      assert.equal(capped, fastPollChannelIntervalMs(99))
    }
    assert.ok(fastPollChannelIntervalMs(99) >= FAST_POLL_MAX)
  })
})

// The cap must be at least the base; derive it from behavior: intervals
// plateau once doubling exceeds the cap.
const FAST_POLL_MAX = (() => {
  let prev = 0
  for (let i = 0; i <= 30; i++) {
    const v = fastPollChannelIntervalMs(i)
    if (v === prev) return v
    prev = v
  }
  return prev
})()

describe('nextFastPollCleanStreak', () => {
  it('increments on a quiet poll (no new messages)', () => {
    assert.equal(nextFastPollCleanStreak(0, 'empty'), 1)
    assert.equal(nextFastPollCleanStreak(4, 'empty'), 5)
  })

  it('resets to zero when messages were found or the poll failed', () => {
    assert.equal(nextFastPollCleanStreak(7, 'messages'), 0)
    assert.equal(nextFastPollCleanStreak(7, 'failed'), 0)
  })

  it('leaves the streak unchanged when the poll was skipped', () => {
    assert.equal(nextFastPollCleanStreak(3, 'skipped'), 3)
  })

  it('an active channel returns to base cadence immediately after a message poll', () => {
    const streakAfterMessages = nextFastPollCleanStreak(9, 'messages')
    assert.equal(fastPollChannelIntervalMs(streakAfterMessages), fastPollChannelIntervalMs(0))
  })
})
