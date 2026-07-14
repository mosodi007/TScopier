/** FxSocket-linked broker account (terminal UUID on broker_accounts). */
export function isFxsocketSessionUuid(fxsocketAccountId: string | null | undefined): boolean {
  const v = (fxsocketAccountId ?? '').trim()
  if (!v) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export function isFxsocketLinkedBroker(
  account: Pick<{ fxsocket_account_id?: string | null }, 'fxsocket_account_id'>,
): boolean {
  return isFxsocketSessionUuid(account.fxsocket_account_id)
}
