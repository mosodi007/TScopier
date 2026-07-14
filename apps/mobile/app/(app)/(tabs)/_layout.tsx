import { Tabs } from 'expo-router'
import { LayoutDashboard, Bell, Settings, TrendingUp } from 'lucide-react-native'
import { useNotifications } from '@/context/NotificationsContext'
import { useTheme } from '@/context/ThemeContext'
import { tscTheme } from '@/lib/tscTheme'

export default function TabLayout() {
  const { unreadCount } = useNotifications()
  const { isDark } = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? tscTheme.tabBar.dark : tscTheme.tabBar.light,
          borderTopColor: isDark ? tscTheme.tabBarBorder.dark : tscTheme.tabBarBorder.light,
        },
        tabBarActiveTintColor: isDark ? tscTheme.primaryMuted.dark : tscTheme.primaryMuted.light,
        tabBarInactiveTintColor: tscTheme.textMuted.light,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="trades"
        options={{
          title: 'Trades',
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
