# Scratchpad — Override signal TP on multi / range (2026-08-17)

## Report

Override signal SL from fill/trigger is working. Same treatment needed for Override signal TPs (predefined TP pips).

## Facts

1. UI writes `use_predefined_tp_pips` + `predefined_tp_pips` (same fields for single and multi).
2. Multi post-fill restamped SL only, and skipped the whole pass when SL override was off — so TP-only override never applied.
3. Range virtuals reused first-anchor `finalTps`. A buy that fills past that TP has TP on the wrong side → `sanitizeStops` drops it to 0.

## Fix

- Helpers: `resolvePredefinedTpPips`, `predefinedTpPriceFromEntry`, `resolvePredefinedTpForEntry` (bucket from planned TP, pips from this fill).
- Range plan: TP = trigger ± that bucket’s pips, not the first-anchor TP.
- Range fire: recompute override TP from fire quote; from fill after open. CWE legs stay TP=0.
- Multi post-fill: restamp this leg’s TP from fill; keep TP1/TP2 by nearest planned price (do not flatten to last TP).

## Tests

Planner (per-trigger TPs), `resolvePredefinedTpForEntry` (fill past shared TP), post-fill TP-only + two-bucket, range `fireLeg` send args.
