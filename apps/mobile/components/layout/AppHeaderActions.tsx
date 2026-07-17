import { useState } from 'react'
import { View, type ViewStyle } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { NotificationBellButton } from '@/components/layout/NotificationBellButton'
import { ProfileMenuModal } from '@/components/layout/ProfileMenuModal'
import { ProfileMenuTrigger } from '@/components/layout/UserAvatar'
import { useUserProfile } from '@/hooks/useUserProfile'

interface AppHeaderActionsProps {
  onMenuOpen?: () => void
}

/** Fixed action cluster — same size/spacing on every screen. */
const rowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 14,
  height: 40,
  flexShrink: 0,
}

export function AppHeaderActions({ onMenuOpen }: AppHeaderActionsProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [menuOpen, setMenuOpen] = useState(false)

  const openMenu = () => {
    onMenuOpen?.()
    setMenuOpen(true)
  }

  return (
    <>
      <View style={rowStyle} accessibilityRole="toolbar">
        <NotificationBellButton />
        <ProfileMenuTrigger user={user} profile={profile} onPress={openMenu} />
      </View>
      <ProfileMenuModal visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
