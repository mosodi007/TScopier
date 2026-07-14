import { ScrollView, Text, View } from 'react-native'
import { FlaskConical } from 'lucide-react-native'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, Card, MutedText } from '@/components/ui'
import { openWebAppPath } from '@/lib/openWebApp'

export default function BacktestScreen() {
  return (
    <AppScreen title="Backtest" subtitle="Test signal strategies on historical data">
      <ScrollView contentContainerClassName="gap-4 pb-24" showsVerticalScrollIndicator={false}>
        <Card className="items-center py-8">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/50">
            <FlaskConical size={28} color="#0d9488" />
          </View>
          <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Run backtests in the web app
          </Text>
          <MutedText className="mt-2 px-4 text-center text-sm">
            Backtest uses the full web interface for channel selection, date ranges, and detailed results.
          </MutedText>
          <Button
            label="Open backtest"
            className="mt-6 w-full"
            onPress={() => void openWebAppPath('/backtest')}
          />
        </Card>
      </ScrollView>
    </AppScreen>
  )
}
