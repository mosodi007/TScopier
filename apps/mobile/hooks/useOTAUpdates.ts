import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AppState, type AppStateStatus } from 'react-native'
import * as Updates from 'expo-updates'

export type OtaCheckStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error'

export type OtaUpdateInfo = {
  enabled: boolean
  channel: string | null
  runtimeVersion: string | null
  updateId: string | null
  createdAt: string | null
  isEmbeddedLaunch: boolean
}

function isOtaEnabled(): boolean {
  return !__DEV__ && Updates.isEnabled
}

export function getOtaUpdateInfo(): OtaUpdateInfo {
  return {
    enabled: isOtaEnabled(),
    channel: Updates.channel ?? null,
    runtimeVersion: Updates.runtimeVersion ?? null,
    updateId: Updates.updateId ?? null,
    createdAt: Updates.createdAt?.toISOString() ?? null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  }
}

/**
 * Check → download → optional reload prompt.
 * Safe to call from Settings; no-ops in Expo Go / __DEV__.
 */
export async function checkAndApplyOtaUpdate(opts?: {
  /** When true, reload immediately after download without prompting. */
  autoReload?: boolean
  /** When false, only check — do not download. */
  download?: boolean
}): Promise<{ status: OtaCheckStatus; message: string }> {
  if (!isOtaEnabled()) {
    return {
      status: 'idle',
      message: 'OTA updates are only available in preview/production builds (not Expo Go or local dev).',
    }
  }

  try {
    const check = await Updates.checkForUpdateAsync()
    if (!check.isAvailable) {
      return { status: 'up-to-date', message: 'You are on the latest version.' }
    }

    if (opts?.download === false) {
      return { status: 'available', message: 'An update is available.' }
    }

    await Updates.fetchUpdateAsync()

    if (opts?.autoReload) {
      await Updates.reloadAsync()
      return { status: 'ready', message: 'Update applied.' }
    }

    return { status: 'ready', message: 'Update downloaded. Restart to apply.' }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not check for updates.'
    return { status: 'error', message }
  }
}

/**
 * Background OTA: check on launch and when returning to foreground,
 * download silently, then prompt to restart.
 */
export function useOTAUpdates(): {
  status: OtaCheckStatus
  info: OtaUpdateInfo
  checkNow: () => Promise<void>
} {
  const [status, setStatus] = useState<OtaCheckStatus>('idle')
  const [info, setInfo] = useState<OtaUpdateInfo>(() => getOtaUpdateInfo())
  const promptedRef = useRef(false)
  const busyRef = useRef(false)

  const promptRestart = useCallback(() => {
    if (promptedRef.current) return
    promptedRef.current = true
    Alert.alert(
      'Update ready',
      'A new version of TScopier was downloaded. Restart now to apply it.',
      [
        { text: 'Later', style: 'cancel', onPress: () => { promptedRef.current = false } },
        {
          text: 'Restart',
          onPress: () => {
            void Updates.reloadAsync()
          },
        },
      ],
    )
  }, [])

  const runCheck = useCallback(async (interactive: boolean) => {
    if (!isOtaEnabled() || busyRef.current) return
    busyRef.current = true
    setStatus('checking')
    try {
      const result = await checkAndApplyOtaUpdate({ download: true, autoReload: false })
      setStatus(result.status)
      setInfo(getOtaUpdateInfo())

      if (result.status === 'ready') {
        promptRestart()
      } else if (interactive) {
        if (result.status === 'up-to-date') {
          Alert.alert('Up to date', result.message)
        } else if (result.status === 'error') {
          Alert.alert('Update check failed', result.message)
        }
      }
    } finally {
      busyRef.current = false
    }
  }, [promptRestart])

  useEffect(() => {
    if (!isOtaEnabled()) return

    void runCheck(false)

    const onChange = (next: AppStateStatus) => {
      if (next === 'active') void runCheck(false)
    }
    const sub = AppState.addEventListener('change', onChange)
    return () => sub.remove()
  }, [runCheck])

  const checkNow = useCallback(async () => {
    promptedRef.current = false
    await runCheck(true)
  }, [runCheck])

  return { status, info, checkNow }
}
