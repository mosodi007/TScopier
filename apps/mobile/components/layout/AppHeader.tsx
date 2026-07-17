import { Text, View, type ViewStyle } from 'react-native'
import { AppHeaderActions } from '@/components/layout/AppHeaderActions'
import { cn } from '@/lib/cn'

/** Shared header row height so logo / title / actions align across screens. */
export const APP_HEADER_MIN_HEIGHT = 44

interface AppHeaderProps {
  title?: React.ReactNode
  subtitle?: string
  /** Optional leading control (e.g. back button). */
  leading?: React.ReactNode
  /** Optional control before avatar/bell (e.g. Channels +). */
  trailing?: React.ReactNode
  showActions?: boolean
  className?: string
}

const rowStyle: ViewStyle = {
  minHeight: APP_HEADER_MIN_HEIGHT,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
}

const actionsClusterStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  flexShrink: 0,
  gap: 10,
}

/**
 * Consistent top bar: title left, optional trailing + avatar/bell right,
 * with stable vertical alignment and space-between.
 */
export function AppHeader({
  title,
  subtitle,
  leading,
  trailing,
  showActions = true,
  className,
}: AppHeaderProps) {
  return (
    <View style={rowStyle} className={cn('mb-3', className)}>
      <View className="min-w-0 flex-1 flex-row items-center gap-1 pr-4">
        {leading ? <View className="shrink-0">{leading}</View> : null}
        <View className="min-w-0 flex-1 justify-center">
          {title != null
            ? typeof title === 'string'
              ? (
                <Text
                  numberOfLines={1}
                  className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50 font-sans"
                >
                  {title}
                </Text>
              )
              : title
            : null}
          {subtitle ? (
            <Text
              numberOfLines={2}
              className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 font-sans"
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={actionsClusterStyle}>
        {trailing ? <View className="shrink-0">{trailing}</View> : null}
        {showActions ? <AppHeaderActions /> : null}
      </View>
    </View>
  )
}
