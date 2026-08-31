# Sentry Critical Health Monitoring Plan

## Overview

This document outlines critical health monitoring for the TSCopier worker across 5 failure domains, and the **test flags** you can flip on staging to verify Sentry fires the matching alerts.

---

## 5 Critical Failure Domains

| # | Domain | Component | Failure Class | Monitoring | Test Flag |
|---|--------|-----------|---------------|------------|-----------|
| 1 | FxSocket/API sustained disconnect | `fx_socket` | `sustained_outage` | ✅ Implemented | `FXSOCKET_TEST_FORCE_DISCONNECT` |
| 2 | Worker process stops / heartbeat missing | `copier_worker` | `heartbeat_missing` | ✅ Implemented | `WORKER_HEARTBEAT_TEST_FORCE_STOP` |
| 3 | Critical worker/runtime exception | `copier_worker` | `systemic_failure` | ✅ Implemented | `CRITICAL_EXCEPTION_TEST_FORCE` |
| 4 | System-wide trade execution failure | `trade_pipeline` | `systemic_failure` | ✅ Implemented | `TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE` |
| 5 | Cron/background job stopped | `scheduler` | `missed_schedule` / `stalled` | 📋 Planned | — |

Domains 1–4 are implemented. The flags below **trigger the failure** so you can verify the alert arrives in Sentry. Domain 5 (cron/job stall) is not yet monitored, so it has no trigger flag.

---

## Test Flags (STAGING ONLY — all default OFF)

| Flag | Default | Effect When Set to `true` | Sentry Alert Expected |
|------|---------|----------------------------|-----------------------|
| `FXSOCKET_TEST_FORCE_DISCONNECT` | `false` | Closes all FxSocket WS connections for `FXSOCKET_TEST_DISCONNECT_DURATION_MS`, then reconnects | **Critical Issue** `FXSOCKET_SOCKET_SUSTAINED_OUTAGE` (if duration > grace) |
| `FXSOCKET_TEST_DISCONNECT_DURATION_MS` | `60000` | How long FxSocket stays down. Set > grace (60s default) to fire alert; < grace for "no alert" check | — |
| `WORKER_HEARTBEAT_TEST_FORCE_STOP` | `false` | Stops sending worker-heartbeat check-ins | **Monitor Down / missed check-ins** after margin |
| `CRITICAL_EXCEPTION_TEST_FORCE` | `false` | Throws an uncaught exception after `CRITICAL_EXCEPTION_TEST_DELAY_MS` | **Error Issue** `UNCAUGHT_EXCEPTION` (and heartbeat goes down) |
| `CRITICAL_EXCEPTION_TEST_DELAY_MS` | `1000` | Delay before the forced exception | — |
| `TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE` | `0` | Forces `N`% of trade executions to fail (0–100) so the trade-pipeline monitor fires | **Critical Issue** `TRADE_PIPELINE_SYSTEMIC_FAILURE` |

### Trade-pipeline monitor tuning (real monitoring, not test-gated)

| Variable | Default | Description |
|----------|---------|-------------|
| `TRADE_PIPELINE_WINDOW_MS` | `300000` | Rolling window over which failures are counted |
| `TRADE_PIPELINE_MIN_ATTEMPTS` | `10` | Minimum executions in the window before evaluating |
| `TRADE_PIPELINE_FAILURE_THRESHOLD_PCT` | `50` | Alert when failure rate reaches this % |

### How the flags work

- **All default to `false`/`0`** — unset = normal production behavior.
- **Refused in production** — the flags only take effect when the environment (`SENTRY_ENVIRONMENT` / `RAILWAY_ENVIRONMENT_NAME` / `NODE_ENV`) is not `production`/`prod`. See `worker/src/testFlags.ts`. This prevents a staging env set from being copied into prod by mistake (which would crash-loop the trade worker).
- **Set back to `false`/unset** → next tick/interval/reconnect restores normal behavior; no restart required for the socket/heartbeat flags.
- **The exception flag** forces the process to crash (that's the point) — Railway restarts it. Remove the flag after the test.

---

## Files Modified

| File | Change |
|------|--------|
| `worker/src/testFlags.ts` | Production guard for all test flags |
| `worker/src/fxsocketWsClient.ts` | Force-disconnect path in `connect()` + `scheduleTestReconnect()` |
| `worker/src/observability/workerHeartbeat.ts` | Skip check-ins when `WORKER_HEARTBEAT_TEST_FORCE_STOP` set |
| `worker/src/index.ts` | Forced uncaught exception when `CRITICAL_EXCEPTION_TEST_FORCE` set |
| `worker/src/observability/tradeExecutionMonitor.ts` | New `TradeExecutionMonitor` (rolling failure-rate alert) |
| `worker/src/tradeExecutor/TradeExecutor.ts` | Record execution outcomes + forced-failure injection |
| `worker/.env.example` | Documented all test flags |
| `worker/src/testFlags.test.ts` | Tests for the production guard |
| `worker/src/fxsocketWsClient.health.test.ts` | Test for force-disconnect behavior |
| `worker/src/observability/tradeExecutionMonitor.test.ts` | Tests for the trade-pipeline monitor |
| `docs/sentry-critical-health-plan.md` | This plan |

---

## Sentry Alerts Produced by Domains 1–4

| Domain | Alert Type | Fingerprint / Identifier | Key Tags |
|--------|------------|--------------------------|----------|
| 1. FxSocket sustained outage | Critical Issue | `['critical_health', 'fx_socket', 'sustained_outage', 'fxsocket']` | `component=fx_socket`, `failure_class=sustained_outage`, `provider=fxsocket`, `severity=critical`, `state=unavailable` |
| 2. Worker heartbeat missing | Monitor Down | Monitor slug (e.g., `tscopier-worker-trade`) | status → down after margin |
| 3. Uncaught exception | Error Issue | `['worker', 'UNCAUGHT_EXCEPTION', 'Error']` | `subsystem=worker`, `operation=uncaught_exception`, `error_code=UNCAUGHT_EXCEPTION` |
| 4. Trade pipeline failure | Critical Issue | `['critical_health', 'trade_pipeline', 'systemic_failure']` | `component=trade_pipeline`, `failure_class=systemic_failure`, `severity=critical`, `state=unavailable` |

---

## Test Procedures (Staging)

### Scenario 1 — FxSocket short disconnect (< grace, NO alert)

```
# Railway variables:
FXSOCKET_TEST_FORCE_DISCONNECT=true
FXSOCKET_TEST_DISCONNECT_DURATION_MS=30000   # under 60s grace

# Wait 30s → Sentry: NO critical issue (grace absorbs it)
# Then set FXSOCKET_TEST_FORCE_DISCONNECT=false (or remove)
# → socket reconnects, recovery breadcrumb recorded
```

### Scenario 2 — FxSocket sustained disconnect (> grace, alert fires)

```
# Railway variables:
FXSOCKET_TEST_FORCE_DISCONNECT=true
FXSOCKET_TEST_DISCONNECT_DURATION_MS=90000   # over 60s grace

# Wait ~60s → Sentry: Critical Issue FXSOCKET_SOCKET_SUSTAINED_OUTAGE
# Set FXSOCKET_TEST_FORCE_DISCONNECT=false
# → reconnects, issue resolves / recovery recorded
```

### Scenario 3 — Second outage after recovery

```
# After scenario 2 recovery, set SENTRY_CRITICAL_HEALTH_COOLDOWN_MS=0 in Railway,
# then re-run scenario 2. Expect a NEW alert (not suppressed).
```

### Scenario 7 — Worker heartbeat failure

```
# Railway variables:
WORKER_HEARTBEAT_TEST_FORCE_STOP=true

# Wait past margin (default 2 min) → Sentry Monitor shows missed check-ins / down.
# Set WORKER_HEARTBEAT_TEST_FORCE_STOP=false → next check-in restores OK.
```

### Critical exception (crash alert)

```
# Railway variables:
CRITICAL_EXCEPTION_TEST_FORCE=true
# (optional) CRITICAL_EXCEPTION_TEST_DELAY_MS=1000

# Worker throws an uncaught exception → Sentry captures UNCAUGHT_EXCEPTION,
# heartbeat goes down, Railway restarts the worker.
# Remove the flag to prevent a crash-loop.
```

### Scenario 4 — Trade pipeline failure

```
# Railway variables:
TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE=100     # force 100% of trades to fail
# (optional) lower the alert threshold for a faster test:
TRADE_PIPELINE_MIN_ATTEMPTS=5
TRADE_PIPELINE_FAILURE_THRESHOLD_PCT=10

# Trigger some trade executions (or wait for signals).
# Once >= min attempts have failed at/above the threshold within the window,
# Sentry fires Critical Issue TRADE_PIPELINE_SYSTEMIC_FAILURE.
# Set TRADE_PIPELINE_TEST_FORCE_FAILURE_RATE=0 to stop forcing failures.
```

---

## Rollback / Safety

- **All flags default OFF** — production behavior unchanged when unset.
- **Socket & heartbeat flags** revert immediately when set back to `false`/unset (no restart).
- **Exception flag** intentionally crashes the process; remove it after the test to avoid a crash-loop.
- **Trade-pipeline monitor is real monitoring** — it stays active in production by default (tuned by `TRADE_PIPELINE_*`). Only the forced-failure injection is a staging test flag.
- Test on **staging only**; keep prod test flags unset.

---

## Remaining Work (Domain 5)

Not yet implemented — requires a new `SchedulerMonitor` tracking each monitor loop's last tick → fires `SCHEDULER_MONITOR_STALLED`. No test flag until the monitoring exists.
