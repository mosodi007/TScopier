import { Image, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BodyText, HeadingText } from '@/components/ui'

const logoLight = require('@/assets/images/tscopierlogo.png')

/** Shown when production/EAS build was shipped without EXPO_PUBLIC_* secrets. */
export function MissingConfigScreen({ message }: { message: string }) {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 px-6 dark:bg-neutral-950">
      <View className="flex-1 items-center justify-center gap-4">
        <Image
          source={logoLight}
          accessibilityLabel="TScopier"
          resizeMode="contain"
          style={{ height: 28, width: Math.round(28 * 4.2) }}
        />
        <HeadingText className="text-center text-xl">App configuration incomplete</HeadingText>
        <BodyText className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          {message}
        </BodyText>
        <Text className="mt-2 text-center text-xs text-neutral-400">
          In Expo: Project → Environment variables → add EXPO_PUBLIC_SUPABASE_URL,
          EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_WORKER_URL for the production
          environment, then rebuild.
        </Text>
      </View>
    </SafeAreaView>
  )
}
