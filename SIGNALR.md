# SIGNALR.md — Живые обновления для фронтенда (SignalR hub)

Контракт realtime-канала бэкенда HackBack 2026 для клиентской разработки (Vue + TS).

## Зачем

Бэкенд сам уведомляет открытые вкладки об изменениях данных: импорт снапшота, пересохранение настроек модели, пересчёт скоров клиентов. Без хаба фронту пришлось бы поллить `GET /customers` по таймеру.

- **Протокол:** SignalR (JSON), транспорт WebSockets с автофолбэком (SSE / long-polling).
- **URL хаба:** `/hubs/analytics` (относительно базового URL API: dev `http://localhost:5170`, prod `https://hack-analyzer.ddns.net`).
- **Направление:** только server → client. Вызывать методы хаба не нужно и нечего — клиент только слушает.
- **Авторизация:** обязательна. Без валидного JWT рукопожатие вернёт 401.

## Подключение (Vue + TS)

Пакет: `npm i @microsoft/signalr`.

```ts
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${API_BASE}/hubs/analytics`, {
    // Токен уйдёт в query-string (?access_token=...) — браузерный WebSocket
    // не умеет заголовок Authorization. Это штатный механизм бэкенда.
    accessTokenFactory: () => authStore.accessToken,
  })
  .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
  .build();

connection.on('ModelRecalculated', onModelRecalculated);
connection.on('CustomerRiskUpdated', onCustomerRiskUpdated);

// КРИТИЧНО: после переподключения часть событий могла пройти мимо офлайн-вкладки.
connection.onreconnected(() => {
  refetchCustomers();   // GET /api/v1/customers с текущими параметрами
  refetchSummary();     // GET /api/v1/analytics/summary
});

await connection.start(); // при 401 — access истёк: POST /api/v1/refresh (refresh-кука), затем start() повторно
```

**Важно:** SignalR — не очередь. События, произошедшие, пока вкладка была отключена, задним числом **не доставляются** — сервер не хранит историю. Поэтому единственная надёжная стратегия после `onreconnected` — полный перезапрос данных через REST (см. выше). События — это оптимизация UX, а не механизм доставки истины.

Имена событий регистрозависимы: строго `'ModelRecalculated'` и `'CustomerRiskUpdated'`.

## События

### 1. `ModelRecalculated` — «данные/модель пересчитаны, перезагрузись»

Приходит после:

- `PUT /api/v1/source/snapshot` — полный импорт датасета (trigger `SNAPSHOT_IMPORTED`);
- `PATCH /api/v1/model/settings` — смена весов/порогов, могут изменить все скоры (trigger `SETTINGS_UPDATED`).

**Полезной нагрузки списком в событии нет** — это сигнал: перезапроси то, что показываешь (список клиентов и/или сводку).

Пример payload (реальный, из смоук-теста):

```json
{
  "trigger": "SNAPSHOT_IMPORTED",
  "calculatedAt": "2026-10-24T10:48:13.7436991Z",
  "summary": { "revenueAtRisk": 0, "highRiskCount": 42 }
}
```

| Поле | Тип | Значение |
|---|---|---|
| `trigger` | `'SNAPSHOT_IMPORTED' \| 'SETTINGS_UPDATED'` | что вызвало пересчёт (для тостов/логов) |
| `calculatedAt` | string (ISO 8601, UTC, суффикс `Z`) | момент расчёта; не используй как ID события |
| `summary.revenueAtRisk` | number | пока всегда `0` (формула появится с релизом скоринга) |
| `summary.highRiskCount` | number | клиентов с `riskScore >= 70` (порог берётся из настроек модели) |

Реакция фронта: перезапросить `GET /api/v1/customers` (с текущими фильтрами; список начать заново) и `GET /api/v1/analytics/summary`.

### 2. `CustomerRiskUpdated` — точечные обновления клиентов

Зарезервировано под точечный пересчёт: в payload приходят **готовые записи клиентов**, форма байт-в-байт совпадает с `items` из `GET /api/v1/customers`. Фронт подменяет строки в гриде по `id`. Сейчас активных триггеров у события нет (появятся вместе со скорингом) — обработчик стоит повесить сразу.

```json
{
  "updated": [
    {
      "id": 10492,
      "email": "devops_user@company.com",
      "balance": 150,
      "withdrawBalance": 0,
      "bonusBalance": 300,
      "bonusState": "unlocked",
      "totalReplenished": 45000,
      "riskScore": null,
      "status": "insufficient_data",
      "revenueAtRisk": 0,
      "primaryReasons": ["Недостаточно данных для оценки (скоринг будет подключён позже)"]
    }
  ]
}
```

## TS-типы

```ts
export interface ModelRecalculated {
  trigger: 'SNAPSHOT_IMPORTED' | 'SETTINGS_UPDATED';
  calculatedAt: string;
  summary: { revenueAtRisk: number; highRiskCount: number };
}

export interface CustomerItem {
  id: number;
  email: string;
  balance: number;
  withdrawBalance: number;
  bonusBalance: number;
  bonusState: 'locked' | 'unlocked';
  totalReplenished: number;
  riskScore: number | null;      // 0–100; null = скоринг ещё не считал
  status: string;                // 'insufficient_data' (до скоринга)
  revenueAtRisk: number;
  primaryReasons: string[];
}

export interface CustomerRiskUpdated {
  updated: CustomerItem[];
}
```

## Что ещё надо знать

- **Латентность:** события приходят не мгновенно — бэкенд батчит отправки (пачка до 100 элементов или раз в ~1 секунду). Ориентируйся на «до 1–2 секунд после действия».
- **Несколько вкладок:** событие получает каждая открытая вкладка (широковещание). Синхронизацию вкладок между собой фронт делает сам, если нужно.
- **Порядок событий:** могут приходить пачками по 2 (снапшот + патч настроек в течение секунды) — обрабатывай каждое как «перезапрось всё», дедупликация не нужна.
- **Ручная проверка без фронтенда:** у бэкенда есть консольный слушатель (проект `hub-test`, Microsoft.AspNetCore.SignalR.Client) — подключается тем же токеном и печатает все события в консоль.

## REST, куда ведут перезагрузки (шпаргалка)

- `GET /api/v1/customers?cursorOn=<id|email|balance|totalReplenished|riskScore>&sortDirection=asc|desc&takeAmount=20&cursorNext=<nextCursor из прошлого ответа>&riskScoreMin=&riskScoreMax=&search=` → `{ items: CustomerItem[], nextCursor: string | null }` (`null` = конец). Курсор — непрозрачная строка вида `"85:10492"`; передавать назад как есть, URL-энкод не обязателен (двоеточие валидно в query), `%3A` тоже ок. Дефолты: `cursorOn=id`, `sortDirection=desc`, `takeAmount=20` (кламп 1..100). Ошибки курсора (неизвестная колонка, кривой `cursorNext`, `riskScoreMin > riskScoreMax`) → 400 c `{ message }`.
- `GET /api/v1/customers/{id}` — карточка клиента (`riskScore: number | null`, поля `riskLevel` в API больше нет).
- `GET /api/v1/analytics/summary` — сводка: распределение `{ high, medium, low, insufficientData }` по порогам модели (дефолты 70/40), финансовые поля пока нулевые.
