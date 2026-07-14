import { useEffect, useState } from 'react'
import { Image, Pressable, Text, View, type ImageStyle, type ViewStyle } from 'react-native'
import type { User } from '@supabase/supabase-js'
import { resolveUserAvatarUrl, userInitials, type UserInitialsSource } from '@/lib/userAvatar'
import { cn } from '@/lib/cn'

const AVATAR_PX = {
  sm: 36,
  md: 44,
} as const

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
} as const

interface UserAvatarProps {
  user: User | null | undefined
  profile: UserInitialsSource
  email?: string | null
  size?: keyof typeof AVATAR_PX
  className?: string
}

export function UserAvatar({ user, profile, email, size = 'sm', className }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const avatarUrl = resolveUserAvatarUrl(user)
  const initials = userInitials(profile, email)
  const dimension = AVATAR_PX[size]
  const showImage = Boolean(avatarUrl && !imageFailed)

  useEffect(() => {
    setImageFailed(false)
  }, [avatarUrl])

  const frameStyle: ViewStyle = { width: dimension, height: dimension }
  const imageStyle: ImageStyle = { width: dimension, height: dimension }

  return (
    <View
      style={frameStyle}
      className={cn('items-center justify-center overflow-hidden rounded-full bg-teal-600', className)}
    >
      {showImage ? (
        <Image
          source={{ uri: avatarUrl! }}
          style={imageStyle}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text className={cn('font-semibold text-white', textSizeClasses[size])}>{initials}</Text>
      )}
    </View>
  )
}

interface ProfileMenuTriggerProps {
  user: User | null | undefined
  profile: UserInitialsSource
  onPress: () => void
}

export function ProfileMenuTrigger({ user, profile, onPress }: ProfileMenuTriggerProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="shrink-0 rounded-full active:opacity-80"
      accessibilityLabel="Open profile menu"
    >
      <UserAvatar user={user} profile={profile} email={user?.email} size="sm" />
    </Pressable>
  )
}
