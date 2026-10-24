<script setup lang="ts">
import { keepPreviousData, useInfiniteQuery } from '@tanstack/vue-query'
import { computed, onUnmounted, ref, watch } from 'vue'
import { fetchCustomers } from '../api/customers'
import ModelSettingsModal from '../components/ModelSettingsModal.vue'
import type {
  Customer,
  CustomerSortField,
  SortDirection,
} from '../types/customers'

const PAGE_SIZE = 10
const FILTERS_DEBOUNCE_MS = 400

const STATUS_LABELS: Record<Customer['status'], string> = {
  active: 'Активен',
  suspended: 'Приостановлен',
  prolong_wait: 'Ждёт продления',
  deleted: 'Удалён',
  blocked: 'Заблокирован',
  insufficient_data: 'Мало данных',
}

interface TableColumn {
  label: string
  sortField?: CustomerSortField
  numeric?: boolean
}

const TABLE_COLUMNS: TableColumn[] = [
  { label: 'ID', sortField: 'id', numeric: true },
  { label: 'Email/Username', sortField: 'email' },
  { label: 'Баланс', sortField: 'balance', numeric: true },
  { label: 'К выводу', numeric: true },
  { label: 'Бонус', numeric: true },
  { label: 'Пополнено', sortField: 'totalReplenished', numeric: true },
  { label: 'Оценка риска', sortField: 'riskScore', numeric: true },
  { label: 'Статус' },
  { label: 'Доход под риском', numeric: true },
  { label: 'Причины' },
]

const searchInput = ref('')
const search = ref('')
let searchTimer: number | undefined

watch(searchInput, (value) => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    search.value = value.trim()
  }, FILTERS_DEBOUNCE_MS)
})

function parseRiskScore(value: string | number): number | undefined {
  const raw = typeof value === 'number' ? String(value) : value.trim()

  if (raw === '') return undefined

  const parsed = Number(raw)

  if (!Number.isFinite(parsed)) return undefined

  return Math.min(100, Math.max(0, Math.round(parsed)))
}

const riskMinInput = ref<string | number>('')
const riskMaxInput = ref<string | number>('')
const riskMin = ref<number | undefined>(undefined)
const riskMax = ref<number | undefined>(undefined)
let riskTimer: number | undefined

watch([riskMinInput, riskMaxInput], () => {
  window.clearTimeout(riskTimer)
  riskTimer = window.setTimeout(() => {
    riskMin.value = parseRiskScore(riskMinInput.value)
    riskMax.value = parseRiskScore(riskMaxInput.value)
  }, FILTERS_DEBOUNCE_MS)
})

onUnmounted(() => {
  window.clearTimeout(searchTimer)
  window.clearTimeout(riskTimer)
})

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

const isSettingsOpen = ref(false)

const query = useInfiniteQuery({
  queryKey: [
    'customers',
    sortField,
    sortDirection,
    search,
    riskMin,
    riskMax,
  ],
  queryFn: ({ pageParam }) =>
    fetchCustomers({
      cursorOn: sortField.value,
      sortDirection: sortDirection.value,
      cursorNext: pageParam ?? undefined,
      search: search.value || undefined,
      riskScoreMin: riskMin.value,
      riskScoreMax: riskMax.value,
      takeAmount: PAGE_SIZE,
    }),
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  placeholderData: keepPreviousData,
})

const rows = computed<Customer[]>(() =>
  (query.data.value?.pages ?? []).flatMap((page) => page.items),
)

const isInitialLoading = computed(
  () => rows.value.length === 0 && query.isPending.value,
)

const errorMessage = computed(() => query.error.value?.message ?? null)

const euroFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'EUR',
})

function formatMoney(cents: number): string {
  return euroFormat.format(cents / 100)
}

function retry(): void {
  void query.refetch()
}
</script>

<template>
  <section class="page">
    <div class="page-head">
      <h1>Клиенты и оценка риска</h1>
    </div>

    <div class="table-block">
      <div class="table-toolbar">
        <label class="toolbar-field search-field">
          <span>Поиск</span>
          <input
            v-model="searchInput"
            type="search"
            name="search"
            placeholder="Email или ID клиента…"
          />
        </label>

        <label class="toolbar-field">
          <span>Риск от</span>
          <input
            v-model="riskMinInput"
            type="number"
            name="riskScoreMin"
            min="0"
            max="100"
            placeholder="0"
          />
        </label>

        <label class="toolbar-field">
          <span>Риск до</span>
          <input
            v-model="riskMaxInput"
            type="number"
            name="riskScoreMax"
            min="0"
            max="100"
            placeholder="100"
          />
        </label>

        <button
          class="button button--ghost"
          type="button"
          @click="isSettingsOpen = true"
        >
          Настройки модели
        </button>
      </div>

      <div class="panel table-panel">
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                <th
                  v-for="column in TABLE_COLUMNS"
                  :key="column.label"
                  :class="{
                    num: column.numeric,
                    sortable: column.sortField !== undefined,
                    'is-sorted':
                      column.sortField !== undefined &&
                      sortField === column.sortField,
                  }"
                  :aria-sort="
                    column.sortField === undefined
                      ? undefined
                      : sortField === column.sortField
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                  "
                  @click="
                    column.sortField !== undefined &&
                      toggleSort(column.sortField)
                  "
                >
                  {{ column.label }}
                  <span
                    v-if="column.sortField !== undefined"
                    class="sort-arrow"
                    :class="{
                      'is-active':
                        column.sortField !== undefined &&
                        sortField === column.sortField,
                    }"
                  >
                    {{
                      column.sortField !== undefined &&
                        sortField === column.sortField
                        ? sortDirection === 'asc'
                          ? '↑'
                          : '↓'
                        : '↕'
                    }}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="customer in rows" :key="customer.id">
                <td class="id-cell">{{ customer.id }}</td>
                <td class="email">{{ customer.email }}</td>
                <td class="num">{{ formatMoney(customer.balance) }}</td>
                <td class="num">{{ formatMoney(customer.withdrawBalance) }}</td>
                <td class="num">
                  <span class="bonus-cell">
                    {{ formatMoney(customer.bonusBalance) }}
                    <span
                      class="badge mini-badge"
                      :class="`bonus--${customer.bonusState}`"
                    >
                      {{ customer.bonusState }}
                    </span>
                  </span>
                </td>
                <td class="num">{{ formatMoney(customer.totalReplenished) }}</td>
                <td class="num">
                  {{ customer.riskScore === null ? '—' : customer.riskScore }}
                </td>
                <td>
                  <span
                    class="badge status-badge"
                    :class="`status--${customer.status}`"
                  >
                    {{ STATUS_LABELS[customer.status] }}
                  </span>
                </td>
                <td class="num">{{ formatMoney(customer.revenueAtRisk) }}</td>
                <td class="reasons">
                  {{ customer.primaryReasons.join('; ') }}
                </td>
              </tr>
            </tbody>
          </table>

          <p v-if="isInitialLoading" class="table-empty muted">
            Загружаем клиентов…
          </p>

          <div v-else-if="query.isError.value" class="table-empty table-error">
            <p class="form-error" role="alert">
              {{ errorMessage ?? 'Не удалось загрузить клиентов' }}
            </p>
            <button class="button button--ghost" type="button" @click="retry">
              Повторить
            </button>
          </div>

          <p v-else-if="rows.length === 0" class="table-empty muted">
            Ничего не найдено
          </p>
        </div>

        <div class="table-footer">
          <p class="muted">Показано: {{ rows.length }}</p>
          <button
            v-if="query.hasNextPage.value"
            class="button"
            type="button"
            :disabled="query.isFetchingNextPage.value"
            @click="query.fetchNextPage()"
          >
            {{ query.isFetchingNextPage.value ? 'Загружаем…' : 'Загрузить ещё' }}
          </button>
        </div>
      </div>
    </div>

    <ModelSettingsModal :open="isSettingsOpen" @close="isSettingsOpen = false" />
  </section>
</template>

<style scoped>
/* Тулбар над таблицей: поиск и фильтры риска слева. */
.table-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-toolbar {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}

.toolbar-field input {
  width: 110px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-weight: 400;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.toolbar-field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.search-field {
  width: min(280px, 100%);
}

.search-field input {
  width: 100%;
}

/* Карточка таблицы. */
.table-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Горизонтальный скролл на узких экранах. */
.table-scroll {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table th {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.table td {
  padding: 12px;
  border-top: 1px solid var(--border);
  vertical-align: middle;
}

.table tbody tr:first-child td {
  border-top: 0;
}

/* Сортируемые заголовки. */
.table th.sortable {
  cursor: pointer;
  user-select: none;
}

.table th.sortable:hover {
  color: var(--text-h);
}

.table th.is-sorted {
  color: var(--text-h);
}

/* Стрелка сортировки: всегда на месте, чтобы буквы не скакали. */
.sort-arrow {
  display: inline-block;
  margin-left: 4px;
  color: var(--text-muted);
  font-size: 10px;
  opacity: 0.45;
}

.sort-arrow.is-active {
  color: var(--accent);
  opacity: 1;
}

/* Правое выравнивание и для th, и для td: специфичность выше, чем у .table th */
.table .num {
  text-align: right;
  white-space: nowrap;
}

td.num {
  font-family: var(--mono);
  font-size: 13px;
}

.id-cell {
  color: var(--text-muted);
  font-family: var(--mono);
  font-size: 13px;
}

.email {
  color: var(--text-h);
  white-space: nowrap;
}

.bonus-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.reasons {
  max-width: 260px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Цветные статусы клиентов. */
.status-badge {
  border: 1px solid transparent;
}

.status--active {
  background: rgba(34, 197, 94, 0.16);
  color: #15803d;
}

.status--suspended {
  background: rgba(245, 158, 11, 0.18);
  color: #a16207;
}

.status--prolong_wait {
  background: rgba(59, 130, 246, 0.16);
  color: #1d4ed8;
}

.status--deleted {
  background: rgba(120, 120, 120, 0.16);
  color: #5f6b7a;
}

.status--blocked {
  background: rgba(239, 68, 68, 0.16);
  color: #b91c1c;
}

.status--insufficient_data {
  background: var(--accent-bg);
  color: var(--text);
}

.mini-badge {
  padding: 2px 7px;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.bonus--locked {
  background: rgba(120, 120, 120, 0.16);
  color: var(--text-muted);
}

.bonus--unlocked {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

/* Пустое состояние и ошибка загрузки. */
.table-empty {
  padding: 32px 0;
  text-align: center;
}

.table-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.table-error .form-error {
  max-width: 480px;
  text-align: center;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

/* Более светлые подписи бейджей в тёмной теме. */
@media (prefers-color-scheme: dark) {
  .status--active,
  .bonus--unlocked {
    color: #4ade80;
  }

  .status--suspended {
    color: #fbbf24;
  }

  .status--prolong_wait {
    color: #60a5fa;
  }

  .status--deleted {
    color: #9ca3af;
  }

  .status--blocked {
    color: #f87171;
  }
}
</style>
