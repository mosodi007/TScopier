import { ScrollView, Text, View } from 'react-native'
import { MOBILE_MORE_SECTIONS } from '@/lib/navigation'
import { AppScreen } from '@/components/layout/AppScreen'
import { MoreSection } from '@/components/navigation/MoreNavRow'
import { Card, MutedText } from '@/components/ui'

export default function MoreScreen() {
  return (
    <AppScreen title="More" subtitle="All app sections from the web sidebar">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <Card className="mb-5 bg-teal-50 dark:bg-teal-950/30">
          <Text className="text-sm font-medium text-teal-800 dark:text-teal-200">
            Primary sections are in the tab bar. Alerts are in the bell icon. Web-only pages open in your browser.
          </Text>
          <MutedText className="mt-1 text-xs">
            Tap any item below to navigate.
          </MutedText>
        </Card>

        {MOBILE_MORE_SECTIONS.map(section => (
          <MoreSection key={section.id} title={section.title} items={section.items} />
        ))}

        <View className="h-4" />
      </ScrollView>
    </AppScreen>
  )
}
