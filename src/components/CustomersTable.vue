<script setup lang="ts">
import { formatMoney } from '../lib/format'
import type {
  Customer,
  CustomerSortField,
  SortDirection,
} from '../types/customers'

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

const STATUS_LABELS: Record<Customer['status'], string> = {
  active: 'Активен',
  suspended: 'Приостановлен',
  prolong_wait: 'Ждёт продления',
  deleted: 'Удалён',
  blocked: 'Заблокирован',
  insufficient_data: 'Мало данных',
}

const props = defineProps<{
  rows: Customer[]
  sortField: CustomerSortField
  sortDirection: SortDirection
}>()

const emit = defineEmits<{
  'toggle-sort': [field: CustomerSortField]
}>()

function isSorted(column: TableColumn): boolean {
  return column.sortField !== undefined && props.sortField === column.sortField
}

// Стрелка видна всегда, чтобы колонки не прыгали при первом клике.
function sortIcon(column: TableColumn): string {
  return isSorted(column) ? (props.sortDirection === 'asc' ? '↑' : '↓') : '↕'
}

function ariaSort(
  column: TableColumn,
): 'ascending' | 'descending' | 'none' | undefined {
  if (column.sortField === undefined) return undefined

  if (!isSorted(column)) return 'none'

  return props.sortDirection === 'asc' ? 'ascending' : 'descending'
}

function onHeaderClick(column: TableColumn): void {
  if (column.sortField === undefined) return

  emit('toggle-sort', column.sortField)
}
</script>

<template>
  <table class="table">
    <thead>
      <tr>
        <th
          v-for="column in TABLE_COLUMNS"
          :key="column.label"
          :class="{
            num: column.numeric,
            sortable: column.sortField !== undefined,
            'is-sorted': isSorted(column),
          }"
          :aria-sort="ariaSort(column)"
          @click="onHeaderClick(column)"
        >
          {{ column.label }}
          <span
            v-if="column.sortField !== undefined"
            class="sort-arrow"
            :class="{ 'is-active': isSorted(column) }"
          >
            {{ sortIcon(column) }}
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
</template>

<style scoped>
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
