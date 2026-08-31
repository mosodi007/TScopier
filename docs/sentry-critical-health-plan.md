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
| 4 | System-wide trade execution failure | `trade_pipeline` | `systemic_failure` | ✅ Implemented | `TRADE_PIPELINE_TEST_FORCE_FAILURE` |
| 5 | Cron/background job stopped | `scheduler` | `missed_schedule` / `stalled` | 📋 Planned | — |

Domains 1–4 are implemented. The flags below **trigger the failure** so you can verify the alert arrives in Sentry. Domain 5 (cron/job stall) is not yet monitored, so it has no trigger flag.

---

## Test Flags (STAGING ONLY — all default OFF)

| Flag | Default | Effect When Set to `true` | Sentry Alert Expected |
|------|---------|----------------------------|-----------------------|
| `FXSOCKET_TEST_FORCE_DISCONNECT` | `false` | Closes all FxSocket WS connections. Socket stays down until flag is set back to false | **Critical Issue** `FXSOCKET_SOCKET_SUSTAINED_OUTAGE` (after grace) |
| `WORKER_HEARTBEAT_TEST_FORCE_STOP` | `false` | Stops sending worker-heartbeat check-ins | **Monitor Down / missed check-ins** after margin |
| `CRITICAL_EXCEPTION_TEST_FORCE` | `false` | Throws an uncaught exception 1 second after startup | **Error Issue** `UNCAUGHT_EXCEPTION` (and heartbeat goes down) |
| `TRADE_PIPELINE_TEST_FORCE_FAILURE` | `false` | Forces all trade executions to fail so the trade-pipeline monitor fires | **Critical Issue** `TRADE_PIPELINE_SYSTEMIC_FAILURE` |

### Trade-pipeline monitor tuning (real monitoring, not test-gated)

| Variable | Default | Description |
|----------|---------|-------------|
| `TRADE_PIPELINE_FAILURE_THRESHOLD_PCT` | `50` | Alert when failure rate reaches this % |

### How the flags work

- **All default to `false`** — unset = normal production behavior.
- **Refused in production** — the flags only take effect when the environment (`SENTRY_ENVIRONMENT` / `RAILWAY_ENVIRONMENT_NAME` / `NODE_ENV`) is not `production`/`prod`. See `worker/src/testFlags.ts`. This prevents a staging env set from being copied into prod by mistake (which would crash-loop the trade worker).
- **Set back to `false`** → next tick/interval/reconnect restores normal behavior; no restart required for the socket/heartbeat flags.
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

### Scenario 1 — FxSocket sustained disconnect (alert fires)

```
# Railway variables:
FXSOCKET_TEST_FORCE_DISCONNECT=true

# Wait past the outage grace (default 60s) → Sentry: Critical Issue FXSOCKET_SOCKET_SUSTAINED_OUTAGE
# Set FXSOCKET_TEST_FORCE_DISCONNECT=false → socket reconnects, issue resolves
```

### Scenario 2 — Second outage after recovery

```
# After scenario 1 recovery, set SENTRY_CRITICAL_HEALTH_COOLDOWN_MS=0 in Railway,
# then re-run scenario 1. Expect a NEW alert (not suppressed).
```

### Scenario 3 — Worker heartbeat failure

```
# Railway variables:
WORKER_HEARTBEAT_TEST_FORCE_STOP=true

# Wait past margin (default 2 min) → Sentry Monitor shows missed check-ins / down.
# Set WORKER_HEARTBEAT_TEST_FORCE_STOP=false → next check-in restores OK.
```

### Scenario 4 — Critical exception (crash alert)

```
# Railway variables:
CRITICAL_EXCEPTION_TEST_FORCE=true

# Worker throws an uncaught exception 1s after startup → Sentry captures UNCAUGHT_EXCEPTION,
# heartbeat goes down, Railway restarts the worker.
# Remove the flag to prevent a crash-loop.
```

### Scenario 4 — Trade pipeline failure

```
# Railway variables:
TRADE_PIPELINE_TEST_FORCE_FAILURE=true             # force all trades to fail

# Trigger some trade executions (or wait for signals).
# Once >= min attempts have failed at/above the threshold within the window,
# Sentry fires Critical Issue TRADE_PIPELINE_SYSTEMIC_FAILURE.
# Set TRADE_PIPELINE_TEST_FORCE_FAILURE=false to stop forcing failures.
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
