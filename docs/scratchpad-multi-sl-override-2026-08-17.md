# Scratchpad — Override signal SL missing on multi / range (2026-08-17)

## Report

Override signal SL (80 pips from entry) is on in the UI. New multi / range entries from a fresh signal open with **no SL**. Question: is override single-only?

## Answer

It is **not** single-only. The planner already computes predefined SL for both styles. Multi skipped the post-fill stamp, and range legs reused one shared SL that `sanitizeStops` often drops.

## Facts

1. UI writes `use_predefined_sl_pips` + `predefined_sl_pips` (same fields for single and multi).
2. `postFillFollowUp.applyPipAndChannelStops` returned immediately for `trade_style === 'multi'` to avoid flattening TPs to `tp[0]`. That return also skipped predefined **SL**. Single restamps SL from fill; multi did not.
3. `planMultiManualOrders` copied `finalSl` (from the first basket anchor) onto every range virtual. A buy layer that fills at or below that price has SL on the wrong side → dropped to 0.

## Fix

- Multi post-fill: apply **SL only** from that leg’s fill when override is on. Leave per-bucket TPs alone.
- Range virtuals: SL = trigger ± 80 pips (that step), not the first-anchor SL.
- Range fire: recompute override SL from fire quote before send, and from fill after a naked open.

## Tests

Planner (per-trigger SLs), `resolvePredefinedSlForEntry` (fill past shared SL), post-fill OrderModify SL-only, range `fireLeg` send args.
