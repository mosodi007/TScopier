import { Image, Text, View, type ImageSourcePropType } from 'react-native'
import { cn } from '@/lib/cn'

const mt4Logo = require('@/assets/images/MT4.png')
const mt5Logo = require('@/assets/images/MT5.png')

export function platformLogoSource(platform: string | null | undefined): ImageSourcePropType | null {
  const p = (platform ?? '').trim().toUpperCase()
  if (p === 'MT4') return mt4Logo
  if (p === 'MT5') return mt5Logo
  return null
}

interface PlatformLogoProps {
  platform: string | null | undefined
  size?: number
  className?: string
}

/** Real MT4/MT5 artwork from public assets (copied into mobile images). */
export function PlatformLogo({ platform, size = 44, className }: PlatformLogoProps) {
  const source = platformLogoSource(platform)
  const label = (platform ?? 'MT').toUpperCase().slice(0, 3)

  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {source ? (
        <Image
          source={source}
          accessibilityLabel={label}
          style={{ width: size * 0.78, height: size * 0.78 }}
          resizeMode="contain"
        />
      ) : (
        <Text className="text-xs font-bold text-teal-700 dark:text-teal-400">{label}</Text>
      )}
    </View>
  )
}
