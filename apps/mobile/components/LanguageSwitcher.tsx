import { useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native'
import { Check, ChevronDown } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocale } from '@/context/LocaleContext'
import { useTheme } from '@/context/ThemeContext'
import { LOCALES, type Locale } from '@tscopier/web-i18n/types'
import { tscTheme } from '@/lib/tscTheme'
import { cn } from '@/lib/cn'

interface LanguageSwitcherProps {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale()
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  const current = useMemo(
    () => LOCALES.find(l => l.code === locale) ?? LOCALES[0],
    [locale],
  )

  const sheetBg = isDark ? '#0f172a' : '#ffffff'
  const border = isDark ? '#334155' : '#e2e8f0'
  const titleColor = isDark ? '#f8fafc' : '#0f172a'
  const muted = isDark ? '#94a3b8' : '#64748b'

  const pick = (code: Locale) => {
    setLocale(code)
    setOpen(false)
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Language: ${current.label}`}
        className={cn(
          'flex-row items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 py-2 dark:border-neutral-700 dark:bg-neutral-800',
          className,
        )}
      >
        <Text className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
          {current.short}
        </Text>
        <ChevronDown size={14} color={isDark ? '#94a3b8' : '#64748b'} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(2,6,23,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={e => e.stopPropagation()}
            style={{
              backgroundColor: sheetBg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderColor: border,
              borderTopWidth: 1,
              maxHeight: '70%',
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor }}>
                Language
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: muted }}>
                Choose your preferred language
              </Text>
            </View>

            <FlatList
              data={LOCALES}
              keyExtractor={item => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.code === locale
                return (
                  <Pressable
                    onPress={() => pick(item.code)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      backgroundColor: selected
                        ? isDark
                          ? 'rgba(13,148,136,0.16)'
                          : 'rgba(13,148,136,0.08)'
                        : 'transparent',
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: selected ? '700' : '500',
                          color: selected ? tscTheme.primary : titleColor,
                        }}
                      >
                        {item.label}
                      </Text>
                      <Text style={{ marginTop: 2, fontSize: 12, color: muted }}>
                        {item.short}
                      </Text>
                    </View>
                    {selected ? <Check size={18} color={tscTheme.primary} /> : null}
                  </Pressable>
                )
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
