/** Currency formatting aligned with web dashboard. */

export function formatMoney(amount: number, currency = 'USD'): string {
  if (!Number.isFinite(amount)) return '—'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function formatSignedMoney(amount: number, currency = 'USD'): string {
  if (!Number.isFinite(amount)) return '—'
  const formatted = formatMoney(Math.abs(amount), currency)
  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

export function formatVsYesterdayDelta(today: number, yesterday: number): string {
  const delta = today - yesterday
  if (!Number.isFinite(delta) || delta === 0) return 'Same as yesterday'
  const sign = delta > 0 ? '+' : '−'
  return `${sign}${Math.abs(delta).toFixed(2)} vs yesterday`
}
