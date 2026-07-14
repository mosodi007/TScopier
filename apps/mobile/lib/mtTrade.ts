/** MT deal row from FxSocket edge `trades` action. */
export interface MtTrade {
  id: string
  broker_id: string
  broker_label: string
  broker_name: string | null
  ticket: number
  position_ticket?: number | null
  symbol: string
  direction: 'buy' | 'sell' | ''
  type: string
  lot_size: number
  entry_price: number | null
  sl: number | null
  tp: number | null
  close_price: number | null
  profit: number | null
  swap: number | null
  commission: number | null
  comment: string | null
  magic: number | null
  opened_at: string | null
  closed_at: string | null
  state: string | null
  status: 'open' | 'closed'
}

/** Prefer deal profit; if API returned 0 with swap/commission, show net realized P/L. */
export function displayTradeProfit(trade: MtTrade): number | null {
  const p = trade.profit
  if (p == null || !Number.isFinite(p)) return null
  if (p !== 0 || trade.status !== 'closed') return p
  const swap = typeof trade.swap === 'number' && Number.isFinite(trade.swap) ? trade.swap : 0
  const commission =
    typeof trade.commission === 'number' && Number.isFinite(trade.commission) ? trade.commission : 0
  const net = p + swap + commission
  return net !== 0 ? net : p
}
