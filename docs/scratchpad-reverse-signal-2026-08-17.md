# Scratchpad — Reverse Signal did not flip buy to sell (2026-08-17)

## Report

Reverse Signal was on. A buy signal still opened a buy.

## Facts

1. Planner only flipped when `reverseSignalGateSatisfied`: signal **entry price/zone** plus **both** predefined SL and TP pips.
2. `GOLD BUY NOW` (no entry) never flipped, even with override SL/TP (live quote was only used *after* the gate).
3. Account Configuration silently ignored turning Reverse on unless predefined SL+TP were already set.

## Fix

- `reverse_signal` always flips buy↔sell.
- No signal entry: use live bid/ask on the reversed side for stop geometry.
- No predefined stops: mirror absolute signal SL/TP around entry so they stay on the correct side. Pip offsets stay offsets.
- UI toggle is no longer blocked.

## Tests

BUY with entry, no predefined → Sell + mirrored stops. BUY NOW + predefined + live quote → Sell from bid.

## Follow-up — predefined SL/TP missing on the flipped side

Reverse started flipping, but override pips were still measured as a **buy** (signal entry + `parsed.action`). Sell-side restamp then `stripInvalidStopsForSide` dropped them.

- Post-fill uses the ticket `direction`, not the channel action.
- Reverse + predefined prefers live bid/ask of the reversed side over the original entry.
- Entry prep prefetches a quote when reverse or predefined pips are on.
- V2 desired-state seed skips reverse accounts so channel buy stops are not applied later.
