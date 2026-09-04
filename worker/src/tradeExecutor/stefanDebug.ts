import type { BasketMergeLinkContext } from '../signalMergeLink'
import type { ParsedSignal, SignalRow } from './types'

type StefanDebugArgs = {
  signal: SignalRow
  parsed: ParsedSignal
  symbol?: string | null
  direction?: string | null
  link?: BasketMergeLinkContext | null
  guardResult?: boolean | null
  finalRoutingDecision?: string | null
  quote?: { bid?: number | null; ask?: number | null } | null
  rangeTrading?: boolean | null
  strictRange?: boolean | null
  plannedOrder?: { price?: number | null; type?: string | null } | null
}

function intent(parsed: ParsedSignal): { kind: unknown; entry: unknown; marketNow: unknown } {
  const stored = (parsed as unknown as {
    _intent?: {
      kind?: unknown
      entry?: unknown
      flags?: { market_now?: unknown }
    }
  })._intent
  return {
    kind: stored?.kind ?? null,
    entry: stored?.entry ?? null,
    marketNow: stored?.flags?.market_now ?? null,
  }
}

function linkReason(link: BasketMergeLinkContext | null | undefined): string[] {
  if (!link) return []
  const reasons: string[] = []
  if (link.replyOk) reasons.push('replyOk')
  if (link.parentLinksAnchor) reasons.push('parentLinksAnchor')
  if (link.threadLinksAnchor) reasons.push('threadLinksAnchor')
  if (link.sameSignalRefresh) reasons.push('sameSignalRefresh')
  if (link.parameterRefreshSameChannel) reasons.push('parameterRefreshSameChannel')
  if (link.implicitBundleWithinTightWindow && link.implicitSameChannelBundle) {
    reasons.push('implicitSameChannelBundle')
  }
  return reasons
}

export function stefanDebug(stage: string, args: StefanDebugArgs): void {
  const { signal, parsed, link } = args
  const storedIntent = intent(parsed)
  const tp = Array.isArray(parsed.tp) ? parsed.tp : []
  console.log('[STEFAN_DEBUG]', JSON.stringify({
    stage,
    signal_id: signal.id,
    telegram_message_id: signal.telegram_message_id ?? null,
    channel_id: signal.channel_id ?? null,
    symbol: args.symbol ?? parsed.symbol ?? null,
    direction: args.direction ?? parsed.action ?? null,
    entry_price: parsed.entry_price ?? null,
    entry_zone_low: parsed.entry_zone_low ?? null,
    entry_zone_high: parsed.entry_zone_high ?? null,
    intent_kind: storedIntent.kind,
    intent_entry: storedIntent.entry,
    intent_market_now: storedIntent.marketNow,
    sl: parsed.sl ?? null,
    tp_count: tp.filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0).length,
    explicit_reply: Boolean(signal.reply_to_message_id),
    explicit_parent: Boolean(signal.parent_signal_id),
    replyOk: link?.replyOk ?? null,
    threadLinksAnchor: link?.threadLinksAnchor ?? null,
    parentLinksAnchor: link?.parentLinksAnchor ?? null,
    sameSignalRefresh: link?.sameSignalRefresh ?? null,
    parameterRefreshSameChannel: link?.parameterRefreshSameChannel ?? null,
    link_isLinked: link?.isLinked ?? null,
    link_reason: linkReason(link),
    guard_result: args.guardResult ?? null,
    final_routing_decision: args.finalRoutingDecision ?? null,
    quote_bid: args.quote?.bid ?? null,
    quote_ask: args.quote?.ask ?? null,
    range_trading: args.rangeTrading ?? null,
    strict_range: args.strictRange ?? null,
    planned_order_price: args.plannedOrder?.price ?? null,
    planned_order_type: args.plannedOrder?.type ?? null,
  }))
}