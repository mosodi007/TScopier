import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  backtestApi,
  loadBacktestRunFromDb,
  waitForBacktestRunComplete,
} from '@/lib/backtestApi'
import { backtestDateRangeIso } from '@/lib/backtestDateRange'
import {
  filterImportPreviewErrors,
  parseSummary,
  sanitizeBacktestUserError,
  tradePipPnl,
} from '@/lib/backtestDisplay'
import { buildSymbolProfiles } from '@/lib/backtestProfiles'
import type {
  BacktestRunRow,
  BacktestTradeRow,
  SimpleBacktestConfig,
  StoredBacktestSignal,
} from '@/lib/backtestTypes'

export interface ChannelOption {
  id: string
  display_name: string
}

export type BacktestFlowStep = 'configure' | 'symbol' | 'results'

export type BacktestHistoryRow = Pick<
  BacktestRunRow,
  'id' | 'name' | 'status' | 'summary' | 'config' | 'created_at' | 'completed_at'
>

function defaultDateRange(): { dateFrom: string; dateTo: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  }
}

function buildConfig(
  channelId: string,
  dateFrom: string,
  dateTo: string,
  symbols?: string[],
): SimpleBacktestConfig {
  return {
    channelIds: [channelId],
    dateFrom,
    dateTo,
    initialBalance: 10_000,
    fixedLot: 0.1,
    timeframe: '5m',
    ...(symbols?.length ? { symbols } : {}),
  }
}

export function useBacktestFlow(
  userId: string | undefined,
  opts: {
    hasBacktestAccess: boolean
    isAdmin: boolean
  },
) {
  const defaultDates = useMemo(() => defaultDateRange(), [])
  const [channels, setChannels] = useState<ChannelOption[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(defaultDates.dateFrom)
  const [dateTo, setDateTo] = useState(defaultDates.dateTo)
  const [profiledSignals, setProfiledSignals] = useState<StoredBacktestSignal[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [profileNote, setProfileNote] = useState('')
  const [profiling, setProfiling] = useState(false)
  const [profileProgress, setProfileProgress] = useState({ pct: 0, message: '' })
  const [profileKey, setProfileKey] = useState('')
  const [step, setStep] = useState<BacktestFlowStep>('configure')
  const [activeRun, setActiveRun] = useState<BacktestRunRow | null>(null)
  const [trades, setTrades] = useState<BacktestTradeRow[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [loadingHistoryRun, setLoadingHistoryRun] = useState(false)
  const activeRunTokenRef = useRef(0)

  const summary = parseSummary(activeRun?.summary)
  const isBacktestActive =
    running || activeRun?.status === 'running' || activeRun?.status === 'pending'
  const isBusy = profiling || isBacktestActive

  const symbolProfiles = useMemo(
    () => buildSymbolProfiles(profiledSignals),
    [profiledSignals],
  )

  const selectionKey = `${selectedChannelId ?? ''}|${dateFrom}|${dateTo}`
  const hasValidProfile =
    profileKey === selectionKey && profiledSignals.length > 0 && Boolean(selectedChannelId)

  const channelName =
    channels.find(c => c.id === selectedChannelId)?.display_name ?? 'Channel'

  const channelNameMap = useMemo(
    () => new Map(channels.map(c => [c.id, c.display_name])),
    [channels],
  )

  const totalPips = useMemo(() => {
    if (summary?.totalPips != null && Number.isFinite(summary.totalPips)) {
      return summary.totalPips
    }
    let sum = 0
    let hasAny = false
    for (const tr of trades) {
      const p = tradePipPnl(tr)
      if (p == null) continue
      sum += p
      hasAny = true
    }
    return hasAny ? sum : null
  }, [summary?.totalPips, trades])

  const loadStoredSignals = useCallback(
    async (channelId: string, from: string, to: string) => {
      if (!userId) return []
      const { fromIso, toIso } = backtestDateRangeIso(from, to)
      const { data, error: qErr } = await supabase
        .from('backtest_channel_signals')
        .select('id, channel_id, symbol, direction, entry_price, sl, tp_levels, signal_at, source')
        .eq('user_id', userId)
        .eq('channel_id', channelId)
        .gte('signal_at', fromIso)
        .lte('signal_at', toIso)
        .order('signal_at', { ascending: false })
      if (qErr) throw new Error(qErr.message)
      return (data ?? []) as StoredBacktestSignal[]
    },
    [userId],
  )

  const applyRunResult = useCallback((run: BacktestRunRow, loaded: BacktestTradeRow[]) => {
    setActiveRun(run)
    setTrades(loaded)
    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
      setRunning(false)
    }
    return run
  }, [])

  const loadRun = useCallback(
    async (runId: string) => {
      if (!userId) throw new Error('Not signed in')
      const { run, trades: loaded } = await loadBacktestRunFromDb(runId, userId)
      return applyRunResult(run, loaded)
    },
    [userId, applyRunResult],
  )

  const clearResults = useCallback(() => {
    setActiveRun(null)
    setTrades([])
  }, [])

  const prevSelectionKey = useRef(selectionKey)
  const runningRef = useRef(false)
  runningRef.current = running

  useEffect(() => {
    if (prevSelectionKey.current === selectionKey) return
    prevSelectionKey.current = selectionKey
    setProfiledSignals([])
    setSelectedSymbol(null)
    setProfileNote('')
    setProfileKey('')
    clearResults()
    if (!runningRef.current) {
      setStep('configure')
    }
  }, [selectionKey, clearResults])

  useEffect(() => {
    if (!userId) return
    void (async () => {
      const { data } = await supabase
        .from('telegram_channels')
        .select('id, display_name')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('display_name')
      setChannels(
        (data ?? []).map(r => ({
          id: r.id as string,
          display_name: (r.display_name as string) || 'Channel',
        })),
      )
    })()
  }, [userId])

  const userError = useCallback((e: unknown) => {
    const raw = e instanceof Error ? e.message : String(e)
    if (/active subscription is required/i.test(raw)) {
      return 'An active subscription is required to run backtests.'
    }
    return sanitizeBacktestUserError(
      raw,
      'Market data request failed — wait a moment and run again.',
    )
  }, [])

  const resultReady = step === 'symbol' && activeRun?.status === 'completed' && !running

  const profileSignals = useCallback(async () => {
    if (!userId) return
    if (!selectedChannelId) {
      setError('Select a signal channel first.')
      return
    }
    setError('')
    setProfileNote('')
    setProfiledSignals([])
    setSelectedSymbol(null)
    setProfileKey('')
    clearResults()
    setProfiling(true)
    setProfileProgress({ pct: 0, message: 'Pulling signals…' })
    try {
      const config = buildConfig(selectedChannelId, dateFrom, dateTo)
      const result = await backtestApi.syncAndWait(config, userId, {
        onTick: run => {
          setProfileProgress({
            pct: Number(run.progress_pct ?? 0),
            message: run.progress_message ?? 'Pulling signals…',
          })
        },
      })
      let signals = await loadStoredSignals(selectedChannelId, dateFrom, dateTo)
      if (signals.length === 0 && result.imported > 0) {
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise(r => setTimeout(r, 400))
          signals = await loadStoredSignals(selectedChannelId, dateFrom, dateTo)
          if (signals.length > 0) break
        }
      }
      setProfiledSignals(signals)
      setProfileKey(`${selectedChannelId}|${dateFrom}|${dateTo}`)
      const msg =
        result.imported > 0
          ? `Imported ${result.imported} signals (${result.messages_scanned} messages scanned).`
          : result.candidates > 0
            ? `Found ${result.candidates} candidates but none imported.`
            : `No tradeable signals found (${result.messages_scanned} messages scanned).`
      const syncErrors = filterImportPreviewErrors(result.errors)
      setProfileNote([msg, ...syncErrors].filter(Boolean).join(' '))
      if (syncErrors.length > 0 && result.imported === 0 && signals.length === 0) {
        setError(syncErrors.join(' · ') || 'Signal sync failed.')
      }
      const profiles = buildSymbolProfiles(signals)
      setSelectedSymbol(profiles[0]?.symbol ?? null)
      setStep('symbol')
    } catch (e) {
      setError(userError(e))
    } finally {
      setProfiling(false)
      setProfileProgress({ pct: 0, message: '' })
    }
  }, [
    userId,
    selectedChannelId,
    dateFrom,
    dateTo,
    clearResults,
    loadStoredSignals,
    userError,
  ])

  const startBacktest = useCallback(async () => {
    if (!userId) return
    if (!selectedChannelId || !hasValidProfile || !selectedSymbol) {
      setError(!hasValidProfile ? 'Pull and profile signals first.' : 'Select a symbol to backtest.')
      return
    }
    if (!opts.isAdmin && !opts.hasBacktestAccess) {
      setError('An active subscription is required to run backtests.')
      return
    }
    const runToken = ++activeRunTokenRef.current
    setError('')
    setRunning(true)
    setActiveRun(null)
    setTrades([])
    try {
      const config = buildConfig(selectedChannelId, dateFrom, dateTo, [selectedSymbol])
      const { run_id } = await backtestApi.backtestTpsl(config)
      if (runToken !== activeRunTokenRef.current) return

      const { run, trades: finishedTrades } = await waitForBacktestRunComplete(run_id, userId, {
        onTick: ({ run: tickRun, trades: tickTrades }) => {
          if (runToken !== activeRunTokenRef.current) return
          setActiveRun(tickRun)
          setTrades(tickTrades)
        },
      })
      if (runToken !== activeRunTokenRef.current) return

      setActiveRun(run)
      setTrades(finishedTrades)

      if (run.status === 'completed') {
        setStep('results')
      } else if (run.status === 'failed') {
        setError(
          sanitizeBacktestUserError(
            run.error_message ?? 'Backtest failed.',
            'Market data request failed — wait a moment and run again.',
          ),
        )
        if (finishedTrades.length > 0) {
          setStep('results')
        }
      }
    } catch (e) {
      if (runToken !== activeRunTokenRef.current) return
      setError(userError(e))
    } finally {
      if (runToken === activeRunTokenRef.current) {
        setRunning(false)
      }
    }
  }, [
    userId,
    selectedChannelId,
    hasValidProfile,
    selectedSymbol,
    opts.isAdmin,
    opts.hasBacktestAccess,
    dateFrom,
    dateTo,
    userError,
  ])

  const openHistoryRun = useCallback(
    async (row: BacktestHistoryRow) => {
      setError('')
      setLoadingHistoryRun(true)
      try {
        const cfg = row.config as SimpleBacktestConfig & {
          channelIds?: string[]
          symbols?: string[]
        }
        const chId = Array.isArray(cfg.channelIds) ? cfg.channelIds[0] : null
        if (chId) setSelectedChannelId(String(chId))
        if (cfg.dateFrom) setDateFrom(String(cfg.dateFrom))
        if (cfg.dateTo) setDateTo(String(cfg.dateTo))
        const sym = Array.isArray(cfg.symbols) ? cfg.symbols[0] : null
        if (sym) setSelectedSymbol(String(sym).toUpperCase())

        const run = await loadRun(row.id)
        setStep('results')
        if (run.status === 'running' || run.status === 'pending') {
          setRunning(true)
        }
      } catch (e) {
        setError(userError(e))
      } finally {
        setLoadingHistoryRun(false)
      }
    },
    [loadRun, userError],
  )

  const canProfile = Boolean(selectedChannelId) && !isBusy
  const canBacktest =
    hasValidProfile && Boolean(selectedSymbol) && !isBusy && opts.hasBacktestAccess

  const sortedTrades = useMemo(
    () =>
      [...trades].sort(
        (a, b) => new Date(b.signal_at).getTime() - new Date(a.signal_at).getTime(),
      ),
    [trades],
  )

  return {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    profiledSignals,
    selectedSymbol,
    setSelectedSymbol,
    profileNote,
    profiling,
    profileProgress,
    step,
    setStep,
    activeRun,
    trades: sortedTrades,
    running,
    error,
    setError,
    loadingHistoryRun,
    summary,
    isBacktestActive,
    isBusy,
    symbolProfiles,
    hasValidProfile,
    channelName,
    channelNameMap,
    totalPips,
    resultReady,
    profileSignals,
    startBacktest,
    openHistoryRun,
    clearResults,
    canProfile,
    canBacktest,
    showResults: () => setStep('results'),
  }
}
