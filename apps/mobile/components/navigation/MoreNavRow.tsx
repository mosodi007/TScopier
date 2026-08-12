import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import { ChevronRight } from 'lucide-react-native'
import type { MobileNavItem, MobileNavTarget } from '@/lib/navigation'
import { openWebAppPath } from '@/lib/openWebApp'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'

async function navigateTarget(target: MobileNavTarget) {
  if (target.kind === 'tab' || target.kind === 'stack') {
    // navigate avoids stacking duplicate tab/stack entries (push felt laggy).
    router.navigate(target.href as never)
    return
  }
  if (target.kind === 'web') {
    await openWebAppPath(target.path)
    return
  }
  const WebBrowser = await import('expo-web-browser')
  await WebBrowser.openBrowserAsync(target.url)
}

export function MoreNavRow({
  item,
  isLast = false,
}: {
  item: MobileNavItem
  isLast?: boolean
}) {
  const Icon = item.icon

  return (
    <Pressable
      onPress={() => void navigateTarget(item.target)}
      className={cn(
        'flex-row items-center px-4 py-3.5 active:bg-neutral-50 dark:active:bg-neutral-800/80',
        !isLast && 'border-b border-neutral-100 dark:border-neutral-800',
      )}
    >
      <View
        style={{ width: 36, height: 36 }}
        className="mr-3 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/50"
      >
        <Icon size={18} color="#0d9488" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">{item.label}</Text>
        {item.description ? (
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color="#94a3b8" style={{ marginLeft: 8 }} />
    </Pressable>
  )
}

export function MoreSection({
  title,
  items,
}: {
  title: string
  items: MobileNavItem[]
}) {
  if (items.length === 0) return null

  return (
    <View className="mb-5">
      <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </Text>
      <Card className="overflow-hidden p-0">
        {items.map((item, index) => (
          <MoreNavRow key={item.id} item={item} isLast={index === items.length - 1} />
        ))}
      </Card>
    </View>
  )
}

export function MoreNavIcon({ icon: Icon, active }: { icon: LucideIcon; active?: boolean }) {
  return (
    <View className={cn('rounded-lg p-1', active && 'bg-teal-50 dark:bg-teal-950/40')}>
      <Icon size={22} color={active ? '#0d9488' : '#64748b'} />
    </View>
  )
}
