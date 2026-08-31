import assert from 'node:assert/strict'
import test from 'node:test'
import { testFlagEnabled, testFlagNumber, testFlagPercent } from './testFlags'

test('testFlagEnabled is off by default for any flag', () => {
  assert.equal(testFlagEnabled({} as NodeJS.ProcessEnv, 'FXSOCKET_TEST_FORCE_DISCONNECT'), false)
  assert.equal(testFlagEnabled({ FXSOCKET_TEST_FORCE_DISCONNECT: '' } as NodeJS.ProcessEnv, 'FXSOCKET_TEST_FORCE_DISCONNECT'), false)
})

test('testFlagEnabled honors truthy values on staging', () => {
  const env = { SENTRY_ENVIRONMENT: 'staging', FXSOCKET_TEST_FORCE_DISCONNECT: 'true' } as NodeJS.ProcessEnv
  assert.equal(testFlagEnabled(env, 'FXSOCKET_TEST_FORCE_DISCONNECT'), true)
})

test('testFlagEnabled refuses truthy values in production', () => {
  const env = { SENTRY_ENVIRONMENT: 'production', FXSOCKET_TEST_FORCE_DISCONNECT: 'true' } as NodeJS.ProcessEnv
  assert.equal(testFlagEnabled(env, 'FXSOCKET_TEST_FORCE_DISCONNECT'), false)
})

test('testFlagEnabled detects production from RAILWAY_ENVIRONMENT_NAME and NODE_ENV', () => {
  assert.equal(testFlagEnabled(
    { RAILWAY_ENVIRONMENT_NAME: 'prod', FXSOCKET_TEST_FORCE_DISCONNECT: 'true' } as NodeJS.ProcessEnv,
    'FXSOCKET_TEST_FORCE_DISCONNECT',
  ), false)
  assert.equal(testFlagEnabled(
    { NODE_ENV: 'production', FXSOCKET_TEST_FORCE_DISCONNECT: 'true' } as NodeJS.ProcessEnv,
    'FXSOCKET_TEST_FORCE_DISCONNECT',
  ), false)
})

test('testFlagNumber clamps to >= 0 and falls back on invalid input', () => {
  const env = { SENTRY_ENVIRONMENT: 'staging' } as NodeJS.ProcessEnv
  assert.equal(testFlagNumber(env, 'FXSOCKET_TEST_DISCONNECT_DURATION_MS', 60_000), 60_000)
  assert.equal(testFlagNumber({ ...env, FXSOCKET_TEST_DISCONNECT_DURATION_MS: '5000' } as NodeJS.ProcessEnv, 'FXSOCKET_TEST_DISCONNECT_DURATION_MS', 60_000), 5000)
  assert.equal(testFlagNumber({ ...env, FXSOCKET_TEST_DISCONNECT_DURATION_MS: '-5' } as NodeJS.ProcessEnv, 'FXSOCKET_TEST_DISCONNECT_DURATION_MS', 60_000), 0)
  assert.equal(testFlagNumber({ ...env, FXSOCKET_TEST_DISCONNECT_DURATION_MS: 'abc' } as NodeJS.ProcessEnv, 'FXSOCKET_TEST_DISCONNECT_DURATION_MS', 60_000), 60_000)
})

test('testFlagNumber and testFlagPercent are refused in production', () => {
  const prod = { SENTRY_ENVIRONMENT: 'production', TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE: '100' } as NodeJS.ProcessEnv
  assert.equal(testFlagNumber(prod, 'TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE', 0), 0)
  assert.equal(testFlagPercent(prod, 'TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE', 0), 0)
})

test('testFlagPercent clamps to 0-100 on staging', () => {
  const env = { SENTRY_ENVIRONMENT: 'staging' } as NodeJS.ProcessEnv
  assert.equal(testFlagPercent(env, 'TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE', 0), 0)
  assert.equal(testFlagPercent({ ...env, TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE: '50' } as NodeJS.ProcessEnv, 'TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE', 0), 50)
  assert.equal(testFlagPercent({ ...env, TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE: '150' } as NodeJS.ProcessEnv, 'TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE', 0), 100)
  assert.equal(testFlagPercent({ ...env, TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE: '-10' } as NodeJS.ProcessEnv, 'TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE', 0), 0)
})
