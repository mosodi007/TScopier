import { View, type ViewStyle } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useTheme } from '@/context/ThemeContext'

interface TabBarNavIconProps {
  icon: LucideIcon
  focused: boolean
  color: string
  size: number
}

export function TabBarNavIcon({ icon: Icon, focused, color, size }: TabBarNavIconProps) {
  const { isDark } = useTheme()

  const highlightStyle: ViewStyle = focused
    ? {
        backgroundColor: isDark ? 'rgba(4, 47, 46, 0.55)' : '#f0fdfa',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }
    : {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }

  return (
    <View style={highlightStyle} className="items-center justify-center">
      <Icon size={size} color={focused ? '#0d9488' : color} />
    </View>
  )
}
