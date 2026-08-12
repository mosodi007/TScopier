import { Image, type ImageStyle, type StyleProp } from 'react-native'
import { useTheme } from '@/context/ThemeContext'

const logoLight = require('@/assets/images/tscopierlogo.png')
const logoDark = require('@/assets/images/tscopierlogo-dark.png')

interface TscopierLogoProps {
  style?: StyleProp<ImageStyle>
  height?: number
}

/** Header wordmark size — keep in sync with AppHeader min height. */
export const TSCOPIER_LOGO_HEADER_HEIGHT = 28

export function TscopierLogo({ style, height = TSCOPIER_LOGO_HEADER_HEIGHT }: TscopierLogoProps) {
  const { isDark } = useTheme()
  const width = Math.round(height * 4.2)

  return (
    <Image
      source={isDark ? logoDark : logoLight}
      accessibilityLabel="TScopier"
      resizeMode="contain"
      style={[{ height, width, flexShrink: 0 }, style]}
    />
  )
}
