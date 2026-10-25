<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { fetchAnalyticsSummary } from '../api/analytics'
import { fetchCustomers } from '../api/customers'
import CustomerDetailModal from '../components/CustomerDetailModal.vue'
import { formatMoney } from '../lib/format'

const summaryQuery = useQuery({
  queryKey: ['analytics-summary'],
  queryFn: fetchAnalyticsSummary,
})


const summary = computed(() => summaryQuery.data.value)

const TOP_RISK_SIZE = 5

const topRiskQuery = useQuery({
  queryKey: ['customers', 'top-risk'],
  queryFn: () =>
    fetchCustomers({
      cursorOn: 'riskScore',
      sortDirection: 'desc',
      takeAmount: TOP_RISK_SIZE,
    }),
})

const topRiskCustomers = computed(() => topRiskQuery.data.value?.items ?? [])

const selectedCustomerId = ref<number | null>(null)

// Производные KPI: считаем из уже загруженных денег, бэк для этого не нужен.
const revenueAtRiskShare = computed(() => {
  const financials = summary.value?.financials

  if (!financials || financials.totalMonthlyRecurringRevenue <= 0) return null

  return financials.revenueAtRisk / financials.totalMonthlyRecurringRevenue
})

function percentText(share: number | null): string {
  return share === null ? '—' : `${Math.round(share * 100)}%`
}

// Больше 100% бывает только на кривых данных модели — подсвечиваем,
// но не прячем: полоса зажата на 100%, а цифра показывает правду.
function isOverFull(share: number | null): boolean {
  return share !== null && share > 1
}

function barWidth(share: number | null): string {
  if (share === null) return '0%'

  return `${Math.min(100, Math.max(2, Math.round(share * 100)))}%`
}

function riskScoreClass(score: number | null): string {
  if (score === null) return 'top-score--none'
  if (score >= 66) return 'top-score--high'
  if (score >= 33) return 'top-score--medium'

  return 'top-score--low'
}

const CURRENCY_LABELS = [
  { key: "EUR_CENTS", label: "Евроценты" },
  { key: "RUB", label: "Российский рубль" },
  { key: "USD", label: "Доллары США" },
]

// Незнакомый код показываем как есть, чтобы не солгать подписью.
const currencyLabel = computed(() => {
  const code = summary.value?.financials.currency

  return (
    CURRENCY_LABELS.find((item) => item.key === code)?.label ?? code ?? ''
  )
})

const analyticsCurrency = computed(
  () => summary.value?.financials.currency ?? 'EUR_CENTS',
)

const RISK_LEVELS = [
  { key: 'high', label: 'Высокий риск' },
  { key: 'medium', label: 'Средний риск' },
  { key: 'low', label: 'Низкий риск' },
  { key: 'insufficientData', label: 'Мало данных' },
] as const

type RiskKey = (typeof RISK_LEVELS)[number]['key']

const DONUT_RADIUS = 52
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

// Геометрию считаем по count: процентные доли сервера могут не сходиться в 100%.
const riskSlices = computed(() => {
  const distribution = summary.value?.riskDistribution
  if (!distribution) return []

  const levels = RISK_LEVELS.map((level) => ({
    ...level,
    stat: distribution[level.key as RiskKey],
  }))
  const total = levels.reduce((sum, level) => sum + level.stat.count, 0)

  if (total <= 0) return []

  let offset = 0

  return levels.map((level) => {
    const dash = (level.stat.count / total) * DONUT_CIRCUMFERENCE
    const slice = {
      ...level,
      dash,
      offset,
    }

    offset += dash

    return slice
  })
})

const riskTotal = computed(() =>
  riskSlices.value.reduce((sum, slice) => sum + slice.stat.count, 0),
)

const FINANCIAL_STATS = [
  { key: 'totalMonthlyRecurringRevenue', label: 'MRR' },
  { key: 'revenueAtRisk', label: 'Доход под риском' },
  { key: 'expectedLoss', label: 'Ожидаемые потери' },
  { key: 'immediateBalanceDeficit', label: 'Дефицит балансов' },
] as const

type FinancialKey = (typeof FINANCIAL_STATS)[number]['key']

const financialStats = computed(() => {
  const financials = summary.value?.financials

  if (!financials) return []

  return FINANCIAL_STATS.map((stat) => ({
    ...stat,
    value: financials[stat.key as FinancialKey],
  }))
})

const reasons = computed(() =>
  [...(summary.value?.reasonsBreakdown ?? [])].sort(
    (a, b) => b.affectedCustomersCount - a.affectedCustomersCount,
  ),
)

const reasonsMax = computed(
  () => Math.max(1, ...reasons.value.map((item) => item.affectedCustomersCount)),
)

function reasonWidth(count: number): string {
  return `${Math.max(2, Math.round((count / reasonsMax.value) * 100))}%`
}

// Периоды приходят строкой ('2025-10' или дата) — красиво форматируем месяцы,
// остальное показываем как есть.

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <section class="page">
    <div class="page-head">
      <h1 class="main-label">Аналитика</h1>
    </div>

    <p v-if="summaryQuery.isPending.value" class="muted">
      Загружаем сводку…
    </p>

    <div v-else-if="summaryQuery.isError.value" class="panel analytics-error">
      <p class="form-error" role="alert">
        {{
          summaryQuery.error.value?.message ??
          'Не удалось загрузить сводную аналитику'
        }}
      </p>
      <button
        class="button button--ghost"
        type="button"
        @click="summaryQuery.refetch()"
      >
        Повторить
      </button>
    </div>

    <template v-else-if="summary">
      <p class="meta-line muted">
        Данные на {{ formatDateTime(summary.lastCalculatedAt) }} · валюта:
        {{ currencyLabel }}
      </p>

      <div class="analytics-grid">
        <div class="panel summary-card">
          <h3>Клиенты по уровням риска</h3>

          <div class="risk-layout">
            <div class="donut-wrap">
              <svg viewBox="0 0 120 120" class="donut" aria-hidden="true">
                <circle class="donut-track" cx="60" cy="60" r="52" />
                <circle
                  v-for="slice in riskSlices"
                  :key="slice.key"
                  class="donut-slice"
                  :class="`risk--${slice.key}`"
                  cx="60"
                  cy="60"
                  r="52"
                  :stroke-dasharray="`${slice.dash} ${DONUT_CIRCUMFERENCE - slice.dash}`"
                  :stroke-dashoffset="`${-slice.offset}`"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <p class="donut-total">
                {{ summary.totalCustomers }}
                <span class="donut-total-caption muted">клиентов</span>
              </p>
            </div>

            <ul class="risk-legend">
              <li
                v-for="slice in riskSlices"
                :key="slice.key"
                class="risk-item"
              >
                <span
                  class="risk-dot"
                  :class="`risk-dot--${slice.key}`"
                />
                <span class="risk-label">{{ slice.label }}</span>
                <span class="risk-stats">
                  {{ slice.stat.count }} · {{ slice.stat.percentage }}%
                </span>
              </li>
            </ul>
          </div>

          <p v-if="riskTotal === 0" class="muted">
            Распределение появится после пересчёта модели
          </p>
        </div>

        <div class="panel summary-card">
          <h3>Деньги</h3>
          <div class="stat-grid">
            <div
              v-for="stat in financialStats"
              :key="stat.key"
              class="stat"
            >
              <dt>{{ stat.label }}</dt>
              <dd>{{ formatMoney(stat.value, analyticsCurrency) }}</dd>
            </div>
          </div>

          <div class="kpi">
            <div class="kpi-head">
              <span>Доля MRR под риском</span>
              <strong :class="{ 'kpi-alert': isOverFull(revenueAtRiskShare) }">
                {{ percentText(revenueAtRiskShare) }}
              </strong>
            </div>
            <div class="kpi-track">
              <div
                class="kpi-fill kpi-fill--risk"
                :style="{ width: barWidth(revenueAtRiskShare) }"
              />
            </div>
            <p class="muted kpi-caption">
              {{ formatMoney(summary.financials.revenueAtRisk, analyticsCurrency) }}
              из
              {{ formatMoney(summary.financials.totalMonthlyRecurringRevenue, analyticsCurrency) }}
              MRR
            </p>
          </div>
        </div>

        <div class="panel summary-card wide">
          <h3>Причины риска</h3>
          <div v-if="reasons.length" class="reason-list">
            <div
              v-for="item in reasons"
              :key="item.reason"
              class="reason-row"
            >
              <span class="reason-label">{{ item.label }}</span>
              <div class="reason-track">
                <div
                  class="reason-fill"
                  :style="{ width: reasonWidth(item.affectedCustomersCount) }"
                />
              </div>
              <span class="reason-count">
                {{ item.affectedCustomersCount }}
              </span>
            </div>
          </div>
          <p v-else class="muted">Причин пока нет — модель ещё не считала</p>
        </div>

        <div class="panel summary-card wide">
          <h3>Клиенты с высоким коэффициентом риска</h3>
          <p v-if="topRiskQuery.isPending.value" class="muted">
            Загружаем клиентов…
          </p>
          <p v-else-if="topRiskQuery.isError.value" class="muted">
            Не удалось загрузить топ клиентов по риску
          </p>
          <ul v-else-if="topRiskCustomers.length" class="top-list">
            <li
              v-for="customer in topRiskCustomers"
              :key="customer.id"
            >
              <button
                type="button"
                class="top-row"
                @click="selectedCustomerId = customer.id"
              >
                <span
                  class="top-score"
                  :class="riskScoreClass(customer.riskScore)"
                >
                  {{ customer.riskScore ?? '—' }}
                </span>
                <span class="top-email">{{ customer.email }}</span>
                <span class="top-money">
                  {{ formatMoney(customer.revenueAtRisk, analyticsCurrency) }}
                </span>
              </button>
            </li>
          </ul>
          <p v-else class="muted">Модель ещё не оценила ни одного клиента</p>
        </div>
      </div>
    </template>

    <CustomerDetailModal
      :open="selectedCustomerId !== null"
      :customer-id="selectedCustomerId"
      @close="selectedCustomerId = null"
    />
  </section>
</template>

<style scoped>

.main-label {
    color: var(--accent);
    font-size: 5em;
    margin-bottom: 0;
    margin-top: 0
}
.meta-line {
  margin: -12px 0 0;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.analytics-grid .wide {
  grid-column: 1 / -1;
}

@media (max-width: 820px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.summary-card h3 {
  margin: 0;
  font-size: 16px;
}

.analytics-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}

/* Дистрибуция риска: донат + легенда. */
.risk-layout {
  display: flex;
  align-items: center;
  gap: 24px;
}

.donut-wrap {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.donut {
  width: 170px;
  height: 170px;
}

.donut-track,
.donut-slice {
  fill: none;
  stroke-width: 14;
}

.donut-track {
  stroke: var(--surface-muted);
}

.donut-slice {
  stroke-linecap: butt;
}

.risk--high {
  stroke: #ef4444;
}

.risk--medium {
  stroke: #f59e0b;
}

.risk--low {
  stroke: #22c55e;
}

.risk--insufficientData {
  stroke: #6b7280;
}

.donut-total {
  position: absolute;
  margin: 0;
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 26px;
  font-weight: 600;
  text-align: center;
}

.donut-total-caption {
  display: block;
  font: 11px var(--sans);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.risk-legend {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  flex: 1;
  min-width: 0;
}

.risk-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.risk-dot {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  flex-shrink: 0;
}

.risk-dot--high {
  background: #ef4444;
}

.risk-dot--medium {
  background: #f59e0b;
}

.risk-dot--low {
  background: #22c55e;
}

.risk-dot--insufficientData {
  background: #6b7280;
}

.risk-label {
  flex: 1;
  color: var(--text);
  font-size: 16px;
  min-width: 0;
}

.risk-stats {
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 16px;
  white-space: nowrap;
}

/* Деньги. */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stat {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
}

.stat dt {
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stat dd {
  margin: 6px 0 0;
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 20px;
  line-height: 1.2;
}

/* Причины риска: горизонтальные бары. */
.reason-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reason-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.reason-label {
  width: 240px;
  flex-shrink: 0;
  color: var(--text);
}

.reason-track {
  flex: 1;
  min-width: 0;
  height: 10px;
  border-radius: 999px;
  background: var(--surface-muted);
  overflow: hidden;
}

.reason-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}

.reason-count {
  width: 48px;
  flex-shrink: 0;
  text-align: right;
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 12px;
}

@media (max-width: 820px) {
  .reason-row {
    flex-wrap: wrap;
  }

  .reason-label {
    width: auto;
    flex: 1;
  }
}

/* KPI-полоса внутри карточки денег. */
.kpi {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px dashed var(--border);
}

.kpi-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text);
}

.kpi-head strong {
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 20px;
  font-weight: 700;
}

.kpi-head strong.kpi-alert {
  color: var(--danger);
}

.kpi-track {
  height: 10px;
  margin-top: 8px;
  border-radius: 999px;
  background: var(--surface-muted);
  overflow: hidden;
}

.kpi-fill {
  height: 100%;
  border-radius: 999px;
}

.kpi-fill--risk {
  background: #ef4444;
}

.kpi-caption {
  margin: 6px 0 0;
  font-size: 12px;
}

/* Топ клиентов под риском. */
.top-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.top-row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.top-row:hover {
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.top-score {
  min-width: 48px;
  padding: 2px 8px;
  border-radius: 999px;
  font-family: var(--mono);
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.top-score--high {
  background: rgba(239, 68, 68, 0.16);
  color: #dc2626;
}

.top-score--medium {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.top-score--low {
  background: rgba(34, 197, 94, 0.16);
  color: #15803d;
}

.top-score--none {
  background: var(--bg);
  color: var(--text-muted);
}

.top-email {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text-h);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-money {
  flex-shrink: 0;
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 13px;
  white-space: nowrap;
}

@media (prefers-color-scheme: dark) {
  .top-score--high {
    color: #f87171;
  }

  .top-score--medium {
    color: #fbbf24;
  }

  .top-score--low {
    color: #4ade80;
  }
}
</style>
