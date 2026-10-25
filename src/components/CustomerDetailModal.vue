<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { fetchCustomerDetail } from '../api/customers'
import { formatMoney } from '../lib/format'

const props = defineProps<{ open: boolean; customerId: number | null }>()

const emit = defineEmits<{ close: [] }>()

const customerId = computed(() => props.customerId)

const detailQuery = useQuery({
  queryKey: ['customer-detail', customerId],
  enabled: () => props.open && props.customerId !== null,
  queryFn: () => fetchCustomerDetail(customerId.value as number),
  staleTime: 60_000,
})

const detail = computed(() => detailQuery.data.value)

const BALANCE_ROWS = [
  { key: 'balance', label: 'Баланс' },
  { key: 'withdrawBalance', label: 'К выводу' },
  { key: 'bonusBalance', label: 'Бонусы' },
  { key: 'effectiveBalance', label: 'Эффективный' },
  { key: 'totalReplenished', label: 'Пополнено' },
] as const

type BalanceKey = (typeof BALANCE_ROWS)[number]['key']

const balanceRows = computed(() => {
  if (!detail.value) return []

  const balances = detail.value.balances
  const rows = BALANCE_ROWS.map((row) => ({
    ...row,
    value: balances[row.key as BalanceKey],
  }))
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1)

  return rows.map((row) => ({
    ...row,
    width: `${Math.max(2, Math.round((row.value / max) * 100))}%`,
  }))
})

const donut = computed(() => {
  if (!detail.value || detail.value.balances.effectiveBalance <= 0) return null

  const { balance, effectiveBalance } = detail.value.balances
  const share = Math.min(1, Math.max(0, balance / effectiveBalance))
  const circumference = 2 * Math.PI * 52

  return {
    circumference,
    balanceLength: circumference * share,
    bonusLength: circumference * (1 - share),
    balancePercent: Math.round(share * 100),
  }
})

const riskScoreText = computed(() => {
  const score = detail.value?.riskAssessment.riskScore
  return score === null || score === undefined ? '—' : String(score)
})

const loyaltyScoreText = computed(() => {
  const score = detail.value?.riskAssessment.loyaltyScore
  return score === null || score === undefined ? '—' : String(score)
})

const FACTOR_TITLE_KEYS = ['title', 'reason'] as const
const FACTOR_TEXT_KEYS = ['description', 'text', 'detail'] as const

function firstString(
  factor: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = factor[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }

  return undefined
}

interface FactorView {
  title: string
  description: string
}

// Из фактора берём ровно два поля — заголовок и текст. Веса, коды и прочие
// служебные ключи не рендерим, сервис по serviceId подтягивается из карточки.
const factorViews = computed<FactorView[]>(() => {
  const detailData = detail.value

  if (!detailData) return []

  const servicesById = new Map(
    detailData.services.map((service) => [service.id, service.name]),
  )

  return detailData.riskAssessment.riskFactors.map((factor) => {
    const serviceId = factor['serviceId']
    const serviceName =
      typeof serviceId === 'number' ? servicesById.get(serviceId) : undefined

    const title =
      firstString(factor, FACTOR_TITLE_KEYS) ??
      (typeof serviceId === 'number'
        ? `Сервис #${serviceId}${serviceName ? ` — ${serviceName}` : ''}`
        : 'Фактор риска')

    return {
      title,
      description: firstString(factor, FACTOR_TEXT_KEYS) ?? '',
    }
  })
})

const problemServiceIds = computed(() => {
  const ids = new Set<number>()

  for (const factor of detail.value?.riskAssessment.riskFactors ?? []) {
    const serviceId = factor['serviceId']
    if (typeof serviceId === 'number' && Number.isFinite(serviceId)) {
      ids.add(serviceId)
    }
  }

  return ids
})

const hasRiskFactors = computed(() => problemServiceIds.value.size > 0)

const problemServices = computed(
  () =>
    detail.value?.services.filter((service) =>
      problemServiceIds.value.has(service.id),
    ) ?? [],
)

const otherServices = computed(
  () =>
    detail.value?.services.filter(
      (service) => !problemServiceIds.value.has(service.id),
    ) ?? [],
)

const SERVICE_STATUS_LABELS: Record<string, string> = {
  active: 'Активна',
  deleted: 'Удалена',
  prolong_wait: 'Ожидает оплаты',
  suspended: 'Выключена',
  blocked: 'Заблокирована',
}

const PAYMENT_TERM_LABELS: Record<string, string> = {
  hour: 'Час',
  day: 'День',
  week: 'Неделя',
  two_weeks: 'Две недели',
  month: 'Месяц',
  three_months: 'Три месяца',
  quarter_year: 'Квартал',
  half_year: 'Полгода',
  year: 'Год',
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  order: 'Заказ',
  prolong: 'Продление',
}

function labelFrom(map: Record<string, string>, raw: string): string {
  return map[raw] ?? raw
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
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      @click.self="emit('close')"
    >
      <div
        class="modal-card detail-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-detail-title"
      >
        <div class="modal-head">
          <h2 id="customer-detail-title">
            {{ detail?.email ?? `Клиент #${customerId}` }}
          </h2>
          <button
            class="modal-close"
            type="button"
            aria-label="Закрыть"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <p v-if="detailQuery.isPending.value && open" class="muted">
          Загружаем карточку клиента…
        </p>

        <div v-else-if="detailQuery.isError.value" class="modal-error">
          <p class="form-error" role="alert">
            {{
              detailQuery.error.value?.message ??
              'Не удалось загрузить карточку клиента'
            }}
          </p>
          <button
            class="button button--ghost"
            type="button"
            @click="detailQuery.refetch()"
          >
            Повторить
          </button>
        </div>

        <template v-else-if="detail">
          <section class="detail-block">
            <h3>Балансы</h3>
            <div class="charts">
              <div class="bars">
                <div
                  v-for="row in balanceRows"
                  :key="row.key"
                  class="bar-row"
                >
                  <span class="bar-label">{{ row.label }}</span>
                  <span class="bar-track">
                    <span class="bar-fill" :style="{ width: row.width }" />
                  </span>
                  <span class="bar-value">{{ formatMoney(row.value) }}</span>
                </div>
              </div>

              <div class="donut-wrap">
                <svg viewBox="0 0 120 120" class="donut" aria-hidden="true">
                  <circle class="donut-track" cx="60" cy="60" r="52" />
                  <circle
                    v-if="donut"
                    class="donut-balance"
                    cx="60"
                    cy="60"
                    r="52"
                    :stroke-dasharray="`${donut.balanceLength} ${donut.circumference - donut.balanceLength}`"
                    transform="rotate(-90 60 60)"
                  />
                  <circle
                    v-if="donut && donut.bonusLength > 0.001"
                    class="donut-bonus"
                    cx="60"
                    cy="60"
                    r="52"
                    :stroke-dasharray="`${donut.bonusLength} ${donut.circumference - donut.bonusLength}`"
                    :stroke-dashoffset="`-${donut.balanceLength}`"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <p class="donut-caption muted">
                  Баланс {{ donut ? donut.balancePercent : 100 }}% ·
                  бонусы {{ donut ? 100 - donut.balancePercent : 0 }}%
                  эффективного
                </p>
              </div>
            </div>
          </section>

          <section class="detail-block">
            <h3>Оценка риска</h3>
            <div class="stat-grid">
              <div class="stat">
                <dt>Риск</dt>
                <dd>{{ riskScoreText }}</dd>
              </div>
              <div class="stat">
                <dt>Лояльность</dt>
                <dd>{{ loyaltyScoreText }}</dd>
              </div>
              <div class="stat">
                <dt>Доход под риском</dt>
                <dd>{{ formatMoney(detail.riskAssessment.revenueAtRisk) }}</dd>
              </div>
              <div class="stat">
                <dt>Ожидаемые потери</dt>
                <dd>{{ formatMoney(detail.riskAssessment.expectedLoss) }}</dd>
              </div>
            </div>

            <div v-if="factorViews.length" class="factor-list">
              <div
                v-for="(factor, index) in factorViews"
                :key="index"
                class="factor-chip"
              >
                <p class="factor-title">{{ factor.title }}</p>
                <p v-if="factor.description" class="factor-text">
                  {{ factor.description }}
                </p>
              </div>
            </div>
            <p v-else class="muted">Факторы риска не обнаружены</p>
          </section>

          <section class="detail-block">
            <h3>Сервисы</h3>

            <template v-if="hasRiskFactors">
              <h4 class="detail-subhead">Проблемные сервисы</h4>
              <ul
                v-if="problemServices.length"
                class="service-list"
              >
                <li
                  v-for="service in problemServices"
                  :key="service.id"
                  class="service-item"
                >
                  <div class="service-head">
                    <strong>{{ service.name }}</strong>
                    <span
                      class="badge mini-badge"
                      :class="`svc--${service.status}`"
                    >
                      {{ labelFrom(SERVICE_STATUS_LABELS, service.status) }}
                    </span>
                  </div>
                  <p class="service-meta muted">
                    #{{ service.id }} ·
                    {{ labelFrom(PAYMENT_TERM_LABELS, service.paymentTerm) }} ·
                    автопродление: {{ service.autoProlong ? 'вкл' : 'выкл' }} ·
                    цена {{ formatMoney(service.price) }} ·
                    до {{ formatDateTime(service.expiresAt) }}
                  </p>
                </li>
              </ul>
              <p v-else class="muted">
                Сервисы из факторов риска не найдены в карточке
              </p>

              <template v-if="otherServices.length">
                <h4 class="detail-subhead">Остальные сервисы</h4>
                <ul class="service-list">
                  <li
                    v-for="service in otherServices"
                    :key="service.id"
                    class="service-item"
                  >
                    <div class="service-head">
                      <strong>{{ service.name }}</strong>
                      <span
                        class="badge mini-badge"
                        :class="`svc--${service.status}`"
                      >
                        {{ labelFrom(SERVICE_STATUS_LABELS, service.status) }}
                      </span>
                    </div>
                    <p class="service-meta muted">
                      #{{ service.id }} ·
                      {{
                        labelFrom(PAYMENT_TERM_LABELS, service.paymentTerm)
                      }}
                      ·
                      автопродление: {{ service.autoProlong ? 'вкл' : 'выкл' }}
                      · цена {{ formatMoney(service.price) }} ·
                      до {{ formatDateTime(service.expiresAt) }}
                    </p>
                  </li>
                </ul>
              </template>
            </template>

            <ul
              v-else-if="detail.services.length"
              class="service-list"
            >
              <li
                v-for="service in detail.services"
                :key="service.id"
                class="service-item"
              >
                <div class="service-head">
                  <strong>{{ service.name }}</strong>
                  <span
                    class="badge mini-badge"
                    :class="`svc--${service.status}`"
                  >
                    {{ labelFrom(SERVICE_STATUS_LABELS, service.status) }}
                  </span>
                </div>
                <p class="service-meta muted">
                  #{{ service.id }} ·
                  {{ labelFrom(PAYMENT_TERM_LABELS, service.paymentTerm) }} ·
                  автопродление: {{ service.autoProlong ? 'вкл' : 'выкл' }} ·
                  цена {{ formatMoney(service.price) }} ·
                  до {{ formatDateTime(service.expiresAt) }}
                </p>
              </li>
            </ul>
            <p v-else class="muted">Сервисов нет</p>
          </section>

          <section class="detail-block">
            <h3>Последние транзакции</h3>
            <ul v-if="detail.recentTransactions.length" class="tx-list">
              <li
                v-for="tx in detail.recentTransactions"
                :key="tx.id"
                class="tx-item"
              >
                <span class="tx-type">
                  {{ labelFrom(TRANSACTION_TYPE_LABELS, tx.type) }}
                </span>
                <span
                  class="badge mini-badge"
                  :class="tx.status === 'performed' ? 'tx--ok' : 'tx--warn'"
                >
                  {{ tx.status === 'performed' ? 'Выполнена' : 'Не выполнена' }}
                </span>
                <span class="tx-amount">{{ formatMoney(tx.amount) }}</span>
                <span class="tx-date muted">
                  {{ formatDateTime(tx.createdAt) }}
                </span>
              </li>
            </ul>
            <p v-else class="muted">Транзакций нет</p>
          </section>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.45);
}

.detail-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(820px, 100%);
  max-height: min(92vh, 880px);
  padding: 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
  overflow-y: auto;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.modal-head h2 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.02em;
}

.modal-close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  color: var(--text-h);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.modal-close:hover {
  background: var(--accent-bg);
}

.modal-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}

.detail-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-block h3 {
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  font-size: 16px;
}

.detail-subhead {
  margin: 8px 0 0;
  color: var(--text);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Гистограмма балансов. */
.charts {
  display: flex;
  align-items: center;
  gap: 24px;
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.bar-label {
  width: 86px;
  flex-shrink: 0;
  color: var(--text);
}

.bar-track {
  flex: 1;
  min-width: 0;
  height: 10px;
  border-radius: 999px;
  background: var(--surface-muted);
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}

.bar-value {
  width: 110px;
  flex-shrink: 0;
  text-align: right;
  font-family: var(--mono);
  font-size: 14px;
  color: var(--text-h);
}

/* Донат: доля основного баланса в эффективном. */
.donut-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.donut {
  width: 150px;
  height: 150px;
}

.donut-track,
.donut-balance,
.donut-bonus {
  fill: none;
  stroke-width: 13;
}

.donut-track {
  stroke: var(--surface-muted);
}

.donut-balance {
  stroke: var(--accent);
}

.donut-bonus {
  stroke: #22a06b;
}

.donut-caption {
  margin: 0;
  text-align: center;
  font-size: 12px;
}

/* Оценка риска: компактные статовые карточки. */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.stat {
  min-width: 0;
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

/* Деньги длинные: переносим, а не выпускаем за край карточки. */
.stat dd {
  margin: 6px 0 0;
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 18px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

/* Факторы риска: жёлто-оранжевая обводка из глобальных --danger-* переменных. */
.factor-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.factor-chip {
  padding: 10px 14px;
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
  background: var(--danger-bg);
}

.factor-title {
  margin: 0;
  color: var(--danger);
  font-size: 14px;
  font-weight: 700;
}

.factor-text {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
}

/* Сервисы. */
.service-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.service-item {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
}

.service-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.service-head strong {
  color: var(--text-h);
}

.service-meta {
  margin: 4px 0 0;
  font-size: 13px;
}

/* Бейджи: сервисы и транзакции. */
.mini-badge {
  padding: 2px 7px;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.svc--active {
  background: rgba(34, 197, 94, 0.16);
  color: #15803d;
}

.svc--deleted {
  background: rgba(120, 120, 120, 0.16);
  color: #5f6b7a;
}

.svc--prolong_wait,
.svc--suspended {
  background: rgba(245, 158, 11, 0.18);
  color: #a16207;
}

.svc--blocked {
  background: rgba(180, 60, 60, 0.5);
  color: rgba(255, 60, 60, 0.8);
}

.tx--ok {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.tx--warn {
  background: rgba(245, 158, 11, 0.18);
  color: #a16207;
}

/* Транзакции. */
.tx-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 13px;
}

.tx-item:last-child {
  border-bottom: 0;
}

.tx-type {
  min-width: 90px;
  color: var(--text-h);
}

.tx-amount {
  min-width: 100px;
  text-align: right;
  font-family: var(--mono);
  color: var(--text-h);
}

.tx-date {
  font-size: 12px;
}
</style>
