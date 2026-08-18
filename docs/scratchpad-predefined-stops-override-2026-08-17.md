# Scratchpad — Predefined SL/TP must execute over signal stops (2026-08-17)

## Report

Trades with TP but no SL were blocked after the 2026-08-16 gate. User has Override signal SL/TP and expects those values to be used even when the signal has Premium SL, no SL, or stops on the wrong side of the market.

## Facts

1. `evaluateParsedSignalExecutionEligibility` skipped TP-without-SL at **signal** level (no account settings). Listener marked the parse `ignore`. Predefined SL never ran.
2. `configuredFallbackSlPossible` required a **signal entry price**. Market “GOLD BUY TP 2400” has none, so entry prep still failed even if the signal got through.
3. Planner already replaces signal SL/TP when override is on, and uses live bid/ask as the anchor when the signal has no entry.

## Fix

- Eligibility no longer skips TP-without-SL. Per-account `missingRequiredSlFailure` still blocks accounts with no fallback.
- Override SL (valid pips) is enough fallback — no signal entry required. Premium / missing / TP-only / bare BUY NOW all execute.
- Override TP alone does **not** count as an SL. Planner still ignores wrong-side signal SL/TP when override is on.

## Tests

Eligibility: GOLD BUY NOW + TPs, no SL → eligible. Entry prep: predefined 80 pips allows TP-only and Premium without entry; predefined TP alone still `entry_tp_without_sl`. Planner: live quote + wrong-side signal stops → 80-pip SL / 50-pip TP from ask.
