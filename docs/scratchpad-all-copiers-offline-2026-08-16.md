# Scratchpad — All copier engines offline (2026-08-16)

## Facts from report
- User: "all copier engine is offline"
- Admin UI treats offline as no live `worker_session_leases` row

## Questions
1. Are there any live leases in prod?
2. Did the listener process die, redeploy, or stop renewing?
3. Is this eligibility display vs real outage?
4. What is the production listener URL / health?

## Hypotheses
- H1: Production listener Railway service is down / unreachable → leases expired
- H2: Listener is up but lease renew loop broken / crashed mid-run
- H3: Staging vs prod confusion; user looking at staging
- H4: DB clock / lease TTL misconfig caused mass expiry while process lives

## Evidence
- Prod URL: `https://tscopier-listener-production.up.railway.app/health`
- Instance `883f80b61aeb:12` matches lease `worker_id` prefix
- At ~10:34–10:36 UTC: **live_leases=0**, last HB `10:30:33Z`, last expiry `10:31:18Z`
- Health: `ok:false`, `active_leases:0`, `fresh_leases_for_connected:0`, `lease_mismatch:true`, `lease_gap:25`
- In-memory: **32 listeners / 25 connected** — Telegram MTProto still up
- Active gramjs sessions in DB: 72
- Conclusion: **H2 confirmed** — process alive; lease renew stopped. Admin offline is lease-based, so all engines show offline.

## Root cause (CONFIDENT)
`renewAllLeases` uses `renewLeasesInFlight` to skip overlapping cycles. Timeout covered only `ensureSessionLeaseFresh`, not eligibility / auth-pending / `stopListener`. One hung await keeps the guard true forever → every later tick skips → all leases expire (~45s TTL) → Admin shows everyone offline while connected listeners keep polling Telegram.

## Recovery
1. **Immediate:** Restart Railway service for production listener (`tscopier-listener-production`). New process schedules renew interval and refreshes leases within ~8–45s.
2. **Code (this session):** Force-clear stuck in-flight after cycle budget; wrap whole per-user renew body + cycle in `withTimeout`. Needs listener deploy to stick.

## Disconfirmation check
- If process were dead → health would 404 / timeout. Observed 503 with live detail → not H1.
- If only display bug → DB would still have live leases. Observed live=0 → real lease outage for Admin + any lease-gated path.
