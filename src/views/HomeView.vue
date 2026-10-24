<script setup lang="ts">
import { useInfiniteQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchCustomers } from '../api/customers'
import type { Customer } from '../types/customers'

const PAGE_SIZE = 4

const STATUS_LABELS: Record<Customer['status'], string> = {
  active: 'Активен',
  suspended: 'Приостановлен',
  prolong_wait: 'Ждёт продления',
  deleted: 'Удалён',
  blocked: 'Заблокирован',
  insufficient_data: 'Мало данных',
}

const query = useInfiniteQuery({
  queryKey: ['customers'],
  queryFn: ({ pageParam }) =>
    fetchCustomers({
      cursorOn: "id",
      cursorNext: pageParam ?? undefined,
      takeAmount: PAGE_SIZE,
    }),
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
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
      <p class="eyebrow">Аналитика</p>
      <h1>Клиенты и оценка риска</h1>
      <p class="lead">
        Список клиентов с балансами, бонусами и оценкой риска оттока.
      </p>
    </div>

    <div class="panel table-panel">
      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th class="num">Баланс</th>
              <th class="num">К выводу</th>
              <th class="num">Бонус</th>
              <th class="num">Пополнено</th>
              <th class="num">Оценка риска</th>
              <th>Статус</th>
              <th class="num">Доход под риском</th>
              <th>Причины</th>
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
                <span class="badge status-badge" :class="`status--${customer.status}`">
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
  </section>
</template>

<style scoped>
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
