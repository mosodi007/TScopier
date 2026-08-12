import { getLocalCalendarDayBounds, isTradeableClosedRow } from '@/lib/dashboardTradeStats'
import type { DashboardChartTrade } from '@/lib/dashboardCharts'
import { isMtTimestampInRange } from '@/lib/mtApiDateTime'
import { displayTradeProfit, type MtTrade } from '@/lib/mtTrade'

const OUTCOME_EPSILON = 0.005

export type DayTradeSummary = {
  hasData: boolean
  taken: number
  won: number
  lost: number
  breakeven: number
  netPnl: number
}

function classifyOutcome(p: number): 'won' | 'lost' | 'breakeven' {
  if (p > OUTCOME_EPSILON) return 'won'
  if (p < -OUTCOME_EPSILON) return 'lost'
  return 'breakeven'
}

export function summarizeDayFromChartTrades(
  trades: DashboardChartTrade[],
  rangeStart: Date,
  rangeEnd: Date,
): DayTradeSummary {
  let taken = 0
  let won = 0
  let lost = 0
  let breakeven = 0
  let netPnl = 0

  for (const t of trades) {
    if (t.status !== 'closed') continue
    const closeIso = t.closedAt ?? t.openedAt
    if (!closeIso || !isMtTimestampInRange(closeIso, rangeStart, rangeEnd)) continue
    const p = t.profit
    if (p == null || !Number.isFinite(p)) continue
    taken++
    netPnl += p
    const outcome = classifyOutcome(p)
    if (outcome === 'won') won++
    else if (outcome === 'lost') lost++
    else breakeven++
  }

  return { hasData: taken > 0, taken, won, lost, breakeven, netPnl }
}

export function summarizeDayFromMtTrades(
  trades: MtTrade[],
  rangeStart: Date,
  rangeEnd: Date,
): DayTradeSummary {
  let taken = 0
  let won = 0
  let lost = 0
  let breakeven = 0
  let netPnl = 0

  for (const t of trades) {
    if (t.status !== 'closed') continue
    if (
      !isTradeableClosedRow({
        status: t.status,
        symbol: t.symbol,
        lot_size: t.lot_size,
        direction: t.direction,
        type: t.type,
      })
    ) {
      continue
    }
    const closeIso = t.closed_at ?? t.opened_at
    if (!closeIso || !isMtTimestampInRange(closeIso, rangeStart, rangeEnd)) continue
    const p = displayTradeProfit(t)
    if (p == null || !Number.isFinite(p)) continue
    taken++
    netPnl += p
    const outcome = classifyOutcome(p)
    if (outcome === 'won') won++
    else if (outcome === 'lost') lost++
    else breakeven++
  }

  return { hasData: taken > 0, taken, won, lost, breakeven, netPnl }
}

export function summarizeTodayFromChartTrades(
  trades: DashboardChartTrade[],
  now = new Date(),
): DayTradeSummary {
  const { todayStart, tomorrowStart } = getLocalCalendarDayBounds(now)
  return summarizeDayFromChartTrades(trades, todayStart, tomorrowStart)
}

export function summarizeYesterdayFromChartTrades(
  trades: DashboardChartTrade[],
  now = new Date(),
): DayTradeSummary {
  const { todayStart, yesterdayStart } = getLocalCalendarDayBounds(now)
  return summarizeDayFromChartTrades(trades, yesterdayStart, todayStart)
}

export function summarizeTodayFromMtTrades(trades: MtTrade[], now = new Date()): DayTradeSummary {
  const { todayStart, tomorrowStart } = getLocalCalendarDayBounds(now)
  return summarizeDayFromMtTrades(trades, todayStart, tomorrowStart)
}

export function summarizeYesterdayFromMtTrades(trades: MtTrade[], now = new Date()): DayTradeSummary {
  const { todayStart, yesterdayStart } = getLocalCalendarDayBounds(now)
  return summarizeDayFromMtTrades(trades, yesterdayStart, todayStart)
}
