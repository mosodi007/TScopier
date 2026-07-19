import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TscopierLogo } from '@/components/branding/TscopierLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/cn'

interface AuthScreenProps {
  children: React.ReactNode
  className?: string
}

/** Web-parity auth shell: logo + theme toggle, centered form, copyright footer. */
export function AuthScreen({ children, className }: AuthScreenProps) {
  const year = new Date().getFullYear()

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      className="flex-1 bg-white dark:bg-neutral-950"
    >
      <View className="flex-row items-center justify-between px-5 pb-2 pt-1 sm:px-8">
        <TscopierLogo height={28} />
        <ThemeToggle size={18} />
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName={cn(
          'flex-grow justify-center px-5 pb-8 pt-4 sm:px-8',
          className,
        )}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[420px]">{children}</View>
      </ScrollView>

      <View className="px-5 pb-2 sm:px-8">
        <Text className="text-xs text-neutral-400 dark:text-neutral-500">
          {`© ${year} Tartarix Inc.`}
        </Text>
      </View>
    </SafeAreaView>
  )
}
