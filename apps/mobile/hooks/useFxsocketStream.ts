import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import type { BrokerAccount } from '@tscopier/shared'
import { openFxsocketStream, type FxsocketStreamMessage } from '@/lib/fxsocketStream'

export interface FxsocketStreamHandlers {
  onAccount?: (brokerAccountId: string, data: Record<string, unknown>) => void
  onPositions?: (brokerAccountId: string, data: unknown) => void
}

function isLinkedBroker(b: BrokerAccount): boolean {
  return Boolean(b.fxsocket_account_id || b.metaapi_account_id)
}

export function fxsocketStreamBrokerIdsKey(brokers: BrokerAccount[]): string {
  return brokers.filter(isLinkedBroker).map(b => b.id).sort().join(',')
}

export function useFxsocketStream(
  brokers: BrokerAccount[],
  handlers: FxsocketStreamHandlers,
  enabled = true,
): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const handlesRef = useRef<Map<string, { close: () => void }>>(new Map())

  const brokerIdsKey = fxsocketStreamBrokerIdsKey(brokers)

  const connectAll = () => {
    if (!enabled || !brokerIdsKey) return
    const brokerIds = brokerIdsKey.split(',').filter(Boolean)
    for (const brokerId of brokerIds) {
      if (handlesRef.current.has(brokerId)) continue
      void openFxsocketStream(brokerId, {
        onMessage: (msg: FxsocketStreamMessage) => {
          if (msg.type === 'account' && msg.data) {
            handlersRef.current.onAccount?.(brokerId, msg.data as Record<string, unknown>)
          } else if (msg.type === 'positions' && msg.data) {
            handlersRef.current.onPositions?.(brokerId, msg.data)
          }
        },
      }).then(handle => {
        handlesRef.current.set(brokerId, handle)
      }).catch(() => { /* fallback to cached values */ })
    }
  }

  const disconnectAll = () => {
    for (const handle of handlesRef.current.values()) handle.close()
    handlesRef.current.clear()
  }

  useEffect(() => {
    connectAll()
    return () => disconnectAll()
  }, [brokerIdsKey, enabled])

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        disconnectAll()
        connectAll()
      }
    }
    const sub = AppState.addEventListener('change', onAppState)
    return () => sub.remove()
  }, [brokerIdsKey, enabled])
}
