import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { AppHeaderActions } from '@/components/layout/AppHeaderActions'
import { Screen, Subtitle, Title } from '@/components/ui'

interface StackScreenProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  showHeaderActions?: boolean
}

export function StackScreen({ title, subtitle, children, showHeaderActions = true }: StackScreenProps) {
  return (
    <Screen>
      <View className="mb-3 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="-ml-2 rounded-lg p-2 active:opacity-70"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#0d9488" />
        </Pressable>
        {showHeaderActions ? <AppHeaderActions /> : <View style={{ width: 80, height: 36 }} />}
      </View>

      <Title>{title}</Title>
      {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
      {children}
    </Screen>
  )
}
