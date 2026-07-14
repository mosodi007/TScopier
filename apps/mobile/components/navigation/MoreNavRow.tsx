import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import { ChevronRight } from 'lucide-react-native'
import type { MobileNavItem, MobileNavTarget } from '@/lib/navigation'
import { openWebAppPath } from '@/lib/openWebApp'
import { cn } from '@/lib/cn'

async function navigateTarget(target: MobileNavTarget) {
  if (target.kind === 'tab' || target.kind === 'stack') {
    router.push(target.href as never)
    return
  }
  if (target.kind === 'web') {
    await openWebAppPath(target.path)
    return
  }
  const WebBrowser = await import('expo-web-browser')
  await WebBrowser.openBrowserAsync(target.url)
}

export function MoreNavRow({ item }: { item: MobileNavItem }) {
  const Icon = item.icon
  return (
    <Pressable
      onPress={() => void navigateTarget(item.target)}
      className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 active:opacity-90 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/50">
        <Icon size={18} color="#0d9488" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">{item.label}</Text>
        {item.description ? (
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color="#94a3b8" />
    </Pressable>
  )
}

export function MoreSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </Text>
      <View className="gap-2">{children}</View>
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
