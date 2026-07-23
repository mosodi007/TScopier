import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isPasswordRecoveryLocation,
  passwordRecoveryRedirectPath,
} from './isPasswordRecoveryLink'

describe('passwordRecoveryRedirectPath', () => {
  it('redirects a recovery callback landing on /', () => {
    assert.equal(
      passwordRecoveryRedirectPath({
        pathname: '/',
        search: '?type=recovery&token_hash=abc',
        hash: '',
      }),
      '/reset-password?type=recovery&token_hash=abc',
    )
  })

  it('redirects a recovery callback landing on /dashboard', () => {
    assert.equal(
      passwordRecoveryRedirectPath({
        pathname: '/dashboard',
        search: '',
        hash: '#access_token=at&refresh_token=rt&type=recovery',
      }),
      '/reset-password#access_token=at&refresh_token=rt&type=recovery',
    )
  })

  it('does not redirect normal authenticated navigation', () => {
    assert.equal(
      isPasswordRecoveryLocation({
        pathname: '/dashboard',
        search: '',
        hash: '',
      }),
      false,
    )
    assert.equal(
      passwordRecoveryRedirectPath({
        pathname: '/dashboard',
        search: '?checkout=success',
        hash: '',
      }),
      null,
    )
    assert.equal(
      passwordRecoveryRedirectPath({
        pathname: '/auth/confirmed',
        search: '?type=signup&token_hash=abc',
        hash: '',
      }),
      null,
    )
  })

  it('does not loop when recovery callback is already on /reset-password', () => {
    assert.equal(
      passwordRecoveryRedirectPath({
        pathname: '/reset-password',
        search: '?type=recovery&token_hash=abc',
        hash: '',
      }),
      null,
    )
  })
})
