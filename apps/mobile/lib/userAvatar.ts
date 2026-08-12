import type { User } from '@supabase/supabase-js'

export type UserInitialsSource = {
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
}

export function userInitials(profile: UserInitialsSource, email?: string | null): string {
  const first = profile.first_name?.trim()
  const last = profile.last_name?.trim()
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()
  const display = profile.display_name?.trim()
  if (display) return display.slice(0, 2).toUpperCase()
  return email?.slice(0, 2).toUpperCase() ?? 'U'
}

function pickAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function avatarFromRecord(record: Record<string, unknown> | undefined): string | null {
  if (!record) return null
  return (
    pickAvatarUrl(record.avatar_url) ??
    pickAvatarUrl(record.picture) ??
    pickAvatarUrl(record.photo_url)
  )
}

export function resolveUserAvatarUrl(user: User | null | undefined): string | null {
  if (!user) return null
  const fromMeta = avatarFromRecord(user.user_metadata as Record<string, unknown> | undefined)
  if (fromMeta) return fromMeta
  for (const identity of user.identities ?? []) {
    const fromIdentity = avatarFromRecord(identity.identity_data as Record<string, unknown> | undefined)
    if (fromIdentity) return fromIdentity
  }
  return null
}

export function resolveDisplayName(
  profile: UserInitialsSource,
  email?: string | null,
): string {
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
  if (full) return full
  if (profile.display_name?.trim()) return profile.display_name.trim()
  if (email) return email.split('@')[0] ?? 'User'
  return 'User'
}
