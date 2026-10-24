import { computed, reactive } from 'vue'
import type { AuthSession, User } from '../types/auth'

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

function setSession(session: AuthSession): void {
  state.accessToken = session.token
  state.user = session.user
}

function clearSession(): void {
  Object.assign(state, emptyState())
}

export function useAuth() {
  return {
    state,
    isAuthenticated,
    displayName,
    setSession,
    clearSession,
  }
}
