import { z } from 'zod'
import { authSessionSchema } from '../schemas/auth'
import type { AuthSession, LoginCredentials } from '../types/auth'
import { AUTH_LOGIN_PATH, AUTH_LOGOUT_PATH, AUTH_REGISTER_PATH, AUTH_SESSION_PATH } from './endpoints'
import { apiRequest } from './http'

export function login(credentials: LoginCredentials): Promise<AuthSession> {
  return apiRequest(AUTH_LOGIN_PATH, authSessionSchema, {
    method: 'POST',
    body: credentials,
    auth: false,
  })
}

export function fetchSession(): Promise<AuthSession> {
  return apiRequest(AUTH_SESSION_PATH, authSessionSchema, {
    method: 'GET',
    auth: false,
  })
}

export async function logout(): Promise<void> {
  await apiRequest(AUTH_LOGOUT_PATH, z.unknown(), {
    method: 'POST',
    auth: false,
  })
}

export function register(credentials: LoginCredentials): Promise<AuthSession> {
  return apiRequest(AUTH_REGISTER_PATH, authSessionSchema, {
    method: 'POST',
    body: credentials,
    auth: false,
  })
}
