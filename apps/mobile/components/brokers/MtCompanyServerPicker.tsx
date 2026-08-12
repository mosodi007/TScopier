import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  X,
} from 'lucide-react-native'
import { callEdgeFunction } from '@tscopier/shared'
import { partitionBrokerSearchResults } from '@tscopier/web-lib/brokerSearchResults'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/cn'
import { tscTheme } from '@/lib/tscTheme'

const MAX_SERVER_HITS = 40
const MAX_COMPANY_HITS = 20
const SEARCH_DEBOUNCE_MS = 400

export interface BrokerSearchCompany {
  companyName?: string
  results?: Array<{ name?: string }>
}

const COPY = {
  brokerServerLabel: 'Broker server',
  brokerServerSelectPrompt: 'Search for your broker company',
  brokerServerManualToggle: "Can't find your broker? Enter server manually",
  brokerServerManualLabel: 'Server name',
  brokerServerManualHint: 'Use the exact server name from your MT terminal.',
  brokerServerPickerTitle: 'Server',
  brokerCompanySearchPlaceholder: 'Search by broker company or server name',
  brokerCompanySearchServersHeading: 'Servers',
  brokerCompanySearchCompaniesHeading: 'Brokers',
  brokerCompanySearchEmpty: 'Search for your broker company or server name',
  brokerCompanySearchMinChars: 'Type at least 4 characters to search',
  brokerCompanySearchNoResults: 'No matches in our broker directory.',
  brokerCompanySearchUseQuery: (query: string) => `Use "${query}" as server name`,
  brokerCompanySearchLoading: 'Searching brokers…',
  brokerCompanySearchError: 'Broker search failed. Try again or enter your server manually.',
} as const

function companyShortLabel(company: BrokerSearchCompany): string {
  const names = (company.results ?? [])
    .map(r => (r.name ?? '').trim())
    .filter(Boolean)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  let prefix = names[0]
  for (const name of names.slice(1)) {
    while (prefix && !name.startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
    }
  }
  const trimmed = prefix.replace(/[-_.]+$/, '')
  return trimmed || names[0]
}

interface MtCompanyServerPickerProps {
  value: string
  onChange: (value: string) => void
  platform?: 'MT4' | 'MT5'
  label?: string
  disabled?: boolean
}

export function MtCompanyServerPicker({
  value,
  onChange,
  platform = 'MT5',
  label = COPY.brokerServerLabel,
  disabled,
}: MtCompanyServerPickerProps) {
  const { session } = useAuth()
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const muted = isDark ? '#94a3b8' : '#64748b'

  const [modalOpen, setModalOpen] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualServer, setManualServer] = useState('')
  const [step, setStep] = useState<'company' | 'server'>('company')
  const [searchQuery, setSearchQuery] = useState('')
  const [companies, setCompanies] = useState<BrokerSearchCompany[]>([])
  const [selectedCompany, setSelectedCompany] = useState<BrokerSearchCompany | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const searchSeqRef = useRef(0)

  const resetModal = useCallback(() => {
    setStep('company')
    setSearchQuery('')
    setCompanies([])
    setSelectedCompany(null)
    setLoading(false)
    setSearchError('')
  }, [])

  const closeModal = () => {
    setModalOpen(false)
    resetModal()
  }

  useEffect(() => {
    if (!modalOpen || step !== 'company') return
    const q = searchQuery.trim()
    if (q.length < 4) {
      setCompanies([])
      setLoading(false)
      setSearchError('')
      return
    }

    const seq = ++searchSeqRef.current
    setLoading(true)
    setSearchError('')

    const timer = setTimeout(() => {
      void (async () => {
        if (!session?.access_token) {
          if (seq !== searchSeqRef.current) return
          setLoading(false)
          setSearchError(COPY.brokerCompanySearchError)
          return
        }
        try {
          const { ok, data } = await callEdgeFunction<{
            companies?: BrokerSearchCompany[]
            error?: string
          }>('fxsocket-broker', {
            accessToken: session.access_token,
            body: {
              action: 'search_brokers',
              company: q,
              platform,
            },
            timeoutMs: 60_000,
          })
          if (seq !== searchSeqRef.current) return
          if (!ok || data.error) {
            setCompanies([])
            setSearchError(COPY.brokerCompanySearchError)
            return
          }
          setCompanies(data.companies ?? [])
        } catch {
          if (seq !== searchSeqRef.current) return
          setCompanies([])
          setSearchError(COPY.brokerCompanySearchError)
        } finally {
          if (seq === searchSeqRef.current) setLoading(false)
        }
      })()
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [modalOpen, step, searchQuery, platform, session?.access_token])

  const trimmedQuery = searchQuery.trim()
  const { serverHits, companyHits } = useMemo(
    () => partitionBrokerSearchResults(trimmedQuery, companies),
    [trimmedQuery, companies],
  )
  const visibleServerHits = serverHits.slice(0, MAX_SERVER_HITS)
  const visibleCompanyHits = companyHits.slice(0, MAX_COMPANY_HITS)
  const hasResults = serverHits.length > 0 || companyHits.length > 0
  const showMinCharsHint = trimmedQuery.length > 0 && trimmedQuery.length < 4

  const servers = useMemo(
    () =>
      (selectedCompany?.results ?? [])
        .map(r => (r.name ?? '').trim())
        .filter(Boolean),
    [selectedCompany],
  )

  const handleSelect = (serverName: string) => {
    onChange(serverName)
    setManualMode(false)
    setManualServer('')
    closeModal()
  }

  const sheetBg = isDark ? '#0f172a' : '#ffffff'

  return (
    <View>
      <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label} <Text className="text-error-500">*</Text>
      </Text>

      {manualMode ? (
        <View className="gap-2">
          <TextInput
            value={manualServer}
            onChangeText={raw => {
              setManualServer(raw)
              onChange(raw.trim())
            }}
            placeholder={COPY.brokerServerManualLabel}
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
          />
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            {COPY.brokerServerManualHint}
          </Text>
          <Pressable
            disabled={disabled}
            onPress={() => {
              setManualMode(false)
              setManualServer('')
              onChange('')
            }}
          >
            <Text className="text-xs font-medium text-teal-600 dark:text-teal-400">
              {COPY.brokerServerSelectPrompt}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          disabled={disabled}
          onPress={() => setModalOpen(true)}
          className={cn(
            'flex-row items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900',
            disabled && 'opacity-60',
          )}
        >
          <Text
            className={cn(
              'min-w-0 flex-1 text-sm',
              value ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-400',
            )}
            numberOfLines={1}
          >
            {value || COPY.brokerServerSelectPrompt}
          </Text>
          <ChevronDown size={16} color={muted} />
        </Pressable>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={closeModal} accessibilityLabel="Dismiss" />
          <View
            className="max-h-[88%] overflow-hidden rounded-t-3xl"
            style={{ backgroundColor: sheetBg, paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <View className="items-center pt-2 pb-1">
              <View className="h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            </View>

            <View className="flex-row items-center gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
              {step === 'server' ? (
                <Pressable
                  onPress={() => {
                    setStep('company')
                    setSelectedCompany(null)
                  }}
                  className="rounded-lg p-2"
                  accessibilityLabel="Back"
                >
                  <ArrowLeft size={18} color={muted} />
                </Pressable>
              ) : null}
              <Text className="min-w-0 flex-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                {step === 'server'
                  ? selectedCompany?.companyName?.trim() || COPY.brokerServerPickerTitle
                  : COPY.brokerServerPickerTitle}
              </Text>
              <Pressable onPress={closeModal} className="rounded-lg p-2" accessibilityLabel="Close">
                <X size={18} color={muted} />
              </Pressable>
            </View>

            {step === 'company' ? (
              <>
                <View className="border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
                  <View className="flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
                    <Search size={16} color={muted} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder={COPY.brokerCompanySearchPlaceholder}
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      className="min-w-0 flex-1 text-sm text-neutral-900 dark:text-neutral-50"
                    />
                  </View>
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  className="max-h-[52vh]"
                  contentContainerClassName="pb-2"
                >
                  {searchError ? (
                    <Text className="px-4 py-6 text-center text-sm text-red-600 dark:text-red-400">
                      {searchError}
                    </Text>
                  ) : loading ? (
                    <View className="items-center gap-2 py-10">
                      <ActivityIndicator color={tscTheme.primary} />
                      <Text className="text-xs text-neutral-500">{COPY.brokerCompanySearchLoading}</Text>
                    </View>
                  ) : showMinCharsHint ? (
                    <Text className="px-4 py-8 text-center text-sm text-neutral-500">
                      {COPY.brokerCompanySearchMinChars}
                    </Text>
                  ) : trimmedQuery.length < 4 ? (
                    <View className="items-center px-4 py-10">
                      <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                        <Search size={28} color={isDark ? '#525252' : '#d4d4d4'} />
                      </View>
                      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {COPY.brokerCompanySearchEmpty}
                      </Text>
                      <Text className="mt-2 text-xs text-neutral-500">
                        {COPY.brokerCompanySearchMinChars}
                      </Text>
                    </View>
                  ) : !hasResults ? (
                    <View className="gap-3 px-4 py-6">
                      <Text className="text-center text-sm text-neutral-500">
                        {COPY.brokerCompanySearchNoResults}
                      </Text>
                      <Pressable
                        onPress={() => handleSelect(trimmedQuery)}
                        className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-900/50 dark:bg-teal-950/40"
                      >
                        <Text className="text-sm font-medium text-teal-900 dark:text-teal-100">
                          {COPY.brokerCompanySearchUseQuery(trimmedQuery)}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View>
                      {visibleServerHits.length > 0 ? (
                        <View>
                          <Text className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                            {COPY.brokerCompanySearchServersHeading}
                          </Text>
                          {visibleServerHits.map(hit => (
                            <Pressable
                              key={`s-${hit.serverName}`}
                              onPress={() => handleSelect(hit.serverName)}
                              className="flex-row items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3.5 dark:border-neutral-800"
                            >
                              <View className="min-w-0 flex-1">
                                <Text className="text-sm text-neutral-900 dark:text-neutral-50">
                                  {hit.serverName}
                                </Text>
                                {hit.companyName ? (
                                  <Text className="mt-0.5 text-xs text-neutral-500">{hit.companyName}</Text>
                                ) : null}
                              </View>
                              {value === hit.serverName ? (
                                <Check size={16} color={tscTheme.primary} />
                              ) : null}
                            </Pressable>
                          ))}
                        </View>
                      ) : null}

                      {visibleCompanyHits.length > 0 ? (
                        <View>
                          <Text className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                            {COPY.brokerCompanySearchCompaniesHeading}
                          </Text>
                          {visibleCompanyHits.map((company, index) => {
                            const short = companyShortLabel(company)
                            const name = company.companyName?.trim() || short || `Broker ${index + 1}`
                            const count = (company.results ?? []).filter(r => (r.name ?? '').trim()).length
                            return (
                              <Pressable
                                key={`c-${name}-${index}`}
                                onPress={() => {
                                  setSelectedCompany(company)
                                  setStep('server')
                                }}
                                className="flex-row items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3.5 dark:border-neutral-800"
                              >
                                <View className="min-w-0 flex-1">
                                  <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                                    {name}
                                  </Text>
                                  <Text className="mt-0.5 text-xs text-neutral-500">
                                    {count} server{count === 1 ? '' : 's'}
                                    {short && short !== name ? ` · ${short}` : ''}
                                  </Text>
                                </View>
                                <ChevronRight size={16} color={isDark ? '#525252' : '#d4d4d4'} />
                              </Pressable>
                            )
                          })}
                        </View>
                      ) : null}

                      {trimmedQuery.length >= 4 ? (
                        <View className="px-4 py-3">
                          <Pressable
                            onPress={() => handleSelect(trimmedQuery)}
                            className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-900/50 dark:bg-teal-950/40"
                          >
                            <Text className="text-sm font-medium text-teal-900 dark:text-teal-100">
                              {COPY.brokerCompanySearchUseQuery(trimmedQuery)}
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  )}
                </ScrollView>

                <View className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
                  <Pressable
                    onPress={() => {
                      setModalOpen(false)
                      resetModal()
                      setManualMode(true)
                      setManualServer(value)
                    }}
                  >
                    <Text className="text-center text-xs text-neutral-500 dark:text-neutral-400">
                      {COPY.brokerServerManualToggle}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <ScrollView className="max-h-[60vh]">
                {servers.map(server => (
                  <Pressable
                    key={server}
                    onPress={() => handleSelect(server)}
                    className="flex-row items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3.5 dark:border-neutral-800"
                  >
                    <Text className="min-w-0 flex-1 text-sm text-neutral-900 dark:text-neutral-50">
                      {server}
                    </Text>
                    {value === server ? <Check size={16} color={tscTheme.primary} /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}
