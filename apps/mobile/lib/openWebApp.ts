import * as WebBrowser from 'expo-web-browser'

const WEB_APP_ORIGIN = 'https://app.tscopier.ai'

export function webAppUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${WEB_APP_ORIGIN}${normalized}`
}

export async function openWebAppPath(path: string): Promise<void> {
  await WebBrowser.openBrowserAsync(webAppUrl(path))
}
