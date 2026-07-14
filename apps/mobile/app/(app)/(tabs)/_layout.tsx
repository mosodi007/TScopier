import { Tabs } from 'expo-router'
import { useNotifications } from '@/context/NotificationsContext'
import { useTheme } from '@/context/ThemeContext'
import { TAB_NAV_META } from '@/lib/navigation'
import { tscTheme } from '@/lib/tscTheme'

export default function TabLayout() {
  const { unreadCount } = useNotifications()
  const { isDark } = useTheme()

  const tabBarStyle = {
    backgroundColor: isDark ? tscTheme.tabBar.dark : tscTheme.tabBar.light,
    borderTopColor: isDark ? tscTheme.tabBarBorder.dark : tscTheme.tabBarBorder.light,
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: isDark ? tscTheme.primaryMuted.dark : tscTheme.primaryMuted.light,
        tabBarInactiveTintColor: tscTheme.textMuted.light,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: TAB_NAV_META.dashboard.label,
          tabBarIcon: ({ color, size }) => {
            const Icon = TAB_NAV_META.dashboard.icon
            return <Icon color={color} size={size} />
          },
        }}
      />
      <Tabs.Screen
        name="brokers"
        options={{
          title: TAB_NAV_META.brokers.label,
          tabBarIcon: ({ color, size }) => {
            const Icon = TAB_NAV_META.brokers.icon
            return <Icon color={color} size={size} />
          },
        }}
      />
      <Tabs.Screen
        name="trades"
        options={{
          title: TAB_NAV_META.trades.label,
          tabBarIcon: ({ color, size }) => {
            const Icon = TAB_NAV_META.trades.icon
            return <Icon color={color} size={size} />
          },
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: TAB_NAV_META.alerts.label,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => {
            const Icon = TAB_NAV_META.alerts.icon
            return <Icon color={color} size={size} />
          },
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: TAB_NAV_META.more.label,
          tabBarIcon: ({ color, size }) => {
            const Icon = TAB_NAV_META.more.icon
            return <Icon color={color} size={size} />
          },
        }}
      />
    </Tabs>
  )
}
