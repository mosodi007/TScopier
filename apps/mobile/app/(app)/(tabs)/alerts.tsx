import { FlatList, Pressable, Text, View } from 'react-native'
import { useNotifications } from '@/context/NotificationsContext'
import { Card, Screen, Subtitle, Title, Button } from '@/components/ui'

export default function AlertsScreen() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications()

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <View>
          <Title>Alerts</Title>
          <Subtitle>{unreadCount} unread notifications</Subtitle>
        </View>
        {notifications.length > 0 ? (
          <Button label="Mark all read" variant="secondary" onPress={markAllRead} className="px-3 py-2" />
        ) : null}
      </View>

      <FlatList
        className="mt-4"
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerClassName="gap-3 pb-24"
        ListEmptyComponent={
          <Card>
            <Text className="text-neutral-300">No copier notifications yet.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => void markRead(item.id)}>
            <Card className={item.read ? 'opacity-70' : ''}>
              <Text className="font-semibold text-white">{item.title}</Text>
              <Text className="mt-1 text-sm text-neutral-300">{item.body}</Text>
              <Text className="mt-2 text-xs text-neutral-500">{new Date(item.createdAt).toLocaleString()}</Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  )
}
