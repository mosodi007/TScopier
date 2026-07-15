import { useWindowDimensions } from 'react-native'
import { View } from 'react-native'
import { Card } from '@/components/ui'

export const CHART_HEIGHT = 256

/** Screen horizontal padding (16×2) + card padding (16×2). */
const CHART_HORIZONTAL_INSET = 64

export function useChartWidth(): number {
  const { width } = useWindowDimensions()
  return Math.max(width - CHART_HORIZONTAL_INSET, 280)
}

export function ChartSkeleton({ height = CHART_HEIGHT }: { height?: number }) {
  return <View style={{ height }} className="rounded-xl bg-neutral-100 dark:bg-neutral-800/50" />
}

export function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="min-w-0 overflow-hidden p-4">
      {children}
    </Card>
  )
}

export function ChartPlot({
  children,
  height = CHART_HEIGHT,
}: {
  children: React.ReactNode
  height?: number
}) {
  const chartWidth = useChartWidth()
  return (
    <View style={{ width: chartWidth, height, alignSelf: 'center' }}>
      {children}
    </View>
  )
}
