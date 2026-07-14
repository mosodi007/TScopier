import type { LucideIcon } from 'lucide-react-native'
import {
  Activity,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  FlaskConical,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Newspaper,
  Radio,
  Settings,
  Share2,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react-native'

export type MobileNavTarget =
  | {
      kind: 'tab'
      href:
        | '/(app)/(tabs)/dashboard'
        | '/(app)/(tabs)/brokers'
        | '/(app)/(tabs)/trades'
        | '/(app)/(tabs)/channels'
        | '/(app)/(tabs)/backtest'
        | '/(app)/(tabs)/more'
    }
  | { kind: 'stack'; href: string }
  | { kind: 'web'; path: string }
  | { kind: 'external'; url: string }

export interface MobileNavItem {
  id: string
  label: string
  icon: LucideIcon
  target: MobileNavTarget
  description?: string
}

export interface MobileNavSection {
  id: string
  title: string
  items: MobileNavItem[]
}

/** Mirrors web sidebar sections — primary tabs excluded from More. */
export const MOBILE_MORE_SECTIONS: MobileNavSection[] = [
  {
    id: 'general',
    title: 'General',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        target: { kind: 'tab', href: '/(app)/(tabs)/dashboard' },
      },
      {
        id: 'brokers',
        label: 'Brokers',
        icon: Landmark,
        target: { kind: 'tab', href: '/(app)/(tabs)/brokers' },
      },
      {
        id: 'trades',
        label: 'Trades',
        icon: ChartNoAxesCombined,
        target: { kind: 'tab', href: '/(app)/(tabs)/trades' },
      },
    ],
  },
  {
    id: 'signals',
    title: 'Signals',
    items: [
      {
        id: 'channels',
        label: 'Channels',
        icon: Radio,
        target: { kind: 'tab', href: '/(app)/(tabs)/channels' },
        description: 'Telegram channels & copier engine',
      },
      {
        id: 'backtest',
        label: 'Backtest',
        icon: FlaskConical,
        target: { kind: 'tab', href: '/(app)/(tabs)/backtest' },
      },
      {
        id: 'activities',
        label: 'Copier Engine',
        icon: Activity,
        target: { kind: 'stack', href: '/(app)/activities' },
      },
      {
        id: 'copier-logs',
        label: 'Copier Logs',
        icon: ClipboardList,
        target: { kind: 'stack', href: '/(app)/copier-logs' },
      },
      {
        id: 'signal-history',
        label: 'Signal History',
        icon: SlidersHorizontal,
        target: { kind: 'web', path: '/manage-signals' },
      },
      {
        id: 'performance',
        label: 'Performance',
        icon: TrendingUp,
        target: { kind: 'web', path: '/performance' },
      },
    ],
  },
  {
    id: 'tools',
    title: 'Trading Tools',
    items: [
      {
        id: 'market-news',
        label: 'Market News',
        icon: Newspaper,
        target: { kind: 'web', path: '/market-news' },
      },
      {
        id: 'economic-calendar',
        label: 'Economic Calendar',
        icon: CalendarDays,
        target: { kind: 'web', path: '/economic-calendar' },
      },
    ],
  },
  {
    id: 'membership',
    title: 'Membership',
    items: [
      {
        id: 'billing',
        label: 'Subscription & Billing',
        icon: CreditCard,
        target: { kind: 'stack', href: '/(app)/billing' },
      },
      {
        id: 'affiliate',
        label: 'Affiliate Program',
        icon: Share2,
        target: { kind: 'web', path: '/affiliate-program' },
      },
    ],
  },
  {
    id: 'help',
    title: 'Help',
    items: [
      {
        id: 'support',
        label: 'Live Chat & Support',
        icon: LifeBuoy,
        target: { kind: 'web', path: '/contact-support' },
      },
      {
        id: 'docs',
        label: 'Documentation',
        icon: BookOpen,
        target: { kind: 'external', url: 'https://docs.tscopier.ai' },
      },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    items: [
      {
        id: 'settings',
        label: 'Profile & Settings',
        icon: Settings,
        target: { kind: 'stack', href: '/(app)/settings' },
      },
      {
        id: 'telegram',
        label: 'Link Telegram',
        icon: Radio,
        target: { kind: 'stack', href: '/(app)/telegram-link' },
      },
      {
        id: 'channel-config',
        label: 'Channel Config',
        icon: SlidersHorizontal,
        target: { kind: 'stack', href: '/(app)/channel-config' },
      },
    ],
  },
]

export const TAB_NAV_META = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  brokers: { label: 'Brokers', icon: Landmark },
  trades: { label: 'Trades', icon: ChartNoAxesCombined },
  channels: { label: 'Channels', icon: Radio },
  backtest: { label: 'Backtest', icon: FlaskConical },
  more: { label: 'More', icon: Menu },
} as const
