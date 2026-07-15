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
import { tradeVolumeIsEmpty, type TradeVolumeDay } from '@/lib/dashboardCharts'

const CHART_HEIGHT = DEFAULT_CHART_HEIGHT / 2
const PADDING = { top: 8, right: 12, left: 56, bottom: 28 }

interface TradeVolumeChartProps {
  data: TradeVolumeDay[]
  loading?: boolean
}

function formatAxisMoney(value: number): string {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return formatMoney(value)
}

function truncateLabel(label: string): string {
  const parts = label.split(' ')
  if (parts.length >= 2) return `${parts[0]?.slice(0, 3)} ${parts[1]}`
  return label.slice(0, 8)
}

export function TradeVolumeChart({ data, loading }: TradeVolumeChartProps) {
  const { theme } = useTheme()
  const colors = chartThemeColors(theme)
  const width = useChartWidth()

  const chart = useMemo(() => {
    if (data.length === 0) return null

    const innerWidth = width - PADDING.left - PADDING.right
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
    const maxValue = Math.max(...data.flatMap(d => [d.profit, d.loss]), 1)
    const yTicks = [0, maxValue * 0.5, maxValue]
    const groupWidth = innerWidth / data.length
    const barGap = 4
    const maxBarWidth = 20
    const barWidth = Math.min(maxBarWidth, (groupWidth - barGap) / 2)

    const yScale = (value: number) => PADDING.top + innerHeight - (value / maxValue) * innerHeight

    const elements: React.ReactNode[] = []

    for (let i = 0; i <= 4; i++) {
      const y = PADDING.top + (innerHeight / 4) * i
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

    yTicks.forEach((tick, index) => {
      const y = yScale(tick)
      elements.push(
        <SvgText
          key={`ytick-${index}`}
          x={PADDING.left - 8}
          y={y + 4}
          fontSize={10}
          fill={colors.tick}
          textAnchor="end"
        >
          {formatAxisMoney(tick)}
        </SvgText>,
      )
    })

    data.forEach((day, index) => {
      const centerX = PADDING.left + groupWidth * index + groupWidth / 2
      const lossX = centerX - barWidth - barGap / 2
      const profitX = centerX + barGap / 2
      const lossHeight = (day.loss / maxValue) * innerHeight
      const profitHeight = (day.profit / maxValue) * innerHeight
      const baseY = PADDING.top + innerHeight

      if (lossHeight > 0) {
        elements.push(
          <Rect
            key={`loss-${day.key}`}
            x={lossX}
            y={baseY - lossHeight}
            width={barWidth}
            height={lossHeight}
            rx={4}
            fill={colors.barLoss}
          />,
        )
      }

      if (profitHeight > 0) {
        elements.push(
          <Rect
            key={`profit-${day.key}`}
            x={profitX}
            y={baseY - profitHeight}
            width={barWidth}
            height={profitHeight}
            rx={4}
            fill={colors.barProfit}
          />,
        )
      }

      elements.push(
        <SvgText
          key={`xlabel-${day.key}`}
          x={centerX}
          y={CHART_HEIGHT - 10}
          fontSize={9}
          fill={colors.tick}
          textAnchor="middle"
        >
          {truncateLabel(day.label)}
        </SvgText>,
      )
    })

    elements.push(
      <Line
        key="axis-x"
        x1={PADDING.left}
        y1={PADDING.top + innerHeight}
        x2={width - PADDING.right}
        y2={PADDING.top + innerHeight}
        stroke={colors.axis}
      />,
    )

    return elements
  }, [colors, data, width])

  const empty = !loading && tradeVolumeIsEmpty(data)

  return (
    <ChartCard>
      <View className="mb-4">
        <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Trade Outcome (7 days)
        </Text>
        <MutedText className="mt-0.5 text-xs">
          Daily P/L from copier trades since your broker connected
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
        <>
          <ChartPlot height={CHART_HEIGHT}>
            <Svg width={width} height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`}>
              {chart}
            </Svg>
          </ChartPlot>
          <View className="mt-2 flex-row items-center justify-center gap-4">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors.barLoss }} />
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">Loss</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors.barProfit }} />
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">Profit</Text>
            </View>
          </View>
        </>
      )}
    </ChartCard>
  )
}
