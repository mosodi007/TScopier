import AsyncStorage from '@react-native-async-storage/async-storage'

/** Bump when the welcome carousel is redesigned so users see it once more. */
const KEY = 'tscopier.welcome.seen.v2'

export async function hasSeenWelcome(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1'
  } catch {
    return false
  }
}

export async function markWelcomeSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1')
  } catch {
    // ignore
  }
}

export async function clearWelcomeSeen(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
