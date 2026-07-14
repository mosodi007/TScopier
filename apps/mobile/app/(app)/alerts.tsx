import { FlatList, Pressable, View } from 'react-native'
import { useNotifications } from '@/context/NotificationsContext'
import { StackScreen } from '@/components/layout/StackScreen'
import {
  BodyText,
  Button,
  Card,
  HeadingText,
  MutedText,
} from '@/components/ui'

export default function AlertsScreen() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications()

  return (
    <StackScreen
      title="Alerts"
      subtitle={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
    >
      {notifications.length > 0 ? (
        <View className="mt-2 flex-row justify-end">
          <Button label="Mark all read" variant="secondary" onPress={markAllRead} className="px-3 py-2" />
        </View>
      ) : null}

      <FlatList
        className="mt-4"
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerClassName="gap-3 pb-24"
        ListEmptyComponent={
          <Card>
            <BodyText>No copier notifications yet.</BodyText>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => void markRead(item.id)}>
            <Card className={item.read ? 'opacity-70' : ''}>
              <HeadingText>{item.title}</HeadingText>
              <BodyText className="mt-1 text-sm">{item.body}</BodyText>
              <MutedText className="mt-2 text-xs">{new Date(item.createdAt).toLocaleString()}</MutedText>
            </Card>
          </Pressable>
        )}
      />
    </StackScreen>
  )
}
