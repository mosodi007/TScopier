import { View } from 'react-native'
import { AppHeaderActions } from '@/components/layout/AppHeaderActions'
import { Screen, Subtitle, Title } from '@/components/ui'
import { cn } from '@/lib/cn'

interface AppScreenProps {
  title?: React.ReactNode
  subtitle?: string
  children: React.ReactNode
  /** Hide top header actions (e.g. auth screens). */
  hideHeaderActions?: boolean
  className?: string
  noPadding?: boolean
}

export function AppScreen({
  title,
  subtitle,
  children,
  hideHeaderActions = false,
  className,
  noPadding = false,
}: AppScreenProps) {
  const hasHeader = Boolean(title || subtitle || !hideHeaderActions)

  return (
    <Screen className={cn(noPadding && 'px-0', className)}>
      {hasHeader ? (
        <View className={cn('mb-3 flex-row items-center justify-between gap-3', noPadding && 'px-4')}>
          <View className="min-w-0 flex-1">
            {title != null
              ? typeof title === 'string'
                ? <Title>{title}</Title>
                : title
              : null}
            {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
          </View>
          {!hideHeaderActions ? <AppHeaderActions /> : null}
        </View>
      ) : null}

      <View className={cn('flex-1', noPadding && 'px-4')}>{children}</View>
    </Screen>
  )
}
