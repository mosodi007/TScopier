import { ScrollView, View } from 'react-native'
import { MOBILE_MORE_SECTIONS } from '@/lib/navigation'
import { AppScreen } from '@/components/layout/AppScreen'
import { MoreSection } from '@/components/navigation/MoreNavRow'

export default function MoreScreen() {
  return (
    <AppScreen pageTitle="More">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {MOBILE_MORE_SECTIONS.map(section => (
          <MoreSection key={section.id} title={section.title} items={section.items} />
        ))}

        <View className="h-4" />
      </ScrollView>
    </AppScreen>
  )
}
