import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import {
  CreditCard,
  LogOut,
  Settings,
  Share2,
  X,
} from 'lucide-react-native'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useUserProfile } from '@/hooks/useUserProfile'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { resolveDisplayName } from '@/lib/userAvatar'
import { openWebAppPath } from '@/lib/openWebApp'

interface ProfileMenuModalProps {
  visible: boolean
  onClose: () => void
}

function MenuRow({
  label,
  icon: Icon,
  onPress,
  destructive,
}: {
  label: string
  icon: typeof Settings
  onPress: () => void
  destructive?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-neutral-100 dark:active:bg-neutral-800"
    >
      <Icon size={18} color={destructive ? '#F07070' : '#0d9488'} />
      <Text
        className={
          destructive
            ? 'text-base font-medium text-error-600'
            : 'text-base font-medium text-neutral-900 dark:text-neutral-50'
        }
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function ProfileMenuModal({ visible, onClose }: ProfileMenuModalProps) {
  const { user, signOut } = useAuth()
  const { subscription } = useSubscription()
  const { profile } = useUserProfile()

  const displayName = resolveDisplayName(profile, user?.email)
  const planLabel = subscription?.plan ? `${subscription.plan} plan` : 'Free plan'

  const go = (href: string) => {
    onClose()
    router.push(href as never)
  }

  const goWeb = async (path: string) => {
    onClose()
    await openWebAppPath(path)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className="max-h-[85%] rounded-t-3xl bg-white dark:bg-neutral-900"
          onPress={e => e.stopPropagation()}
        >
          <View className="flex-row items-center justify-between border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
            <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Account</Text>
            <Pressable onPress={onClose} className="rounded-full p-2">
              <X size={20} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="px-4 pb-8 pt-4">
            <View className="mb-4 flex-row items-center gap-3">
              <UserAvatar user={user} profile={profile} email={user?.email} size="md" />
              <View className="min-w-0 flex-1">
                <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                  {displayName}
                </Text>
                <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
                  {user?.email}
                </Text>
                <Text className="mt-0.5 text-xs capitalize text-teal-600 dark:text-teal-400">{planLabel}</Text>
              </View>
            </View>

            <MenuRow label="Profile & Settings" icon={Settings} onPress={() => go('/(app)/settings')} />
            <MenuRow label="Subscription & Billing" icon={CreditCard} onPress={() => go('/(app)/billing')} />
            <MenuRow
              label="Affiliate Program"
              icon={Share2}
              onPress={() => void goWeb('/affiliate-program')}
            />
            <View className="my-2 border-t border-neutral-200 dark:border-neutral-800" />
            <MenuRow
              label="Sign out"
              icon={LogOut}
              destructive
              onPress={() => {
                onClose()
                void signOut()
              }}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
