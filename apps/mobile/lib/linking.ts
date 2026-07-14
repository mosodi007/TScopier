import * as Linking from 'expo-linking'
import Constants from 'expo-constants'
import { getAppScheme } from '@tscopier/shared'

export function getAppSchemeValue(): string {
  const extra = Constants.expoConfig?.extra as { appScheme?: string } | undefined
  return extra?.appScheme ?? getAppScheme()
}

export function makeDeepLink(path: string): string {
  const scheme = getAppSchemeValue()
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${scheme}://${normalized}`
}

export function getAuthRedirectUrl(path = 'auth/callback'): string {
  return makeDeepLink(path)
}

export function getBillingReturnUrl(): string {
  return makeDeepLink('billing/return')
}

export function parseAuthTokensFromUrl(url: string): {
  accessToken?: string
  refreshToken?: string
  type?: string
} {
  const parsed = Linking.parse(url)
  const hash = url.includes('#') ? url.split('#')[1] : ''
  const hashParams = new URLSearchParams(hash)
  const queryParams = parsed.queryParams ?? {}

  const accessToken =
    (queryParams.access_token as string | undefined)
    ?? hashParams.get('access_token')
    ?? undefined
  const refreshToken =
    (queryParams.refresh_token as string | undefined)
    ?? hashParams.get('refresh_token')
    ?? undefined
  const type =
    (queryParams.type as string | undefined)
    ?? hashParams.get('type')
    ?? undefined

  return { accessToken, refreshToken, type }
}
