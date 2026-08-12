import { useCallback, useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { ManageSignalRowCard } from '@/components/signals/ManageSignalRowCard'
import { AppScreen } from '@/components/layout/AppScreen'
import { BodyText, Card, MutedText } from '@/components/ui'
import {
  applySignalDatePreset,
  detectSignalDatePreset,
  useManageSignals,
  type ManageSignalRow,
  type SignalDatePreset,
} from '@/hooks/useManageSignals'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'

const PRESET_OPTIONS: Array<{ id: Exclude<SignalDatePreset, 'custom'>; label: string }> = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
]

function StatCell({
  label,
  value,
  borderRight,
  borderBottom,
}: {
  label: string
  value: number
  borderRight?: boolean
  borderBottom?: boolean
}) {
  return (
    <View
      className={cn(
        'w-1/2 px-4 py-4',
        borderRight && 'border-r border-neutral-100 dark:border-neutral-800',
        borderBottom && 'border-b border-neutral-100 dark:border-neutral-800',
      )}
    >
      <Text className="mb-1.5 text-xs text-neutral-400">{label}</Text>
      <Text className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">{value}</Text>
    </View>
  )
}

function FilterSelect({
  value,
  onPress,
}: {
  value: string
  onPress: () => void
}) {
  const { isDark } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <Text className="flex-1 text-sm text-neutral-700 dark:text-neutral-300" numberOfLines={1}>
        {value}
      </Text>
      <ChevronDown size={16} color={isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light} />
    </Pressable>
  )
}

function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  options: Array<{ id: string; label: string }>
  selected: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className="max-h-[55%] rounded-t-3xl bg-white p-4 dark:bg-neutral-900"
          onPress={e => e.stopPropagation()}
        >
          <Text className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {title}
          </Text>
          <FlatList
            data={options}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const active = selected === item.id
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.id)
                    onClose()
                  }}
                  className={cn(
                    'rounded-xl px-3 py-3',
                    active ? 'bg-teal-50 dark:bg-teal-950/50' : 'bg-transparent',
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm',
                      active
                        ? 'font-semibold text-teal-700 dark:text-teal-400'
                        : 'text-neutral-700 dark:text-neutral-300',
                    )}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export default function SignalsScreen() {
  const { user } = useAuth()
  const [channelFilter, setChannelFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [channelPickerOpen, setChannelPickerOpen] = useState(false)
  const [presetPickerOpen, setPresetPickerOpen] = useState(false)

  const { rows, channels, stats, loading, refreshing, error, refresh } = useManageSignals(user?.id, {
    channelFilter,
    dateFrom,
    dateTo,
  })

  const datePreset = useMemo(
    () => detectSignalDatePreset(dateFrom, dateTo),
    [dateFrom, dateTo],
  )

  const channelLabel =
    channelFilter === 'all'
      ? 'All channels'
      : channels.find(ch => ch.id === channelFilter)?.label ?? 'All channels'

  const presetLabel =
    datePreset === 'custom'
      ? 'Custom range'
      : PRESET_OPTIONS.find(option => option.id === datePreset)?.label ?? 'All time'

  const channelOptions = useMemo(
    () => [{ id: 'all', label: 'All channels' }, ...channels.map(ch => ({ id: ch.id, label: ch.label }))],
    [channels],
  )

  const resetFilters = () => {
    setChannelFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const applyPreset = (preset: Exclude<SignalDatePreset, 'custom'>) => {
    const next = applySignalDatePreset(preset)
    setDateFrom(next.dateFrom)
    setDateTo(next.dateTo)
  }

  const renderItem = useCallback(
    ({ item }: { item: ManageSignalRow }) => <ManageSignalRowCard item={item} />,
    [],
  )

  const listHeader = (
    <View className="gap-4 pb-2">
      {error ? <Text className="text-sm text-error-600">{error}</Text> : null}

      <Card className="overflow-hidden p-0">
        <View className="flex-row flex-wrap">
          <StatCell label="Signals today" value={stats.today} borderRight borderBottom />
          <StatCell label="Last 7 days" value={stats.last7d} borderBottom />
          <StatCell label="Last 30 days" value={stats.last30d} borderRight />
          <StatCell label="All time" value={stats.total} />
        </View>
      </Card>

      <Card className="gap-3">
        <FilterSelect value={channelLabel} onPress={() => setChannelPickerOpen(true)} />

        <View>
          <Text className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">From</Text>
          <TextInput
            value={dateFrom}
            onChangeText={setDateFrom}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          />
        </View>

        <View>
          <Text className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">To</Text>
          <TextInput
            value={dateTo}
            onChangeText={setDateTo}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          />
        </View>

        <FilterSelect value={presetLabel} onPress={() => setPresetPickerOpen(true)} />

        <Pressable
          onPress={resetFilters}
          className="items-center rounded-xl bg-teal-600 py-3 active:bg-teal-700"
        >
          <Text className="text-sm font-semibold text-white">Reset filters</Text>
        </Pressable>
      </Card>

      {rows.length === 0 && !loading ? (
        <Card>
          <BodyText>No trade signals for the selected filters.</BodyText>
          <MutedText className="mt-1 text-xs">
            Entries, closes, and SL/TP updates from your Telegram channels appear here.
          </MutedText>
        </Card>
      ) : null}
    </View>
  )

  return (
    <AppScreen pageTitle="Manage Signals">
      <FlatList
        className="mt-2"
        data={rows}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (loading && rows.length === 0)}
            onRefresh={() => void refresh()}
            tintColor={tscTheme.primary}
          />
        }
        contentContainerClassName="pb-24"
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={7}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
      />

      <PickerModal
        visible={channelPickerOpen}
        title="Channel"
        options={channelOptions}
        selected={channelFilter}
        onSelect={setChannelFilter}
        onClose={() => setChannelPickerOpen(false)}
      />
      <PickerModal
        visible={presetPickerOpen}
        title="Time period"
        options={PRESET_OPTIONS}
        selected={datePreset === 'custom' ? 'all' : datePreset}
        onSelect={id => applyPreset(id as Exclude<SignalDatePreset, 'custom'>)}
        onClose={() => setPresetPickerOpen(false)}
      />
    </AppScreen>
  )
}
