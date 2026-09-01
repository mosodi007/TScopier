# Telegram Code Delivery Issue — ruthdaberechi2100@gmail.com

**Date:** September 1, 2026  
**Status:** Resolved — listener restarted + code fix implemented  
**Severity:** High — user was completely blocked from receiving Telegram verification codes

---

## Summary

User `ruthdaberechi2100@gmail.com` is unable to receive Telegram verification codes. Every attempt to send a code is immediately rejected with the error "Telegram login is already starting." This has been ongoing since 06:29 UTC on September 1, 2026.

The root cause is a stuck in-memory state in the listener process. A single `send_code` request started at 06:29:53 UTC and never completed, leaving a guard flag (`authInFlight`) permanently set for this user. Because this flag has no timeout or expiry, all subsequent requests — including 44 `send_code` attempts and 6 QR login attempts — are blocked.

---

## User Profile

| Field | Value |
|---|---|
| Email | ruthdaberechi2100@gmail.com |
| User ID | b545f6af-fe3e-46fc-8c70-8923b51e0de3 |
| Account created | August 31, 2026 20:57 UTC |
| Last sign-in | September 1, 2026 15:32 UTC |
| Phone (redacted) | +729\*\*\*\*894 |

---

## Timeline of Events

**August 31, 2026**

| Time (UTC) | Event |
|---|---|
| 21:02:10 | User's first `send_code` attempt with an invalid phone format. Telegram returned `PHONE_NUMBER_INVALID`. The request completed and cleaned up normally. |
| 21:02:40 | Second `send_code` attempt with the correct phone format. Telegram returned `delivery=app` (code sent to the Telegram app). Request completed successfully. |
| 21:03:33 | `verify_code` completed successfully. User signed in. A `telegram_sessions` row was created. |

At this point, everything worked correctly. The user was fully authenticated and had an active Telegram session.

**September 1, 2026**

| Time (UTC) | Event |
|---|---|
| 06:29:53 | A new `send_code` request entered the auth flow. The `send_code_start` event was logged, but no follow-up events (`send_code_connecting`, `send_code_complete`, or any error) were ever recorded for this request. The request is stuck. |
| 06:30:53 – 15:33:04 | 44 consecutive `send_code` attempts, all immediately rejected with `duplicate_in_flight`. |
| 06:59:11 – 12:17:39 | 6 QR login attempts, all failed or timed out. |
| 16:53 – now | Listener for this user is in a reconnect loop: disconnects and renews the lease every ~20 seconds. |

Currently, there is no `telegram_auth_pending` row and no `telegram_sessions` row for this user in the database.

---

## What Happened — Technical Detail

The auth flow in `worker/src/authService.ts` uses an in-memory `Set<string>` called `authInFlight` to prevent concurrent `send_code` requests for the same user. When a `send_code` request starts, the user ID is added to this set. When the request finishes — whether successfully or with an error — the `finally` block removes it.

The sequence at 06:29:53 was:

1. The request passed phone validation and the `authInFlight` check (the set was empty).
2. `authInFlight.add(userId)` was called at `authService.ts:737`.
3. The request entered a `try` block and began executing async operations before the Telegram API call:
   - `disconnectPending()` — disconnects any existing pending auth client
   - `telegram_auth_pending` upsert — writes a placeholder row to the database
   - `sessionManager.prepareForAuth()` — stops the live listener and waits for the session lease to be released
   - `client.connect()` — opens a new MTProto connection to Telegram
4. **None of these steps logged a follow-up event** for this request's correlation ID (`3a494dd2`). The request is stuck in one of these `await` calls.
5. Because the `finally { this.authInFlight.delete(userId) }` at line 838 never ran, the user ID remains in the `authInFlight` set indefinitely.

The most likely hang point is `sessionManager.prepareForAuth()` at `sessionManager.ts:606`. This method:

1. Calls `disconnectListener()` to stop the live listener
2. Then calls `waitForListenerLeaseReleased()` (line 615), which polls the `worker_session_leases` table for up to 45 seconds (the default `MTPROTO_HOLD_WAIT_MS`)
3. The listener is currently in a reconnect loop — disconnecting and re-acquiring the lease every ~20 seconds — which could prevent the lease from ever being truly released, causing the wait to hang or the promise chain to deadlock

The `authInFlight` set has no TTL, no expiry, and no cleanup path other than the `finally` block in `sendCode()` or a full process restart. The periodic cleanup timer at `authService.ts:292–302` only prunes the `pending` Map, not `authInFlight`.

---

## Immediate Fix (Operational)

**Restarted the "TScopier - Listener" service on Railway** (deployment `0f776eca`, 17:58 UTC). This cleared the in-memory `authInFlight` set and allowed the user to request a new code.

---

## Long-Term Code Fixes (Implemented)

### 1. TTL on `authInFlight` entries

Added `authInFlightTimestamps` map and `isAuthInFlight()` helper that evicts entries older than 2 minutes (`AUTH_IN_FLIGHT_TTL_MS`). Applied to all guard checks in `sendCode`, `resendCode`, `startQrLogin`, `getQrStatus`, and the auth guard callback.

### 2. Hard timeout on `sendCode` and `startQrLogin`

Wrapped the `prepareForAuth` → `client.connect` → API call chain in `Promise.race` with a 90-second timeout (`AUTH_OPERATION_TIMEOUT_MS`). If the inner promise hangs, the timeout fires, the `finally` block runs, and `authInFlight` is cleaned up.

### 3. Periodic cleanup of stale entries

Added stale `authInFlight` eviction to the existing 60-second cleanup timer as a safety net — entries older than `AUTH_IN_FLIGHT_TTL_MS` are removed even if no new request triggers the guard.

---

## Files Changed

- `worker/src/authService.ts` — TTL + timeout + cleanup fixes

- `worker/src/authService.ts` — `sendCode()` method (line 695), `authInFlight` guard (line 707), `finally` cleanup (line 838)
- `worker/src/sessionManager.ts` — `prepareForAuth()` (line 606), `waitForListenerLeaseReleased()` (line 700)
- `worker/src/httpServer.ts` — HTTP handler for `/auth/send_code` (line 185)
- `supabase/functions/telegram-auth/index.ts` — Edge function proxy

---

## Verification

- TypeScript build passes (`npm --prefix worker run build`)
- All existing authService tests pass (redaction: 8/8, resend: 10/10)
- Listener restarted at 17:58 UTC, user can now request codes again
- Deploy the code fix to staging, then prod
