<script setup lang="ts">
import { keepPreviousData, useInfiniteQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { fetchCustomers } from '../api/customers'
import CustomerDetailModal from '../components/CustomerDetailModal.vue'
import CustomersTable from '../components/CustomersTable.vue'
import ModelSettingsModal from '../components/ModelSettingsModal.vue'
import { useCustomerFilters } from '../composables/useCustomerFilters'
import type { Customer } from '../types/customers'

const PAGE_SIZE = 10

const {
  searchInput,
  search,
  riskMinInput,
  riskMaxInput,
  riskMin,
  riskMax,
  sortField,
  sortDirection,
  toggleSort,
} = useCustomerFilters()

const isSettingsOpen = ref(false)
const detailsCustomerId = ref<number | null>(null)

// Смена сортировки/фильтров подменяет queryKey целиком: курсор валиден только
// в рамках своей сортировки и фильтров, поэтому страницы начинаются с null.
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
          <CustomersTable
            :rows="rows"
            :sort-field="sortField"
            :sort-direction="sortDirection"
            @toggle-sort="toggleSort"
            @open-details="detailsCustomerId = $event"
          />

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

    <CustomerDetailModal
      :open="detailsCustomerId !== null"
      :customer-id="detailsCustomerId"
      @close="detailsCustomerId = null"
    />
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
</style>
