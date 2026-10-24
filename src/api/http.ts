import type { ZodType } from 'zod'
import { authSessionSchema } from '../schemas/auth'
import { useAuth } from '../stores/auth'
import { AUTH_SESSION_PATH } from './endpoints'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

interface ErrorPayload {
  message?: string
}

export class ApiError<T = unknown> extends Error {
  readonly status: number
  readonly data: T | null

  constructor(message: string, status: number, data: T | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown
  headers?: HeadersInit
  auth?: boolean
}

async function readResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? response.json() : null
}

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const { setSession } = useAuth()

  try {
    const response = await fetch(`${API_BASE_URL}${AUTH_SESSION_PATH}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) return false

    const parsed = authSessionSchema.safeParse(await response.json())

    if (!parsed.success) return false

    setSession(parsed.data)

    return true
  } catch {
    return false
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export async function apiRequest<T>(
  path: string,
  schema: ZodType<T>,
  { method = 'GET', body, headers, auth = true, ...options }: RequestOptions = {},
  retry = true,
): Promise<T> {
  const { state, clearSession } = useAuth()
  const accessToken = auth ? state.accessToken : null

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  })

  const data = await readResponse(response)

  if (response.status === 401 && auth) {
    const refreshed = retry ? await refreshOnce() : false

    if (refreshed) {
      return apiRequest<T>(
        path,
        schema,
        { method, body, headers, auth, ...options },
        false,
      )
    }

    const hadSession = Boolean(state.accessToken || state.user)
    clearSession()

    if (hadSession) {
      window.dispatchEvent(new Event('auth:session-expired'))
    }
  }

  if (!response.ok) {
    const payload = data as ErrorPayload | null
    throw new ApiError(
      payload?.message ?? 'Не удалось выполнить запрос',
      response.status,
      data,
    )
  }

  const parsed = schema.safeParse(data)

  if (!parsed.success) {
    throw new ApiError('Некорректный ответ сервера', response.status, data)
  }

  return parsed.data
}
