import {
  buildChannelDisplayNames,
  buildDisplayableTradeActivities,
  dedupePipelineParseAttempts,
  TRADE_ACTIVITY_FETCH_LIMIT,
  TRADE_EXECUTION_LOG_SELECT,
  type DisplayableTradeActivity,
  type TradeActivityLogRow,
} from '@tscopier/web-lib/tradeActivities'
import { channelWorkerEn } from '@tscopier/web-i18n/channelWorker/en'
import type { ManagementTranslations } from '@tscopier/web-i18n/locales/types'

const managementActivityKinds: Pick<
  ManagementTranslations,
  | 'kindBreakeven'
  | 'kindClose'
  | 'kindCloseWorseEntries'
  | 'kindModify'
  | 'kindOrder'
  | 'kindLayering'
  | 'kindPipeline'
  | 'kindOther'
> = {
  kindBreakeven: 'SL to Breakeven',
  kindClose: 'Close trade',
  kindCloseWorseEntries: 'Close worse entries',
  kindModify: 'Update SL/TP',
  kindOrder: 'Order placement',
  kindLayering: 'Layered entry',
  kindPipeline: 'Signal processing',
  kindOther: 'Trade activity',
}

export {
  TRADE_ACTIVITY_FETCH_LIMIT,
  TRADE_EXECUTION_LOG_SELECT,
  buildChannelDisplayNames,
  type DisplayableTradeActivity,
  type TradeActivityLogRow,
}

/** Same human-readable feed as web dashboard Copier engine (trade activities panel). */
export function buildCopierEngineActivities(
  rows: TradeActivityLogRow[],
  channelDisplayNames: Record<string, string>,
): DisplayableTradeActivity[] {
  const deduped = dedupePipelineParseAttempts(rows)
  return buildDisplayableTradeActivities(
    deduped,
    channelWorkerEn,
    managementActivityKinds as ManagementTranslations,
    channelDisplayNames,
  )
}

export function toCopierEngineListItem(activity: DisplayableTradeActivity) {
  return {
    id: activity.row.id,
    message: activity.message,
    created_at: activity.row.created_at,
    status: activity.status,
    kind: activity.kind,
    symbol: activity.symbol,
    channelName: activity.channelName,
  }
}

export type CopierEngineListItem = ReturnType<typeof toCopierEngineListItem>
