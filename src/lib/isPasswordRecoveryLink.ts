type RecoveryLocation = {
  pathname?: string
  search?: string
  hash?: string
}

function paramsFrom(raw: string | undefined): URLSearchParams {
  return new URLSearchParams(String(raw ?? '').replace(/^[?#]/, ''))
}

function hasRecoveryParams(params: URLSearchParams): boolean {
  const type = params.get('type')
  if (type === 'recovery') return true
  if (type && type !== 'recovery') return false
  return params.has('token_hash')
}

export function isPasswordRecoveryLocation(location: RecoveryLocation): boolean {
  return hasRecoveryParams(paramsFrom(location.hash))
    || hasRecoveryParams(paramsFrom(location.search))
}

export function passwordRecoveryRedirectPath(location: RecoveryLocation): string | null {
  if (!isPasswordRecoveryLocation(location)) return null
  if ((location.pathname ?? '') === '/reset-password') return null
  return `/reset-password${location.search ?? ''}${location.hash ?? ''}`
}

/** True when the current URL looks like a Supabase password-recovery redirect. */
export function isPasswordRecoveryLink(): boolean {
  return isPasswordRecoveryLocation(window.location)
}
