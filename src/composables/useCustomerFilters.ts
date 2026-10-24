import { ref } from 'vue'
import type { CustomerSortField, SortDirection } from '../types/customers'
import { useDebouncedRef } from './useDebouncedRef'

const FILTERS_DEBOUNCE_MS = 400
const RISK_SCORE_LIMIT = 100

// v-model на <input type="number"> приводит значение к number (looseToNumber),
// поэтому поле фильтра приходит то строкой, то числом.
function parseEmail(value: string | number): string {
  return typeof value === 'number' ? String(value) : value.trim()
}

function parseRiskScore(value: string | number): number | undefined {
  const raw = typeof value === 'number' ? String(value) : value.trim()

  if (raw === '') return undefined

  const parsed = Number(raw)

  if (!Number.isFinite(parsed)) return undefined

  return Math.min(RISK_SCORE_LIMIT, Math.max(0, Math.round(parsed)))
}

export function useCustomerFilters() {
  const searchInput = ref<string | number>('')
  const search = useDebouncedRef(searchInput, FILTERS_DEBOUNCE_MS, parseEmail, '')

  const riskMinInput = ref<string | number>('')
  const riskMaxInput = ref<string | number>('')

  const riskMin = useDebouncedRef(
    riskMinInput,
    FILTERS_DEBOUNCE_MS,
    parseRiskScore,
    undefined,
  )

  const riskMax = useDebouncedRef(
    riskMaxInput,
    FILTERS_DEBOUNCE_MS,
    parseRiskScore,
    undefined,
  )

  const sortField = ref<CustomerSortField>('id')
  const sortDirection = ref<SortDirection>('desc')

  function toggleSort(field: CustomerSortField): void {
    if (sortField.value === field) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
      return
    }

    sortField.value = field
    sortDirection.value = 'asc'
  }

  return {
    searchInput,
    search,
    riskMinInput,
    riskMaxInput,
    riskMin,
    riskMax,
    sortField,
    sortDirection,
    toggleSort,
  }
}
