import { ScrollView, Text, View } from 'react-native'
import { MOBILE_MORE_SECTIONS } from '@/lib/navigation'
import { AppScreen } from '@/components/layout/AppScreen'
import { MoreNavRow, MoreSection } from '@/components/navigation/MoreNavRow'
import { Card, MutedText } from '@/components/ui'

export default function MoreScreen() {
  return (
    <AppScreen title="More" subtitle="All app sections from the web sidebar">
      <ScrollView contentContainerClassName="gap-6 pb-24" showsVerticalScrollIndicator={false}>
        <Card className="bg-teal-50 dark:bg-teal-950/30">
          <Text className="text-sm font-medium text-teal-800 dark:text-teal-200">
            Dashboard, Brokers, Trades, and Alerts are in the tab bar. Everything else lives here.
          </Text>
          <MutedText className="mt-1 text-xs">
            Web-only pages open in your browser with your saved login.
          </MutedText>
        </Card>

        {MOBILE_MORE_SECTIONS.map(section => (
          <MoreSection key={section.id} title={section.title}>
            {section.items.map(item => (
              <MoreNavRow key={item.id} item={item} />
            ))}
          </MoreSection>
        ))}

        <View className="h-2" />
      </ScrollView>
    </AppScreen>
  )
}
