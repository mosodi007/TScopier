/** In-memory cache for Telegram channel picker (no sessionStorage on native). */

export interface TgChannelListItem {
  id: string
  title: string
  username: string
  members_count: number
}

interface CacheEntry {
  channels: TgChannelListItem[]
  fetchedAt: number
}

const TTL_MS = 24 * 60 * 60 * 1000
const memory = new Map<string, CacheEntry>()

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt <= TTL_MS
}

export function getCachedTgChannels(userId: string): TgChannelListItem[] | null {
  const entry = memory.get(userId)
  if (entry && isFresh(entry)) return entry.channels
  if (entry) memory.delete(userId)
  return null
}

export function setCachedTgChannels(userId: string, channels: TgChannelListItem[]): void {
  memory.set(userId, { channels, fetchedAt: Date.now() })
}

export function invalidateTgChannelsCache(userId?: string): void {
  if (userId) memory.delete(userId)
  else memory.clear()
}
