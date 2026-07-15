import type { BrokerAccount } from '@tscopier/shared'
import { inferBrokerLabelFromServer } from '@tscopier/web-lib/brokerFromServer'

export interface BrokerChannelOption {
  id: string
  display_name: string | null
}

export function resolveBrokerFilterLabel(broker: BrokerAccount): string {
  return (
    broker.broker_name
    || inferBrokerLabelFromServer(broker.broker_server ?? null)
    || broker.broker_server
    || '—'
  )
}

export function brokerMatchesSearch(broker: BrokerAccount, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    broker.label,
    broker.account_login,
    broker.broker_server,
    broker.broker_name,
    broker.platform,
    resolveBrokerFilterLabel(broker),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function filterBrokers(
  brokers: BrokerAccount[],
  query: string,
  brokerFilter: string,
): BrokerAccount[] {
  return brokers.filter(broker => {
    if (brokerFilter !== 'all' && resolveBrokerFilterLabel(broker) !== brokerFilter) return false
    return brokerMatchesSearch(broker, query)
  })
}

export function uniqueBrokerFilterOptions(brokers: BrokerAccount[]): string[] {
  const labels = new Set<string>()
  for (const broker of brokers) {
    labels.add(resolveBrokerFilterLabel(broker))
  }
  return [...labels].sort((a, b) => a.localeCompare(b))
}

export function getBrokerSignalChannelsLabel(
  broker: BrokerAccount,
  channels: BrokerChannelOption[],
): string {
  if (channels.length === 0) return 'None selected'
  const ids = normalizeBrokerChannelIds(broker)
  if (ids.length === 0) return 'None selected'
  const selected = channels.filter(ch => ids.includes(ch.id))
  if (selected.length === 0) return 'None selected'
  if (selected.length === channels.length && channels.length > 1) return 'All channels'
  const labels = selected.map(ch => ch.display_name?.trim() || 'Channel').filter(Boolean)
  return labels.length ? labels.join(', ') : 'None selected'
}

export function normalizeBrokerChannelIds(broker: BrokerAccount): string[] {
  const raw = broker.signal_channel_ids
  if (!raw?.length) return []
  return raw.map(String).filter(Boolean)
}
