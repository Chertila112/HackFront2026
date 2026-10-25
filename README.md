# churn-dashboard

SPA на Vue 3 + TypeScript: авторизация (JWT + refresh-cookie), таблица клиентов с оценкой риска оттока, курсорная пагинация, сортировка, live-обновления через SignalR и сводная аналитика.

## Стек

Vue 3 · Vite · TypeScript · Vue Router · TanStack Query · Zod · SignalR · Bun

## Запуск

```bash
bun install
bun run dev
```

Открыть: http://localhost:5173

API-URL задаётся в `.env.local`:

```bash
VITE_API_BASE_URL=https://hack-analyzer.ddns.net:3000
```

## Команды

```bash
bun run dev        # dev-сервер
bun run typecheck  # проверка типов (vue-tsc)
bun run build      # typecheck + production-сборка
bun run preview    # предпросмотр сборки
```

## Как устроено

- `src/api/` — эндпоинты и fetch-обёртка: Bearer-токен, авто-refresh при 401, zod-валидация ответов
- `src/schemas/` + `src/types/` — zod-схемы и выведенные из них типы (`auth`, `customers`, `realtime`, `settings`)
- `src/composables/` — `useCustomerFilters` (поиск, фильтры риска, сортировка) и `useDebouncedRef` (общий дебаунс)
- `src/stores/auth.ts` — сессия в памяти + `sessionStorage`; после перезагрузки восстанавливается без запросов, валидация фоновым `GET /auth/me`
- `src/views/HomeView.vue` — тулбар фильтров и состояние загрузки; сама таблица — в `src/components/CustomersTable.vue`
- `src/lib/format.ts` — форматирование денег (еврокопейки → EUR)
- `src/lib/realtime.ts` — SignalR-хаб `/hubs/analytics`: `ModelRecalculated` → сброс списка на первую страницу, `CustomerRiskUpdated` → подмена строк по `id`, после реконнекта полный перезапрос
- `src/layouts/AppLayout.vue` — шапка, навигация, logout

Маршруты: `/login`, `/register`, `/` (таблица), `/analytics` — защищены navigation guard.

Спецификация API: `v1.yaml`.
