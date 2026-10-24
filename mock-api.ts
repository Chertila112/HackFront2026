import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { z } from 'zod'
import {
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AUTH_SESSION_PATH,
} from './src/api/endpoints.ts'
import {
  authSessionSchema,
  loginCredentialsSchema,
  type User,
} from './src/schemas/auth.ts'

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_PATH = '/api/v1/auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000

interface DemoAccount {
  username: string
  password: string
  user: User
}

const demoAccounts: DemoAccount[] = [
  {
    username: 'demo',
    password: 'demo1234',
    user: {
      id: 'usr_demo',
      username: 'demo',
    },
  },
  {
    username: 'user',
    password: 'user1234',
    user: {
      id: 'usr_user',
      username: 'user',
    },
  },
]

const sessions = new Map<string, User>()

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()

      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'))
        req.destroy()
      }
    })

    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })

    req.on('error', reject)
  })
}

function sendValidationError(res: ServerResponse, error: z.ZodError): void {
  sendJson(res, 422, {
    message: 'Некорректные данные',
    errors: z.flattenError(error).fieldErrors,
  })
}

function createToken(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createExpiresAt(): string {
  return new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString()
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}

  if (!header) return cookies

  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue

    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()

    if (name) cookies[name] = decodeURIComponent(value)
  }

  return cookies
}

function buildRefreshCookie(
  req: Connect.IncomingMessage,
  value: string,
  maxAge: number,
): string {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''

  return `${REFRESH_COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=${COOKIE_PATH}; Max-Age=${maxAge}${secure}`
}

function setRefreshCookie(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  token: string,
): void {
  res.setHeader('Set-Cookie', buildRefreshCookie(req, token, COOKIE_MAX_AGE))
}

function clearRefreshCookie(
  req: Connect.IncomingMessage,
  res: ServerResponse,
): void {
  res.setHeader('Set-Cookie', buildRefreshCookie(req, '', 0))
}

function allowPost(req: Connect.IncomingMessage, res: ServerResponse): boolean {
  if (req.method === 'POST') return true

  res.setHeader('Allow', 'POST')
  sendJson(res, 405, { message: 'Метод не поддерживается' })
  return false
}

function allowGet(req: Connect.IncomingMessage, res: ServerResponse): boolean {
  if (req.method === 'GET') return true

  res.setHeader('Allow', 'GET')
  sendJson(res, 405, { message: 'Метод не поддерживается' })
  return false
}

async function handleLogin(
  req: Connect.IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown

  try {
    body = await readJsonBody(req)
  } catch {
    sendJson(res, 400, { message: 'Некорректный JSON в теле запроса' })
    return
  }

  const parsed = loginCredentialsSchema.safeParse(body)

  if (!parsed.success) {
    sendValidationError(res, parsed.error)
    return
  }

  const { username, password } = parsed.data

  await new Promise((resolve) => setTimeout(resolve, 400))

  const account = demoAccounts.find(
    (item) => item.username === username && item.password === password,
  )

  if (!account) {
    sendJson(res, 401, { message: 'Неверный username или пароль' })
    return
  }

  const refreshToken = createToken('mock-refresh')
  sessions.set(refreshToken, account.user)
  setRefreshCookie(req, res, refreshToken)

  sendJson(
    res,
    200,
    authSessionSchema.parse({
      accessToken: createToken('mock-access'),
      expiresAt: createExpiresAt(),
      user: account.user,
    }),
  )
}

async function handleSession(
  req: Connect.IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const refreshToken = parseCookies(req.headers.cookie)[REFRESH_COOKIE]

  await new Promise((resolve) => setTimeout(resolve, 250))

  if (!refreshToken) {
    sendJson(res, 401, { message: 'Сессия не найдена' })
    return
  }

  const user = sessions.get(refreshToken)

  if (!user) {
    sendJson(res, 401, { message: 'Сессия недействительна' })
    return
  }

  sessions.delete(refreshToken)

  const nextRefreshToken = createToken('mock-refresh')
  sessions.set(nextRefreshToken, user)
  setRefreshCookie(req, res, nextRefreshToken)

  sendJson(
    res,
    200,
    authSessionSchema.parse({
      accessToken: createToken('mock-access'),
      expiresAt: createExpiresAt(),
      user,
    }),
  )
}

async function handleLogout(
  req: Connect.IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const refreshToken = parseCookies(req.headers.cookie)[REFRESH_COOKIE]

  await new Promise((resolve) => setTimeout(resolve, 150))

  if (refreshToken) {
    sessions.delete(refreshToken)
  }

  clearRefreshCookie(req, res)
  res.statusCode = 204
  res.end()
}

async function handleRequest(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
): Promise<void> {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')

  if (pathname === AUTH_LOGIN_PATH) {
    if (!allowPost(req, res)) return
    await handleLogin(req, res)
    return
  }

  if (pathname === AUTH_SESSION_PATH) {
    if (!allowGet(req, res)) return
    await handleSession(req, res)
    return
  }

  if (pathname === AUTH_LOGOUT_PATH) {
    if (!allowPost(req, res)) return
    await handleLogout(req, res)
    return
  }

  next()
}

export function mockApiPlugin(): Plugin {
  return {
    name: 'hackfront-mock-api',
    configureServer(server) {
      server.middlewares.use(handleRequest)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleRequest)
    },
  }
}
