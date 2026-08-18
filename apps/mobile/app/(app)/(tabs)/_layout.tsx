import { Tabs } from 'expo-router'
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar'
import { TAB_NAV_META, TAB_SCREEN_ORDER } from '@/lib/navigation'

/** Channels and Backtest live on the app stack, not as hidden tabs. */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      {TAB_SCREEN_ORDER.map(name => {
        const meta = TAB_NAV_META[name]
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: meta.label,
            }}
          />
        )
      })}
    </Tabs>
  )
}
