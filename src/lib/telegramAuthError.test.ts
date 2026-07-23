import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isNoPendingPhoneAuthError,
  NO_PENDING_PHONE_AUTH_ERROR,
  resolveTelegramAuthError,
} from './telegramAuthError'

const messages = {
  telegramAlreadyLinked: 'Already linked',
  noPendingPhoneAuth: 'Request a new code',
}

describe('telegram auth error parsing', () => {
  it('prefers structured NO_PENDING_PHONE_AUTH codes', () => {
    const payload = {
      code: NO_PENDING_PHONE_AUTH_ERROR,
      error: 'Some translated message',
    }

    assert.equal(isNoPendingPhoneAuthError(payload), true)
    assert.equal(resolveTelegramAuthError(payload, 'Fallback', messages), 'Request a new code')
  })

  it('keeps compatibility with old no-pending messages', () => {
    const payload = {
      error: 'No pending auth flow. Call send code first.',
    }

    assert.equal(isNoPendingPhoneAuthError(payload), true)
    assert.equal(resolveTelegramAuthError(payload, 'Fallback', messages), 'Request a new code')
  })
})
