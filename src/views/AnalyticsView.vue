<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchAnalyticsSummary } from '../api/analytics'
import { formatMoney } from '../lib/format'

const summaryQuery = useQuery({
  queryKey: ['analytics-summary'],
  queryFn: fetchAnalyticsSummary,
})

const summary = computed(() => summaryQuery.data.value)

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

const churnRows = computed(() => summary.value?.churnDynamics ?? [])

const churnMax = computed(() =>
  Math.max(
    1,
    ...churnRows.value.flatMap((row) => [row.factDeleted, row.forecastRisk]),
  ),
)

function churnHeight(value: number): string {
  return `${Math.max(2, Math.round((value / churnMax.value) * 100))}%`
}

const MONTH_LABELS = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
]

// Периоды приходят строкой ('2025-10' или дата) — красиво форматируем месяцы,
// остальное показываем как есть.
function formatPeriod(period: string): string {
  const monthly = /^(\d{4})-(\d{2})$/.exec(period)

  if (!monthly) return period

  const monthIndex = Number(monthly[2]) - 1

  return MONTH_LABELS[monthIndex] ?? period
}

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
      <p class="eyebrow">Аналитика</p>
      <h1>Сводка по оттоку</h1>
      <p class="lead">
        Распределение клиентов по уровням риска, деньги под риском и динамика
        оттока по модели.
      </p>
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
        Данные на {{ formatDateTime(summary.lastCalculatedAt) }} · валюта
        {{ summary.financials.currency }}
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
              <dd>{{ formatMoney(stat.value) }}</dd>
            </div>
          </div>
          <p class="muted financial-note">
            Балансы приходят в копейках выбранной валюты
          </p>
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
          <h3>Динамика оттока</h3>
          <div v-if="churnRows.length" class="churn-layout">
            <div class="churn-chart">
              <div
                v-for="row in churnRows"
                :key="row.period"
                class="churn-col"
              >
                <div class="churn-bars">
                  <div
                    class="churn-bar churn-bar--fact"
                    :style="{ height: churnHeight(row.factDeleted) }"
                    :title="`Факт: ${row.factDeleted}`"
                  />
                  <div
                    class="churn-bar churn-bar--forecast"
                    :style="{ height: churnHeight(row.forecastRisk) }"
                    :title="`Прогноз: ${row.forecastRisk}`"
                  />
                </div>
                <span class="churn-period muted">
                  {{ formatPeriod(row.period) }}
                </span>
              </div>
            </div>

            <div class="churn-legend">
              <span class="churn-swatch churn-swatch--fact" /> факт
              <span class="churn-swatch churn-swatch--forecast" /> прогноз
            </div>
          </div>
          <p v-else class="muted">Динамики пока нет</p>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
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
  width: 10px;
  height: 10px;
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
  min-width: 0;
}

.risk-stats {
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 12px;
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

.financial-note {
  font-size: 12px;
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

/* Динамика оттока: парные бары факт/прогноз по периодам. */
.churn-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.churn-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 160px;
}

.churn-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.churn-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100%;
}

.churn-bar {
  width: 14px;
  border-radius: 4px 4px 0 0;
}

.churn-bar--fact {
  background: var(--accent);
}

.churn-bar--forecast {
  background: var(--danger-border);
}

.churn-period {
  font-size: 11px;
  white-space: nowrap;
}

.churn-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.churn-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.churn-swatch--fact {
  background: var(--accent);
}

.churn-swatch--forecast {
  background: var(--danger-border);
}

.churn-swatch:last-of-type {
  margin-left: 14px;
}
</style>
