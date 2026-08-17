# Scratchpad — Move SL after TP hit broken with TP override (2026-08-16)

## Facts
- Move SL when TP hit works with normal channel multi-TP + partials
- With TP override (e.g. TP: 30 pips) + Move SL after movement (TP Hit) ON → SL does not move

## Root cause (CONFIDENT)
`tp_hit` fires when price reaches the configured TP level. With a single predefined/override TP (or when that TP is also the broker takeprofit), the broker **closes the whole position at that price** before (or instead of) Move-SL applying.

Without override, single-trade usually has early TPs as `partial_tp_legs` and a **farther** broker TP — so TP1 hit leaves the trade open and BE can apply.

## Fix
1. Snapshot absolute TP-hit trigger price into `auto_be_trigger_value` for `tp_hit` mode.
2. `isAutoBeTriggerMet` uses that absolute price (profit-side of entry) even with no partials / no broker TP.
3. Single-trade: when trigger TP == broker TP, **omit broker takeprofit** at plan time so the trade stays open for BE.
4. On BE apply, clear takeprofit if it equals the trigger level (legacy open trades).
5. Multi-trade: do not omit per-leg TPs; still store shared trigger price so siblings move SL when TP1 level is reached.

## Verification
- `node --import tsx --test src/autoManagement.test.ts` — 16 pass
- Needs trade-worker deploy for new opens to omit colliding broker TP

## Open
- Already-open trades with override still have broker TP at the trigger; they get clear-TP-on-modify help only if the monitor wins the race. New opens are fully fixed.
