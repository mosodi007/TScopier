import { useIsFocused } from 'expo-router'

/** True only while this screen is the focused route (inactive tabs are false). */
export function useScreenActive(): boolean {
  return useIsFocused()
}
