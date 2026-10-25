import { computed, reactive } from 'vue'
import { authSessionSchema } from '../schemas/auth'
import type { AuthSession, User } from '../types/auth'

const STORAGE_KEY = 'churn_dashboard_session'

interface AuthState {
  accessToken: string | null
  user: User | null
}

function emptyState(): AuthState {
  return {
    accessToken: null,
    user: null,
  }
}

const state = reactive<AuthState>(emptyState())

const isAuthenticated = computed(() => Boolean(state.accessToken && state.user))
const displayName = computed(() => state.user?.username ?? '')

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isExpired(session: AuthSession): boolean {
  return new Date(session.expiresAt).getTime() <= Date.now()
}

function forgetStoredSession(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

function persistSession(session: AuthSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    forgetStoredSession()
  }
}

function setSession(session: AuthSession): void {
  state.accessToken = session.token
  state.user = session.user
  persistSession(session)
}

function clearSession(): void {
  Object.assign(state, emptyState())
  forgetStoredSession()
}

function restoreSession(): AuthSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)

  if (!raw) return null

  const parsed = authSessionSchema.safeParse(parseJson(raw))

  if (!parsed.success || isExpired(parsed.data)) {
    forgetStoredSession()
    return null
  }

  return parsed.data
}

export function useAuth() {
  return {
    state,
    isAuthenticated,
    displayName,
    setSession,
    clearSession,
    restoreSession,
  }
}
