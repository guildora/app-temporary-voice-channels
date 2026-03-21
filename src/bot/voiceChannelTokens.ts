const ORDERED_BASE_TOKENS = [
  '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎'
]

const HEART_FALLBACK = '❤️'

function isTokenAvailable(token: string, usedTokens: Set<string>, pendingTokens: Set<string>): boolean {
  return !usedTokens.has(token) && !pendingTokens.has(token)
}

export function getOrderedBaseTokens(): string[] {
  return [...ORDERED_BASE_TOKENS]
}

export function buildTemporaryChannelName(token: string, channelName: string): string {
  return `${token} ${channelName}`
}

export function getNextAvailableToken(
  usedTokens: Set<string>,
  pendingTokens: Set<string>,
  preferredToken?: string
): string {
  const preferred = typeof preferredToken === 'string' ? preferredToken.trim() : ''
  if (preferred && isTokenAvailable(preferred, usedTokens, pendingTokens)) {
    return preferred
  }

  for (const token of ORDERED_BASE_TOKENS) {
    if (isTokenAvailable(token, usedTokens, pendingTokens)) {
      return token
    }
  }

  let multiplier = 2
  while (multiplier < 256) {
    const token = HEART_FALLBACK.repeat(multiplier)
    if (isTokenAvailable(token, usedTokens, pendingTokens)) {
      return token
    }
    multiplier += 1
  }

  return `${HEART_FALLBACK}${Date.now()}`
}

export function isValidManagedVoiceName(name: string, channelName = 'Voice Room'): boolean {
  return extractToken(name, channelName) !== null
}

export function extractToken(name: string, channelName = 'Voice Room'): string | null {
  const normalized = typeof name === 'string' ? name.trim() : ''
  const suffix = ` ${channelName}`

  if (!normalized || !normalized.endsWith(suffix)) {
    return null
  }

  const token = normalized.slice(0, normalized.length - suffix.length).trim()
  return token.length > 0 ? token : null
}
