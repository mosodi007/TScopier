import * as SecureStore from 'expo-secure-store'

/** Native-only. Web uses `authStorage.web.ts` (localStorage / memory). */
export const authStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}
