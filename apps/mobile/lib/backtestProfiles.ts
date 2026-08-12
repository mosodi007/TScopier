import type { StoredBacktestSignal } from '@/lib/backtestTypes'

export interface SymbolProfileRow {
  symbol: string
  count: number
}

export function buildSymbolProfiles(signals: StoredBacktestSignal[]): SymbolProfileRow[] {
  const counts = new Map<string, number>()
  for (const s of signals) {
    const sym = s.symbol.trim().toUpperCase()
    if (!sym) continue
    counts.set(sym, (counts.get(sym) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count || a.symbol.localeCompare(b.symbol))
}
