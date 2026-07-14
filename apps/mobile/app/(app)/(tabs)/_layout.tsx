import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/context/ThemeContext'
import { TabBarNavIcon } from '@/components/navigation/TabBarNavIcon'
import { TAB_NAV_META } from '@/lib/navigation'
import { tscTheme } from '@/lib/tscTheme'

const TAB_SCREENS = [
  'dashboard',
  'brokers',
  'trades',
  'channels',
  'backtest',
  'more',
] as const

export default function TabLayout() {
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 10)

  const tabBarStyle = {
    backgroundColor: isDark ? tscTheme.tabBar.dark : tscTheme.tabBar.light,
    borderTopColor: isDark ? tscTheme.tabBarBorder.dark : tscTheme.tabBarBorder.light,
    paddingTop: 6,
    paddingBottom: bottomPad,
    height: 56 + bottomPad + 3,
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: isDark ? tscTheme.primaryMuted.dark : tscTheme.primary,
        tabBarInactiveTintColor: tscTheme.textMuted.light,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        tabBarAllowFontScaling: false,
      }}
    >
      {TAB_SCREENS.map(name => {
        const meta = TAB_NAV_META[name]
        const Icon = meta.icon
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: meta.label,
              tabBarIcon: ({ color, size, focused }) => (
                <TabBarNavIcon icon={Icon} focused={focused} color={color} size={size} />
              ),
            }}
          />
        )
      })}
    </Tabs>
  )
}
