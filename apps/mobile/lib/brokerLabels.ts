import type { BrokerAccount } from '@tscopier/shared'
import {
  brokerConnectionBadgeVariant,
  brokerConnectionStatusLabel,
} from '@tscopier/web-lib/brokerReconnect'
import {
  brokerTerminalHealthBadgeVariant,
  brokerTerminalHealthLabel,
} from '@tscopier/web-lib/brokerHealth'
import {
  formatLinkedAccountTypeLabel,
  linkedAccountTypeValueClass,
  resolveLinkedAccountTypeForBroker,
  type LinkedAccountType,
} from '@tscopier/web-lib/brokerFromServer'

const CONNECTION_LABELS = {
  statusPaused: 'Paused',
  statusConnected: 'Connected',
  statusConnecting: 'Connecting',
  statusRecovering: 'Recovering',
  statusDisconnected: 'Disconnected',
}

const HEALTH_LABELS = {
  statusHealthy: 'Healthy',
  statusUnhealthy: 'Unhealthy',
  statusHealthChecking: 'Checking',
}

export function brokerConnectionLabel(broker: BrokerAccount): string {
  return brokerConnectionStatusLabel(broker, CONNECTION_LABELS)
}

export function brokerHealthLabel(broker: BrokerAccount): string | null {
  return brokerTerminalHealthLabel(broker, HEALTH_LABELS)
}

export function brokerConnectionTone(
  broker: BrokerAccount,
): 'primary' | 'neutral' | 'error' {
  return brokerConnectionBadgeVariant(broker)
}

export function brokerHealthTone(
  broker: BrokerAccount,
): 'primary' | 'error' | 'neutral' | null {
  return brokerTerminalHealthBadgeVariant(broker)
}

const ACCOUNT_TYPE_LABELS = {
  demo: 'Demo',
  live: 'Live',
  propFirm: 'Prop Firm',
}

export function brokerAccountTypeLabel(broker: BrokerAccount): string {
  return formatLinkedAccountTypeLabel(resolveLinkedAccountTypeForBroker(broker), ACCOUNT_TYPE_LABELS)
}

export function brokerAccountTypeClass(accountType: LinkedAccountType | undefined): string {
  return linkedAccountTypeValueClass(accountType)
}

export function resolveBrokerAccountType(broker: BrokerAccount): LinkedAccountType | undefined {
  return resolveLinkedAccountTypeForBroker(broker)
}
