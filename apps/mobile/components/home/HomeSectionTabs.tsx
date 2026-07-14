import { Pressable, Text, View } from 'react-native'
import { Landmark, LayoutDashboard, Radio, type LucideIcon } from 'lucide-react-native'
import { useTheme } from '@/context/ThemeContext'
import { tscTheme } from '@/lib/tscTheme'

export type HomeSectionTab = 'dashboard' | 'brokers' | 'channels'

const TABS: Array<{ id: HomeSectionTab; label: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'brokers', label: 'Brokers', icon: Landmark },
  { id: 'channels', label: 'Channels', icon: Radio },
]

interface HomeSectionTabsProps {
  value: HomeSectionTab
  onChange: (tab: HomeSectionTab) => void
}

export function HomeSectionTabs({ value, onChange }: HomeSectionTabsProps) {
  const { isDark } = useTheme()
  const activeColor = isDark ? tscTheme.primaryMuted.dark : tscTheme.primary
  const inactiveColor = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light
  const surfaceColor = isDark ? tscTheme.surface.dark : '#ffffff'
  const borderColor = isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(226, 232, 240, 0.95)'
  const highlightColor = isDark ? 'rgba(4, 47, 46, 0.55)' : '#f0fdfa'

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor,
        backgroundColor: surfaceColor,
        padding: 4,
      }}
    >
      {TABS.map(tab => {
        const focused = value === tab.id
        const color = focused ? activeColor : inactiveColor
        const Icon = tab.icon

        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              paddingHorizontal: focused ? 10 : 6,
              paddingVertical: 7,
              backgroundColor: focused ? highlightColor : 'transparent',
            }}
          >
            <Icon size={17} color={color} strokeWidth={focused ? 2.25 : 2} />
            <Text
              numberOfLines={1}
              style={{
                marginTop: 3,
                fontSize: 10,
                fontWeight: focused ? '700' : '600',
                color,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
