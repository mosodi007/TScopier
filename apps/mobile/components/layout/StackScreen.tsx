import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { AppHeader } from '@/components/layout/AppHeader'
import { Screen } from '@/components/ui'

interface StackScreenProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  showHeaderActions?: boolean
}

export function StackScreen({ title, subtitle, children, showHeaderActions = true }: StackScreenProps) {
  return (
    <Screen>
      <AppHeader
        title={title}
        subtitle={subtitle}
        showActions={showHeaderActions}
        leading={
          <Pressable
            onPress={() => router.back()}
            className="-ml-2 rounded-lg p-2 active:opacity-70"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color="#0d9488" />
          </Pressable>
        }
      />
      <View className="flex-1">{children}</View>
    </Screen>
  )
}
