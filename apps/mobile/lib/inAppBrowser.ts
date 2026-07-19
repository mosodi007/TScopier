import * as WebBrowser from 'expo-web-browser'
import type { Session } from '@supabase/supabase-js'
import { webAppUrl } from '@/lib/openWebApp'

/** Append Supabase session tokens so the web app auths in the in-app browser. */
export function webAppUrlWithSession(path: string, session: Session | null | undefined): string {
  const base = webAppUrl(path)
  if (!session?.access_token || !session.refresh_token) return base
  const hash = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: String(session.expires_in ?? 3600),
    token_type: 'bearer',
  })
  return `${base}#${hash.toString()}`
}

/**
 * Opens a URL in an in-app browser sheet (SFSafariViewController / Chrome Custom Tabs).
 * Does not leave the app, and does not require a native rebuild for WebView.
 */
export async function openInAppBrowser(options: { url: string }): Promise<void> {
  await WebBrowser.openBrowserAsync(options.url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    controlsColor: '#0d9488',
    enableBarCollapsing: true,
    showTitle: true,
  })
}

export async function openWebAppInApp(
  path: string,
  options?: { session?: Session | null },
): Promise<void> {
  const url = options?.session
    ? webAppUrlWithSession(path, options.session)
    : webAppUrl(path)
  await openInAppBrowser({ url })
}
