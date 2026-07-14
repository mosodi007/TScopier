import { useState } from 'react'
import { View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { ProfileMenuModal } from '@/components/layout/ProfileMenuModal'
import { ProfileMenuTrigger } from '@/components/layout/UserAvatar'
import { Screen, Subtitle, Title } from '@/components/ui'
import { useUserProfile } from '@/hooks/useUserProfile'
import { cn } from '@/lib/cn'

interface AppScreenProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  /** Hide top profile bar (e.g. auth screens). */
  hideProfile?: boolean
  className?: string
  noPadding?: boolean
}

export function AppScreen({
  title,
  subtitle,
  children,
  hideProfile = false,
  className,
  noPadding = false,
}: AppScreenProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <Screen className={cn(noPadding && 'px-0', className)}>
      {!hideProfile ? (
        <View className={cn('mb-1 flex-row items-center justify-end', noPadding && 'px-4')}>
          <ProfileMenuTrigger user={user} profile={profile} onPress={() => setMenuOpen(true)} />
        </View>
      ) : null}

      <View className={cn('flex-1', noPadding && 'px-4')}>
        {title ? <Title>{title}</Title> : null}
        {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
        {children}
      </View>

      <ProfileMenuModal visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  )
}
