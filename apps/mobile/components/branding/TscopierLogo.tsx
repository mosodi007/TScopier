import { Image, type ImageStyle, type StyleProp } from 'react-native'
import { useTheme } from '@/context/ThemeContext'

const logoLight = require('@/assets/images/tscopierlogo.png')
const logoDark = require('@/assets/images/tscopierlogo-dark.png')

interface TscopierLogoProps {
  style?: StyleProp<ImageStyle>
  height?: number
}

export function TscopierLogo({ style, height = 32 }: TscopierLogoProps) {
  const { isDark } = useTheme()

  return (
    <Image
      source={isDark ? logoDark : logoLight}
      accessibilityLabel="TScopier"
      resizeMode="contain"
      style={[{ height, width: height * 4.2, maxWidth: '100%' }, style]}
    />
  )
}
