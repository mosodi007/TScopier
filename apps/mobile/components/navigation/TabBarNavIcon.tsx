import { View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'

interface TabBarNavIconProps {
  icon: LucideIcon
  color: string
  size: number
}

export function TabBarNavIcon({ icon: Icon, color, size }: TabBarNavIconProps) {
  return (
    <View className="items-center justify-center">
      <Icon size={size} color={color} />
    </View>
  )
}
