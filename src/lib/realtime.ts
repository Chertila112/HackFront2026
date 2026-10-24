import * as signalR from '@microsoft/signalr'
import type { InfiniteData } from '@tanstack/vue-query'
import { fetchSession } from '../api/auth'
import { API_BASE_URL } from '../api/http'
import { useAuth } from '../stores/auth'
import type { Customer, CustomersPage } from '../types/customers'
import {
  customerRiskUpdatedSchema,
  modelRecalculatedSchema,
} from '../schemas/realtime'
import { queryClient } from './queryClient'

const HUB_PATH = '/hubs/analytics'
const RECONNECT_DELAYS_MS = [0, 2_000, 5_000, 10_000, 30_000]

let connection: signalR.HubConnection | null = null
let startPromise: Promise<void> | null = null

function resetCustomers(): void {
  void queryClient.resetQueries({ queryKey: ['customers'] })
}

function applyCustomerUpdates(updated: Customer[]): void {
  if (updated.length === 0) return

  const byId = new Map(updated.map((item) => [item.id, item]))

  queryClient.setQueriesData<InfiniteData<CustomersPage>>(
    { queryKey: ['customers'] },
    (cached) => {
      if (!cached) return cached

      return {
        ...cached,
        pages: cached.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => byId.get(item.id) ?? item),
        })),
      }
    },
  )
}

function handleModelRecalculated(payload: unknown): void {
  const parsed = modelRecalculatedSchema.safeParse(payload)

  if (!parsed.success) return

  resetCustomers()
}

function handleCustomerRiskUpdated(payload: unknown): void {
  const parsed = customerRiskUpdatedSchema.safeParse(payload)

  if (!parsed.success) return

  applyCustomerUpdates(parsed.data.updated)
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && /\b401\b|unauthorized/i.test(error.message)
}

function buildConnection(): signalR.HubConnection {
  const { state } = useAuth()

  return new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}${HUB_PATH}`, {
      accessTokenFactory: () => state.accessToken ?? '',
    })
    .withAutomaticReconnect(RECONNECT_DELAYS_MS)
    .build()
}

function registerHandlers(next: signalR.HubConnection): void {
  next.on('ModelRecalculated', handleModelRecalculated)
  next.on('CustomerRiskUpdated', handleCustomerRiskUpdated)
  next.onreconnected(() => {
    resetCustomers()
  })
}

async function startConnection(retryOnUnauthorized = true): Promise<void> {
  const { state } = useAuth()

  if (connection || !state.accessToken) return

  const next = buildConnection()
  registerHandlers(next)

  try {
    await next.start()
    connection = next
  } catch (error) {
    if (!retryOnUnauthorized || !isUnauthorizedError(error)) return

    try {
      await fetchSession()
    } catch {
      return
    }

    await startConnection(false)
  }
}

export function startRealtime(): Promise<void> {
  if (!startPromise) {
    startPromise = startConnection().finally(() => {
      startPromise = null
    })
  }

  return startPromise
}

export async function stopRealtime(): Promise<void> {
  const current = connection
  connection = null

  if (!current) return

  try {
    await current.stop()
  } catch {
    return
  }
}
