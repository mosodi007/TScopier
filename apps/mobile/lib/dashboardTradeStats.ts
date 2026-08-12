export function getLocalCalendarDayBounds(ref = new Date()) {
  const todayStart = new Date(ref)
  todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  return { todayStart, tomorrowStart, yesterdayStart }
}

function isTradeableMtRow(row: {
  symbol: string
  lot_size: number
  direction?: string
  type?: string
}): boolean {
  if (!(row.symbol ?? '').trim()) return false
  const type = (row.type ?? '').toLowerCase()
  if (
    type.includes('balance') ||
    type.includes('credit') ||
    type.includes('deposit') ||
    type.includes('withdraw') ||
    type.includes('correction') ||
    type.includes('transfer')
  ) {
    return false
  }
  const dir = (row.direction ?? '').toLowerCase()
  if ((row.lot_size ?? 0) <= 0) return false
  return dir === 'buy' || dir === 'sell'
}

export function isTradeableClosedRow(row: {
  status?: string
  symbol: string
  lot_size: number
  direction?: string
  type?: string
}): boolean {
  if ((row.status ?? 'closed') !== 'closed') return false
  return isTradeableMtRow(row)
}
