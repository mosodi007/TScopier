/** TScopier brand tokens — aligned with web `src/index.css` and `tailwind.config.js`. */
export type ThemeMode = 'light' | 'dark'

export const tscTheme = {
  page: { light: '#f8fafc', dark: '#020617' },
  surface: { light: '#ffffff', dark: '#0f172a' },
  surfaceMuted: { light: '#f8fafc', dark: '#1e293b' },
  border: { light: '#e2e8f0', dark: '#334155' },
  borderSubtle: { light: '#f1f5f9', dark: '#1e293b' },
  text: { light: '#0f172a', dark: '#f8fafc' },
  textMuted: { light: '#64748b', dark: '#94a3b8' },
  primary: '#0d9488',
  primaryHover: '#0f766e',
  primaryMuted: { light: '#0d9488', dark: '#2dd4bf' },
  tabBar: { light: '#ffffff', dark: '#0f172a' },
  tabBarBorder: { light: '#e2e8f0', dark: '#1e293b' },
  loss: '#737373',
} as const

export function pageBackground(isDark: boolean): string {
  return isDark ? tscTheme.page.dark : tscTheme.page.light
}
