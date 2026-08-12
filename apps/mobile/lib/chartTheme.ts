import type { ThemeMode } from '@/lib/tscTheme'

export const LOSS_CHART_COLOR = '#737373'

export interface ChartThemeColors {
  grid: string
  axis: string
  tick: string
  barProfit: string
  barLoss: string
  signedPnlProfit: string
  signedPnlLoss: string
}

export function chartThemeColors(theme: ThemeMode): ChartThemeColors {
  if (theme === 'dark') {
    return {
      grid: '#262626',
      axis: '#404040',
      tick: '#a3a3a3',
      barProfit: '#0d9488',
      barLoss: LOSS_CHART_COLOR,
      signedPnlProfit: '#0d9488',
      signedPnlLoss: LOSS_CHART_COLOR,
    }
  }
  return {
    grid: '#f5f5f5',
    axis: '#e5e5e5',
    tick: '#737373',
    barProfit: '#0d9488',
    barLoss: LOSS_CHART_COLOR,
    signedPnlProfit: '#0d9488',
    signedPnlLoss: LOSS_CHART_COLOR,
  }
}
