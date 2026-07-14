import type { BrokerAccount } from '@tscopier/shared'

/** Stable key for chart fetch — ignores live balance/status ticks. */
export function brokerChartScopeKey(
  accounts: ReadonlyArray<
    Pick<
      BrokerAccount,
      | 'id'
      | 'fxsocket_account_id'
      | 'performance_baseline_captured_at'
      | 'last_activated_at'
      | 'signal_channel_ids'
    >
  >,
): string {
  return accounts
    .map(account => {
      const channels = [...(account.signal_channel_ids ?? [])].sort().join(',')
      return [
        account.id,
        account.fxsocket_account_id ?? '',
        account.performance_baseline_captured_at ?? '',
        account.last_activated_at ?? '',
        channels,
      ].join(':')
    })
    .sort()
    .join('|')
}
