<script setup lang="ts">
import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, reactive, ref, watch } from 'vue'
import { fetchModelSettings, patchModelSettings } from '../api/settings'
import { queryClient } from '../lib/queryClient'
import type { ModelThresholds, ModelWeights } from '../types/settings'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{ close: [] }>()

interface ModalField<K> {
  key: K
  label: string
  integer?: boolean
}

const WEIGHT_FIELDS: Array<ModalField<keyof ModelWeights>> = [
  {
    key: 'autoprolongDisabledExpiringWeight',
    label: 'Автопродление выключено, срок истекает',
  },
  {
    key: 'autoprolongEnabledDeficitWeight',
    label: 'Автопродление включено, дефицит баланса',
  },
  {
    key: 'prolongWaitWithoutFundsWeight',
    label: 'Ожидание продления без средств',
  },
  {
    key: 'recentFailedProlongationWeight',
    label: 'Недавняя неудачная попытка продления',
  },
  {
    key: 'suspendedServiceWeight',
    label: 'Приостановленная услуга',
  },
]

const THRESHOLD_FIELDS: Array<ModalField<keyof ModelThresholds>> = [
  { key: 'highRiskThreshold', label: 'Порог высокого риска' },
  { key: 'mediumRiskThreshold', label: 'Порог среднего риска' },
  { key: 'imminentExpiryDays', label: 'Дней до истечения услуги', integer: true },
]

const form = reactive({
  weights: {} as Record<string, string | number>,
  thresholds: {} as Record<string, string | number>,
})

const validationError = ref<string | null>(null)

const settingsQuery = useQuery({
  queryKey: ['model-settings'],
  queryFn: fetchModelSettings,
  enabled: computed(() => props.open),
  staleTime: 0,
})

watch(
  () => settingsQuery.data.value,
  (settings) => {
    if (!settings) return

    for (const [key, value] of Object.entries(settings.weights)) {
      form.weights[key] = String(value)
    }

    for (const [key, value] of Object.entries(settings.thresholds)) {
      form.thresholds[key] = String(value)
    }
  },
  { immediate: true },
)

function readNumber(
  source: Record<string, string | number>,
  key: string,
): number | null {
  const raw = source[key]

  if (raw === undefined || raw === null) return null

  const text = String(raw).trim()

  if (text === '') return null

  const parsed = Number(text)

  return Number.isFinite(parsed) ? parsed : null
}

function submit() {
  const weights = {} as ModelWeights
  const thresholds = {} as ModelThresholds

  for (const field of WEIGHT_FIELDS) {
    const value = readNumber(form.weights, field.key)

    if (value === null) {
      validationError.value = 'Заполните все веса числами'
      return
    }

    weights[field.key] = value
  }

  for (const field of THRESHOLD_FIELDS) {
    const value = readNumber(form.thresholds, field.key)

    if (value === null) {
      validationError.value = 'Заполните все пороги числами'
      return
    }

    thresholds[field.key] = value
  }

  if (thresholds.highRiskThreshold <= thresholds.mediumRiskThreshold) {
    validationError.value =
      'Порог высокого риска должен быть больше порога среднего'
    return
  }

  if (
    Object.values(weights).some((value) => value < 0) ||
    Object.values(thresholds).some((value) => value < 0)
  ) {
    validationError.value = 'Значения не могут быть отрицательными'
    return
  }

  validationError.value = null
  mutation.mutate({ weights, thresholds })
}

const mutation = useMutation({
  mutationFn: patchModelSettings,
  onSuccess: () => {
    validationError.value = null
    void queryClient.invalidateQueries({ queryKey: ['model-settings'] })
    emit('close')
  },
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="emit('close')">
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-settings-title"
      >
        <div class="modal-head">
          <h2 id="model-settings-title">Настройки модели</h2>
          <button
            class="modal-close"
            type="button"
            aria-label="Закрыть"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <p v-if="settingsQuery.isPending.value" class="muted">
          Загружаем настройки…
        </p>

        <div v-else-if="settingsQuery.isError.value" class="modal-error">
          <p class="form-error" role="alert">
            {{ settingsQuery.error.value?.message ?? 'Не удалось загрузить настройки' }}
          </p>
          <button
            class="button button--ghost"
            type="button"
            @click="settingsQuery.refetch()"
          >
            Повторить
          </button>
        </div>

        <form v-else class="modal-form" novalidate @submit.prevent="submit">
          <h3>Весовые коэффициенты</h3>
          <label
            v-for="field in WEIGHT_FIELDS"
            :key="field.key"
            class="modal-field"
          >
            <span>{{ field.label }}</span>
            <input
              v-model="form.weights[field.key]"
              type="number"
              step="any"
              min="0"
              :placeholder="String(settingsQuery.data.value?.weights[field.key] ?? '')"
            />
          </label>

          <h3>Пороги</h3>
          <label
            v-for="field in THRESHOLD_FIELDS"
            :key="field.key"
            class="modal-field"
          >
            <span>{{ field.label }}</span>
            <input
              v-model="form.thresholds[field.key]"
              type="number"
              :step="field.integer ? '1' : 'any'"
              min="0"
              :placeholder="String(settingsQuery.data.value?.thresholds[field.key] ?? '')"
            />
          </label>

          <p
            v-if="settingsQuery.data.value"
            class="muted modal-meta"
          >
            Обновил {{ settingsQuery.data.value.updatedBy }},
            {{ new Date(settingsQuery.data.value.updatedAt).toLocaleString('ru-RU') }}
          </p>

          <p
            v-if="validationError || mutation.error.value"
            class="form-error"
            role="alert"
          >
            {{ validationError || mutation.error.value?.message }}
          </p>

          <div class="modal-actions">
            <button
              class="button button--ghost"
              type="button"
              @click="emit('close')"
            >
              Отмена
            </button>
            <button
              class="button"
              type="submit"
              :disabled="mutation.isPending.value"
            >
              {{ mutation.isPending.value ? 'Сохраняем…' : 'Сохранить' }}
            </button>
          </div>
        </form>
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

.modal-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(520px, 100%);
  max-height: min(85vh, 720px);
  padding: 24px;
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

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-form h3 {
  margin: 12px 0 0;
  font-size: 14px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.modal-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
}

.modal-field input {
  width: 120px;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-weight: 400;
  text-align: right;
  outline: none;
}

.modal-field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.modal-meta {
  margin: 4px 0 0;
  font-size: 12px;
}

.modal-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.modal-actions .button {
  min-width: 110px;
}
</style>
