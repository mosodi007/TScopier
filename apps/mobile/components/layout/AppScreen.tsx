import { View } from 'react-native'
import { TscopierLogo } from '@/components/branding/TscopierLogo'
import { AppHeader } from '@/components/layout/AppHeader'
import { HomeSectionTitle } from '@/components/home/HomeSectionTitle'
import { Screen } from '@/components/ui'
import { cn } from '@/lib/cn'

interface AppScreenProps {
  /**
   * Top-bar title. Prefer leaving unset on tab screens so the brand logo is shown.
   * Pass a custom node only when you need to override the logo.
   */
  title?: React.ReactNode
  /** @deprecated Prefer `pageSubtitle` under the page title. Kept for rare header-only cases. */
  subtitle?: string
  /** Page heading below the brand header (Dashboard-style left title). */
  pageTitle?: string
  pageSubtitle?: string
  pageAction?: React.ReactNode
  children: React.ReactNode
  /** Hide top header actions (e.g. auth screens). */
  hideHeaderActions?: boolean
  /** Optional control before avatar/bell (e.g. add button). */
  headerTrailing?: React.ReactNode
  /** When true (default), show TScopier logo in the top bar unless `title` is set. */
  showBrandLogo?: boolean
  className?: string
  /**
   * When true, screen body can go edge-to-edge. Header + page title keep the same
   * horizontal inset as other tabs so the brand logo stays aligned.
   */
  noPadding?: boolean
}

export function AppScreen({
  title,
  subtitle,
  pageTitle,
  pageSubtitle,
  pageAction,
  children,
  hideHeaderActions = false,
  headerTrailing,
  showBrandLogo = true,
  className,
  noPadding = false,
}: AppScreenProps) {
  const headerTitle = title ?? (showBrandLogo ? <TscopierLogo /> : undefined)
  const hasHeader = Boolean(headerTitle || subtitle || !hideHeaderActions || headerTrailing)

  return (
    <Screen padded={!noPadding} className={className}>
      {hasHeader ? (
        <AppHeader
          title={headerTitle}
          subtitle={subtitle}
          trailing={headerTrailing}
          showActions={!hideHeaderActions}
          className={noPadding ? 'px-4' : undefined}
        />
      ) : null}

      {pageTitle ? (
        <View className={cn(noPadding && 'px-4')}>
          <HomeSectionTitle title={pageTitle} subtitle={pageSubtitle} action={pageAction} />
        </View>
      ) : null}

      <View className={cn('flex-1', noPadding && 'px-4')}>{children}</View>
    </Screen>
  )
}
