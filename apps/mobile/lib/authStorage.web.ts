const memory = new Map<string, string>()

function browserLocalStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null
    return globalThis.localStorage
  } catch {
    return null
  }
}

/**
 * expo-secure-store has no getValueWithKeyAsync on web / Node SSR.
 * Browser: localStorage. Expo Router SSR: in-memory (no session).
 */
export const authStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const store = browserLocalStorage()
    if (store) return store.getItem(key)
    return memory.get(key) ?? null
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const store = browserLocalStorage()
    if (store) {
      store.setItem(key, value)
      return
    }
    memory.set(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    const store = browserLocalStorage()
    if (store) {
      store.removeItem(key)
      return
    }
    memory.delete(key)
  },
}
