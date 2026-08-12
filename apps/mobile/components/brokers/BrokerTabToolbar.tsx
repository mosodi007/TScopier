import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Filter, Search } from 'lucide-react-native'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'

interface BrokerTabToolbarProps {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  brokerFilter: string
  onBrokerFilterChange: (value: string) => void
  brokerFilterOptions: string[]
}

function RoundIconButton({
  onPress,
  active,
  children,
  accessibilityLabel,
}: {
  onPress: () => void
  active?: boolean
  children: React.ReactNode
  accessibilityLabel: string
}) {
  const { isDark } = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: active
          ? isDark
            ? 'rgba(45, 212, 191, 0.45)'
            : 'rgba(13, 148, 136, 0.35)'
          : isDark
            ? 'rgba(148, 163, 184, 0.18)'
            : 'rgba(226, 232, 240, 0.95)',
        backgroundColor: active
          ? isDark
            ? 'rgba(4, 47, 46, 0.55)'
            : '#f0fdfa'
          : isDark
            ? tscTheme.surface.dark
            : '#ffffff',
      }}
    >
      {children}
    </Pressable>
  )
}

export function BrokerTabToolbar({
  searchQuery,
  onSearchQueryChange,
  brokerFilter,
  onBrokerFilterChange,
  brokerFilterOptions,
}: BrokerTabToolbarProps) {
  const { isDark } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftSearch, setDraftSearch] = useState(searchQuery)

  const iconColor = isDark ? tscTheme.textMuted.dark : tscTheme.textMuted.light
  const activeIconColor = isDark ? tscTheme.primaryMuted.dark : tscTheme.primary

  const options = useMemo(() => ['all', ...brokerFilterOptions], [brokerFilterOptions])
  const searchActive = searchQuery.trim().length > 0
  const filterActive = brokerFilter !== 'all'

  const openSearch = () => {
    setDraftSearch(searchQuery)
    setSearchOpen(true)
  }

  const applySearch = () => {
    onSearchQueryChange(draftSearch)
    setSearchOpen(false)
  }

  return (
    <>
      <View className="flex-row items-center justify-end gap-2">
        <RoundIconButton
          accessibilityLabel="Search accounts"
          onPress={openSearch}
          active={searchActive}
        >
          <Search size={18} color={searchActive ? activeIconColor : iconColor} strokeWidth={2} />
        </RoundIconButton>

        <RoundIconButton
          accessibilityLabel="Filter by broker"
          onPress={() => setFilterOpen(true)}
          active={filterActive}
        >
          <Filter size={18} color={filterActive ? activeIconColor : iconColor} strokeWidth={2} />
        </RoundIconButton>
      </View>

      <Modal visible={searchOpen} transparent animationType="fade" onRequestClose={() => setSearchOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setSearchOpen(false)}>
          <Pressable
            className="rounded-t-3xl bg-white p-4 dark:bg-neutral-900"
            onPress={e => e.stopPropagation()}
          >
            <Text className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
              Search accounts
            </Text>
            <View className="relative">
              <View className="absolute left-3 top-0 z-10 h-full justify-center">
                <Search size={16} color="#94a3b8" />
              </View>
              <TextInput
                value={draftSearch}
                onChangeText={setDraftSearch}
                placeholder="Label, login, server, broker..."
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={applySearch}
                className="rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-3 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
              />
            </View>
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => {
                  setDraftSearch('')
                  onSearchQueryChange('')
                  setSearchOpen(false)
                }}
                className="flex-1 items-center rounded-xl border border-neutral-200 py-3 dark:border-neutral-700"
              >
                <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Clear</Text>
              </Pressable>
              <Pressable
                onPress={applySearch}
                className="flex-1 items-center rounded-xl bg-teal-600 py-3"
              >
                <Text className="text-sm font-semibold text-white">Search</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setFilterOpen(false)}>
          <Pressable
            className="max-h-[50%] rounded-t-3xl bg-white p-4 dark:bg-neutral-900"
            onPress={e => e.stopPropagation()}
          >
            <Text className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
              Filter by broker
            </Text>
            <ScrollView>
              {options.map(option => {
                const label = option === 'all' ? 'All brokers' : option
                const selected = brokerFilter === option
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      onBrokerFilterChange(option)
                      setFilterOpen(false)
                    }}
                    className={cn(
                      'rounded-xl px-3 py-3',
                      selected ? 'bg-teal-50 dark:bg-teal-950/50' : 'bg-transparent',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-sm',
                        selected
                          ? 'font-semibold text-teal-700 dark:text-teal-400'
                          : 'text-neutral-700 dark:text-neutral-300',
                      )}
                    >
                      {label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
