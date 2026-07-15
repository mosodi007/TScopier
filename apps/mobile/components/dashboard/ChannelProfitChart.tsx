import { useMemo } from 'react'
import { Text, View } from 'react-native'
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg'
import { useTheme } from '@/context/ThemeContext'
import {
  CHART_HEIGHT as DEFAULT_CHART_HEIGHT,
  ChartCard,
  ChartPlot,
  ChartSkeleton,
  useChartWidth,
} from '@/components/dashboard/chartShared'
import { MutedText } from '@/components/ui'
import { chartThemeColors } from '@/lib/chartTheme'
import { formatMoney } from '@/lib/formatMoney'
import type { ChannelProfitRow } from '@/lib/dashboardCharts'

const CHART_HEIGHT = DEFAULT_CHART_HEIGHT / 2
const PADDING = { top: 4, right: 12, left: 88, bottom: 16 }

interface ChannelProfitChartProps {
  data: ChannelProfitRow[]
  loading?: boolean
}

function truncateChannel(label: string, max = 12): string {
  const trimmed = label.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function formatAxisMoney(value: number): string {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return formatMoney(value)
}

export function ChannelProfitChart({ data, loading }: ChannelProfitChartProps) {
  const { theme } = useTheme()
  const colors = chartThemeColors(theme)
  const width = useChartWidth()

  const rows = data.slice(0, 6)

  const chart = useMemo(() => {
    if (rows.length === 0) return null

    const innerWidth = width - PADDING.left - PADDING.right
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
    const minPnl = Math.min(...rows.map(r => r.pnl), 0)
    const maxPnl = Math.max(...rows.map(r => r.pnl), 0)
    const range = maxPnl - minPnl || 1
    const rowHeight = innerHeight / rows.length
    const barHeight = Math.min(20, rowHeight * 0.55)
    const xScale = (value: number) => PADDING.left + ((value - minPnl) / range) * innerWidth
    const zeroX = xScale(0)

    const elements: React.ReactNode[] = []

    elements.push(
      <Line
        key="zero-line"
        x1={zeroX}
        y1={PADDING.top}
        x2={zeroX}
        y2={PADDING.top + innerHeight}
        stroke={colors.axis}
      />,
    )

    for (let i = 0; i <= rows.length; i++) {
      const y = PADDING.top + (innerHeight / rows.length) * i
      elements.push(
        <Line
          key={`grid-${i}`}
          x1={PADDING.left}
          y1={y}
          x2={width - PADDING.right}
          y2={y}
          stroke={colors.grid}
          strokeDasharray="3 3"
        />,
      )
    }

    ;[minPnl, 0, maxPnl].forEach((tick, index) => {
      elements.push(
        <SvgText
          key={`xtick-${index}`}
          x={xScale(tick)}
          y={CHART_HEIGHT - 4}
          fontSize={9}
          fill={colors.tick}
          textAnchor="middle"
        >
          {formatAxisMoney(tick)}
        </SvgText>,
      )
    })

    rows.forEach((row, index) => {
      const cy = PADDING.top + rowHeight * index + rowHeight / 2
      const x0 = zeroX
      const x1 = xScale(row.pnl)
      const barX = Math.min(x0, x1)
      const barW = Math.abs(x1 - x0)
      const fill = row.pnl >= 0 ? colors.signedPnlProfit : colors.signedPnlLoss

      elements.push(
        <SvgText
          key={`ylabel-${row.key}`}
          x={PADDING.left - 8}
          y={cy + 4}
          fontSize={10}
          fill={colors.tick}
          textAnchor="end"
        >
          {truncateChannel(row.label)}
        </SvgText>,
      )

      if (barW > 0.5) {
        elements.push(
          <Rect
            key={`bar-${row.key}`}
            x={barX}
            y={cy - barHeight / 2}
            width={barW}
            height={barHeight}
            rx={4}
            fill={fill}
          />,
        )
      }
    })

    return elements
  }, [colors, rows, width])

  const empty = !loading && rows.length === 0

  return (
    <ChartCard>
      <View className="mb-4">
        <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Profit by signal channel (7 days)
        </Text>
        <MutedText className="mt-0.5 text-xs">
          Copier trade P/L by Telegram channel since your broker connected
        </MutedText>
      </View>

      {loading ? (
        <ChartSkeleton height={CHART_HEIGHT} />
      ) : empty ? (
        <View style={{ height: CHART_HEIGHT }} className="items-center justify-center px-4">
          <Text className="text-center text-sm text-neutral-400 dark:text-neutral-500">
            No copier-attributed closed trades in the last 7 days
          </Text>
        </View>
      ) : (
        <ChartPlot height={CHART_HEIGHT}>
          <Svg width={width} height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`}>
            {chart}
          </Svg>
        </ChartPlot>
      )}
    </ChartCard>
  )
}
