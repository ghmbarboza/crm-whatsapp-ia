const STORAGE_PREFIX = 'crm_auth_lockout_'
export const MAX_LOGIN_ATTEMPTS = 5
export const LOCKOUT_DURATION_MS = 10 * 60 * 1000

interface LockoutEntry {
  attempts: number
  lockedUntil: number | null
}

function storageKey(email: string): string {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`
}

function readEntry(email: string): LockoutEntry {
  try {
    const raw = localStorage.getItem(storageKey(email))
    if (!raw) return { attempts: 0, lockedUntil: null }
    return JSON.parse(raw) as LockoutEntry
  } catch {
    return { attempts: 0, lockedUntil: null }
  }
}

function writeEntry(email: string, entry: LockoutEntry): void {
  localStorage.setItem(storageKey(email), JSON.stringify(entry))
}

export function getLockoutStatus(email: string): {
  locked: boolean
  remainingMs: number
  attempts: number
} {
  const entry = readEntry(email)
  const now = Date.now()

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      locked: true,
      remainingMs: entry.lockedUntil - now,
      attempts: entry.attempts,
    }
  }

  if (entry.lockedUntil && entry.lockedUntil <= now) {
    writeEntry(email, { attempts: 0, lockedUntil: null })
    return { locked: false, remainingMs: 0, attempts: 0 }
  }

  return { locked: false, remainingMs: 0, attempts: entry.attempts }
}

export function recordFailedLoginAttempt(email: string): {
  locked: boolean
  attempts: number
  remainingMs: number
} {
  const entry = readEntry(email)
  const attempts = entry.attempts + 1
  const locked = attempts >= MAX_LOGIN_ATTEMPTS
  const lockedUntil = locked ? Date.now() + LOCKOUT_DURATION_MS : null

  writeEntry(email, { attempts: locked ? MAX_LOGIN_ATTEMPTS : attempts, lockedUntil })

  return {
    locked,
    attempts,
    remainingMs: locked ? LOCKOUT_DURATION_MS : 0,
  }
}

export function clearLoginLockout(email: string): void {
  localStorage.removeItem(storageKey(email))
}

export function formatLockoutRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
