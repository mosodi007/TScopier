import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native'
import { router } from 'expo-router'
import { Bell } from 'lucide-react-native'

import { useNotifications } from '@/context/NotificationsContext'

const BUTTON_SIZE = 36
const ICON_SIZE = 20

export function NotificationBellButton() {
  const { unreadCount } = useNotifications()
  const badge = unreadCount > 9 ? '9+' : unreadCount > 0 ? String(unreadCount) : null

  const buttonStyle: ViewStyle = {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  }

  const badgeStyle: ViewStyle = {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d9488',
  }

  const badgeTextStyle: TextStyle = {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 12,
  }

  return (
    <Pressable
      onPress={() => router.push('/(app)/alerts')}
      hitSlop={6}
      style={buttonStyle}
      className="rounded-full active:opacity-70"
      accessibilityLabel="Notifications"
    >
      <Bell size={ICON_SIZE} color="#64748b" strokeWidth={2} />
      {badge ? (
        <View style={badgeStyle}>
          <Text style={badgeTextStyle}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}
