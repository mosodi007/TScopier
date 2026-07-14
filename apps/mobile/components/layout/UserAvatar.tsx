import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import { resolveUserAvatarUrl, userInitials, type UserInitialsSource } from '@/lib/userAvatar'
import { cn } from '@/lib/cn'

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
} as const

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
} as const

interface UserAvatarProps {
  user: User | null | undefined
  profile: UserInitialsSource
  email?: string | null
  size?: keyof typeof sizeClasses
  className?: string
}

export function UserAvatar({ user, profile, email, size = 'sm', className }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const avatarUrl = resolveUserAvatarUrl(user)
  const initials = userInitials(profile, email)
  const showImage = Boolean(avatarUrl && !imageFailed)

  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full bg-teal-600',
        sizeClasses[size],
        className,
      )}
    >
      {showImage ? (
        <Image
          source={{ uri: avatarUrl! }}
          className="h-full w-full"
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
      className="rounded-full active:opacity-80"
      accessibilityLabel="Open profile menu"
    >
      <UserAvatar user={user} profile={profile} email={user?.email} size="sm" />
    </Pressable>
  )
}
