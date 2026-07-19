import { useState } from 'react'
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native'
import { Eye, EyeOff } from 'lucide-react-native'
import { cn } from '@/lib/cn'
import { useTheme } from '@/context/ThemeContext'

interface PasswordFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string
  hint?: string
  className?: string
}

export function PasswordField({ label, hint, className, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const { isDark } = useTheme()
  const iconColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <View className={cn('mb-4', className)}>
      <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <View className="relative">
        <TextInput
          className="rounded-lg border border-neutral-200 bg-white py-3 pl-3 pr-11 text-base text-neutral-900 font-sans dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          placeholderTextColor="#94a3b8"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          {...inputProps}
        />
        <Pressable
          onPress={() => setVisible(v => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-0 h-full justify-center"
        >
          {visible ? <EyeOff size={18} color={iconColor} /> : <Eye size={18} color={iconColor} />}
        </Pressable>
      </View>
      {hint ? (
        <Text className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">{hint}</Text>
      ) : null}
    </View>
  )
}
