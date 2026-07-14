/** Parse FxSocket WebSocket account/positions payloads (mirrors web). */

export interface FxsocketAccountStreamSnapshot {
  balance?: number
  equity?: number
  openPnl?: number
  currency?: string
}

export interface FxsocketPositionsStreamSnapshot {
  openTrades: number
  openPnl?: number
}

function readNum(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

function readStr(v: unknown): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s.length > 0 ? s : undefined
}

function readRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function readProfitField(o: Record<string, unknown>): number | undefined {
  for (const key of [
    'profit', 'Profit',
    'floatingProfit', 'FloatingProfit',
    'open_pnl', 'openPnl', 'OpenPnl',
  ]) {
    const n = readNum(o[key])
    if (n != null) return n
  }
  return undefined
}

export function parseFxsocketAccountStreamData(raw: Record<string, unknown>): FxsocketAccountStreamSnapshot {
  const balance = readNum(raw.balance ?? raw.Balance)
  const equity = readNum(raw.equity ?? raw.Equity)
  const explicitProfit = readProfitField(raw)
  let openPnl: number | undefined
  if (explicitProfit != null) {
    openPnl = explicitProfit
  } else if (balance != null && equity != null) {
    openPnl = equity - balance
  }
  return {
    balance,
    equity: equity ?? balance,
    openPnl,
    currency: readStr(raw.currency ?? raw.Currency),
  }
}

function unwrapPositions(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  const o = readRecord(data)
  if (!o) return []
  for (const key of ['positions', 'Positions', 'orders', 'Orders', 'data', 'Data']) {
    const v = o[key]
    if (Array.isArray(v)) return v
  }
  return []
}

export function parseFxsocketPositionsStreamData(data: unknown): FxsocketPositionsStreamSnapshot {
  const rows = unwrapPositions(data)
  if (rows.length === 0) return { openTrades: 0, openPnl: 0 }

  let openTrades = 0
  let openPnl = 0
  let hasLegPnl = false

  for (const raw of rows) {
    const o = readRecord(raw)
    if (!o) continue
    openTrades += 1
    const profit = readProfitField(o)
    const swap = readNum(o.swap ?? o.Swap) ?? 0
    const commission = readNum(o.commission ?? o.Commission) ?? 0
    if (profit != null) {
      openPnl += profit + swap + commission
      hasLegPnl = true
    }
  }

  return { openTrades, openPnl: hasLegPnl ? openPnl : undefined }
}
