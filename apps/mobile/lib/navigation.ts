import type { LucideIcon } from 'lucide-react-native'
import {
  Activity,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  FlaskConical,
  Home,
  Landmark,
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
        | '/(app)/(tabs)/signals'
        | '/(app)/(tabs)/brokers'
        | '/(app)/(tabs)/channels'
        | '/(app)/(tabs)/trades'
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

/** Secondary destinations — primary tabs excluded. */
export const MOBILE_MORE_SECTIONS: MobileNavSection[] = [
  {
    id: 'trading',
    title: 'Trading',
    items: [
      {
        id: 'channels',
        label: 'Channels',
        icon: Radio,
        target: { kind: 'tab', href: '/(app)/(tabs)/channels' },
        description: 'Connect Telegram and manage signal channels',
      },
      {
        id: 'trades',
        label: 'Trades',
        icon: ChartNoAxesCombined,
        target: { kind: 'tab', href: '/(app)/(tabs)/trades' },
        description: 'Open and closed positions from linked brokers',
      },
    ],
  },
  {
    id: 'signals',
    title: 'Signals',
    items: [
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
        label: 'Settings',
        icon: Settings,
        target: { kind: 'stack', href: '/(app)/settings' },
      },
    ],
  },
]

/** Bottom tab bar order (Home → Brokers → Signals → Backtest → More). */
export const TAB_SCREEN_ORDER = [
  'dashboard',
  'brokers',
  'signals',
  'backtest',
  'more',
] as const

/** Hidden from the tab bar but still registered as tab routes (opened from More). */
export const HIDDEN_TAB_SCREENS = ['trades', 'channels'] as const

export const TAB_NAV_META = {
  dashboard: { label: 'Home', icon: Home },
  signals: { label: 'Signals', icon: SlidersHorizontal },
  brokers: { label: 'Brokers', icon: Landmark },
  channels: { label: 'Channels', icon: Radio },
  more: { label: 'More', icon: Menu },
  trades: { label: 'Trades', icon: ChartNoAxesCombined },
  backtest: { label: 'Backtest', icon: FlaskConical },
} as const
