import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useState } from 'react'
import { ProfileMenuModal } from '@/components/layout/ProfileMenuModal'
import { ProfileMenuTrigger } from '@/components/layout/UserAvatar'
import { Screen, Subtitle, Title } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useUserProfile } from '@/hooks/useUserProfile'

interface StackScreenProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  showProfile?: boolean
}

export function StackScreen({ title, subtitle, children, showProfile = true }: StackScreenProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <Screen>
      <View className="mb-2 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="-ml-2 flex-row items-center gap-1 rounded-lg px-2 py-2 active:opacity-70"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#0d9488" />
        </Pressable>
        {showProfile ? (
          <ProfileMenuTrigger user={user} profile={profile} onPress={() => setMenuOpen(true)} />
        ) : (
          <View className="w-9" />
        )}
      </View>

      <Title>{title}</Title>
      {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
      {children}

      <ProfileMenuModal visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  )
}
