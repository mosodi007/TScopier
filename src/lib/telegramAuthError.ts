export const TELEGRAM_ALREADY_LINKED_ERROR = 'TELEGRAM_ALREADY_LINKED'
export const NO_PENDING_PHONE_AUTH_ERROR = 'NO_PENDING_PHONE_AUTH'

type TelegramAuthErrorPayload = {
  code?: unknown
  error?: unknown
  message?: unknown
}

export type TelegramAuthErrorMessages = {
  telegramAlreadyLinked: string
  noPendingQr?: string
  noPendingPhoneAuth?: string
}

export function isNoPendingPhoneAuthError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const rec = error as TelegramAuthErrorPayload
    if (rec.code === NO_PENDING_PHONE_AUTH_ERROR) return true
    return isNoPendingPhoneAuthError(rec.error ?? rec.message)
  }
  if (error === NO_PENDING_PHONE_AUTH_ERROR) return true
  if (typeof error !== 'string') return false
  return (
    /no pending auth flow/i.test(error)
    || /login session expired/i.test(error)
    || /call send_code first/i.test(error)
  )
}

export function resolveTelegramAuthError(
  error: unknown,
  fallback: string,
  messages: TelegramAuthErrorMessages,
): string {
  if (error && typeof error === 'object') {
    const rec = error as TelegramAuthErrorPayload
    if (rec.code === TELEGRAM_ALREADY_LINKED_ERROR) {
      return messages.telegramAlreadyLinked
    }
    if (rec.code === 'NO_PENDING_QR') {
      return messages.noPendingQr ?? 'QR login expired. Please start again.'
    }
    if (isNoPendingPhoneAuthError(rec)) {
      return messages.noPendingPhoneAuth
        ?? 'Login session expired. Go back and request a new verification code.'
    }
    return resolveTelegramAuthError(rec.error ?? rec.message, fallback, messages)
  }
  if (error === TELEGRAM_ALREADY_LINKED_ERROR) {
    return messages.telegramAlreadyLinked
  }
  if (error === 'NO_PENDING_QR') {
    return messages.noPendingQr ?? 'QR login expired. Please start again.'
  }
  if (isNoPendingPhoneAuthError(error)) {
    return messages.noPendingPhoneAuth
      ?? 'Login session expired. Go back and request a new verification code.'
  }
  if (typeof error === 'string' && error.trim()) {
    return error
  }
  return fallback
}
