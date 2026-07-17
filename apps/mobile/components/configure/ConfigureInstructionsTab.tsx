import { Text, View } from 'react-native'
import {
  type ChannelFilterDecision,
  type ChannelFilterKey,
  type ChannelFilters,
  normalizeChannelFilters,
} from '@tscopier/web-lib/channelMessageFilters'
import { ConfigSection, SegmentedControl } from '@/components/configure/formControls'
import { MutedText } from '@/components/ui'

const FILTER_CATEGORIES: Array<{ key: ChannelFilterKey; label: string; example: string }> = [
  { key: 'close_full', label: 'Close full', example: 'Close all / Close trade' },
  { key: 'close_half', label: 'Close half', example: 'Close 50% / Take half' },
  { key: 'break_even', label: 'Break even', example: 'Move SL to BE' },
  { key: 'modify_sl', label: 'Modify SL', example: 'SL to 1.234' },
  { key: 'modify_tp', label: 'Modify TP', example: 'TP to 1.250' },
  { key: 'close_tp_levels', label: 'Close TP levels', example: 'Close TP1' },
  { key: 'close_all', label: 'Close all', example: 'Close all trades' },
  { key: 'close_worse_entries', label: 'Close worse entries', example: 'Close worse' },
  { key: 'delete_pendings', label: 'Delete pendings', example: 'Cancel pending' },
]

interface ConfigureInstructionsTabProps {
  filters: Partial<ChannelFilters> | null | undefined
  onChange: (next: ChannelFilters) => void
  keywordFiltersEnabled: boolean
}

export function ConfigureInstructionsTab({
  filters,
  onChange,
  keywordFiltersEnabled,
}: ConfigureInstructionsTabProps) {
  const normalized = normalizeChannelFilters(filters)

  const setDecision = (key: ChannelFilterKey, decision: ChannelFilterDecision) => {
    onChange({ ...normalized, [key]: decision })
  }

  return (
    <ConfigSection
      title="Channel instructions"
      subtitle={
        keywordFiltersEnabled
          ? 'Allow or ignore message types from this Telegram channel.'
          : 'Keyword instruction filters require Advanced. All categories stay ignored on Basic.'
      }
    >
      {!keywordFiltersEnabled ? (
        <MutedText className="text-xs">
          Upgrade to Advanced to customize Allow / Ignore rules for channel instructions.
        </MutedText>
      ) : null}
      {FILTER_CATEGORIES.map(category => (
        <View
          key={category.key}
          className="gap-2 border-b border-neutral-100 py-3 dark:border-neutral-800"
        >
          <View>
            <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {category.label}
            </Text>
            <MutedText className="text-xs">{category.example}</MutedText>
          </View>
          <SegmentedControl
            value={normalized[category.key] ?? 'allow'}
            onChange={next => {
              if (!keywordFiltersEnabled) return
              setDecision(category.key, next)
            }}
            options={[
              { id: 'allow', label: 'Allow' },
              { id: 'ignore', label: 'Ignore' },
            ]}
          />
        </View>
      ))}
    </ConfigSection>
  )
}
