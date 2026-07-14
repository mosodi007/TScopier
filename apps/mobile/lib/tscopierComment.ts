export interface ParsedTscopierComment {
  channelSlug: string | null
  signalIdPrefix: string
}

export const TSCOPIER_COMMENT_PREFIX = 'TScopier:'
export const LEGACY_TSCOPIER_COMMENT_PREFIX = 'TSCopier:'
export const CHANNEL_COMMENT_SLUG_MAX = 12

export function isTscopierComment(comment: string | null | undefined): boolean {
  if (!comment?.trim()) return false
  const trimmed = comment.trim()
  return (
    trimmed.startsWith(TSCOPIER_COMMENT_PREFIX)
    || trimmed.startsWith(LEGACY_TSCOPIER_COMMENT_PREFIX)
  )
}

function stripTscopierCommentPrefix(trimmed: string): string | null {
  if (trimmed.startsWith(TSCOPIER_COMMENT_PREFIX)) {
    return trimmed.slice(TSCOPIER_COMMENT_PREFIX.length)
  }
  if (trimmed.startsWith(LEGACY_TSCOPIER_COMMENT_PREFIX)) {
    return trimmed.slice(LEGACY_TSCOPIER_COMMENT_PREFIX.length)
  }
  return null
}

export function sanitizeChannelCommentSlug(raw: string): string {
  const trimmed = raw.trim().replace(/^@/, '')
  if (!trimmed) return ''
  const alnum = trimmed.replace(/[^a-zA-Z0-9]/g, '')
  if (alnum.length >= 2) return alnum.slice(0, CHANNEL_COMMENT_SLUG_MAX)
  const collapsed = trimmed.replace(/[^a-zA-Z0-9]+/g, '')
  return collapsed.slice(0, CHANNEL_COMMENT_SLUG_MAX) || 'ch'
}

export function parseTscopierComment(comment: string | null | undefined): ParsedTscopierComment | null {
  if (!comment?.trim()) return null
  const trimmed = comment.trim()
  const body = stripTscopierCommentPrefix(trimmed)
  if (body === null) return null

  const segments = body.split(':').map(s => s.trim()).filter(Boolean)
  if (segments.length === 0) return null

  const id8From = (s: string): string | null => {
    const m = s.match(/^([a-f0-9]{8})/i)
    return m ? m[1]!.toLowerCase() : null
  }

  if (segments.length === 1) {
    const prefix = id8From(segments[0]!)
    return prefix ? { channelSlug: null, signalIdPrefix: prefix } : null
  }

  const firstPrefix = id8From(segments[0]!)
  if (firstPrefix) {
    return { channelSlug: null, signalIdPrefix: firstPrefix }
  }

  const secondPrefix = id8From(segments[1] ?? '')
  if (secondPrefix) {
    return { channelSlug: segments[0]!, signalIdPrefix: secondPrefix }
  }

  return null
}
