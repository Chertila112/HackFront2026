# HackFront 2026

SPA-заготовка на Vue 3 + Vite + TypeScript с авторизацией, глобальным состоянием пользователя и mock-API для локальной разработки.

Access-токен хранится только в памяти приложения. Refresh-токен приходит в HttpOnly cookie и недоступен JavaScript.

## Стек

- **Vue 3** — UI и реактивность.
- **Vite** — dev-сервер и сборка.
- **TypeScript** — строгая типизация.
- **Vue Router** — маршруты и защита экранов.
- **TanStack Query (Vue Query)** — кэш запросов и mutation для логина.
- **Zod** — runtime-валидация форм, запросов и ответов API.
- **Bun** — установка зависимостей и запуск скриптов.

## Быстрый старт

```bash
bun install
bun run dev
```

Открыть:

```text
http://localhost:5173
```

Демо-учётные записи:

| Username | Пароль |
|---|---|
| `demo` | `demo1234` |
| `user` | `user1234` |

## Команды

```bash
bun run dev        # dev-сервер с mock-API
bun run typecheck  # проверка типов через vue-tsc
bun run build      # typecheck + production-сборка
bun run preview    # предпросмотр сборки, mock-API тоже работает
```

## Структура проекта

```text
.
├── index.html              # HTML-точка входа, подключает src/main.ts
├── vite.config.ts          # Vite + плагин mock-API
├── mock-api.ts             # mock-сервер: login, refresh, logout
├── tsconfig.json           # настройки TypeScript
└── src
    ├── main.ts             # bootstrap сессии и создание приложения
    ├── App.vue             # корневой RouterView + реакция на истёкшую сессию
    ├── style.css           # глобальные переменные и общие классы
    ├── api
    │   ├── endpoints.ts    # пути auth-эндпоинтов
    │   ├── auth.ts         # login, fetchSession, logout
    │   └── http.ts         # fetch-обёртка, Bearer, авто-refresh
    ├── schemas
    │   └── auth.ts         # Zod-схемы и типы из z.infer
    ├── stores
    │   └── auth.ts         # глобальное состояние пользователя
    ├── router
    │   └── index.ts        # маршруты и navigation guard
    ├── layouts
    │   └── AppLayout.vue   # общая шапка и навигация
    ├── views
    │   ├── LoginView.vue   # экран входа
    │   ├── HomeView.vue    # минимальная главная
    │   └── ProfileView.vue # профиль и статус сессии
    └── types
        ├── auth.ts         # реэкспорт типов из Zod-схем
        └── vue-router.d.ts # типизация meta маршрутов
```

## Как запускается приложение

`index.html` подключает `src/main.ts`.

В `src/main.ts`:

1. Выполняется `GET /api/v1/auth/refresh` с `credentials: 'include'`.
2. Если cookie валидна, backend возвращает `accessToken`, `expiresAt` и `user`, а также обновляет cookie.
3. Сессия сохраняется в store.
4. Создаётся Vue-приложение, устанавливаются `router` и `VueQueryPlugin`.
5. Приложение монтируется в `#app`.

Если активной сессии нет, запрос завершается `401`, store остаётся пустым, а navigation guard переводит на `/login`.

`src/App.vue` содержит только `<RouterView />` и слушает событие `auth:session-expired`. Если обновить сессию не удалось, приложение очищает кэш и переводит пользователя на `/login`.

## Маршруты

| Путь | Компонент | Доступ |
|---|---|---|
| `/login` | `LoginView` | только для неавторизованных |
| `/` | `HomeView` внутри `AppLayout` | только для авторизованных |
| `/profile` | `ProfileView` внутри `AppLayout` | только для авторизованных |
| `*` | редирект на `/` | — |

`AppLayout` — родительский маршрут. Внутри него есть свой `<RouterView />`, поэтому шапка и навигация остаются на месте при переходе между экранами.

### Navigation guard

Перед каждым переходом в `src/router/index.ts` выполняется проверка:

- если маршрут требует авторизацию, а пользователь не авторизован → `/login?redirect=<исходный путь>`;
- если пользователь уже авторизован и открывает `/login` → `/`;
- иначе переход разрешён.

Мета-поля `requiresAuth` и `guestOnly` типизированы в `src/types/vue-router.d.ts`.

## Глобальное состояние пользователя

Состояние находится в `src/stores/auth.ts`. Это модульный singleton: объект создаётся один раз и используется всеми компонентами.

Форма состояния:

```ts
interface AuthState {
  accessToken: string | null
  user: User | null
}
```

Пользователь:

```ts
interface User {
  id: string
  username: string
}
```

Доступные вычисляемые значения:

- `isAuthenticated` — есть access-токен и пользователь;
- `displayName` — `username` или «Пользователь».

Методы:

- `setSession(session)` — сохранить access-токен и пользователя;
- `clearSession()` — полностью очистить сессию.

Состояние не сохраняется в `localStorage`. После перезагрузки страницы сессия восстанавливается через cookie и `GET /api/v1/auth/refresh`.

## Авторизация и токены

### Логин

`src/views/LoginView.vue` использует `useMutation` из TanStack Query.

1. Пользователь отправляет username и пароль.
2. Данные сначала проверяются через `loginCredentialsSchema`.
3. `login()` из `src/api/auth.ts` вызывает `POST /api/v1/auth/login`.
4. Backend устанавливает HttpOnly cookie с refresh-токеном.
5. Ответ проверяется через `authSessionSchema`.
6. Успешный ответ содержит `accessToken`, `expiresAt` и `user`.
7. `setSession()` сохраняет access-токен и пользователя в памяти.
8. Выполняется переход на `redirect` или на `/`.

### Access-токен

`src/api/http.ts` автоматически добавляет заголовок к защищённым запросам:

```http
Authorization: Bearer <accessToken>
```

Для публичных запросов, например логина, передаётся `auth: false`.

### Восстановление и обновление сессии

Refresh-токен не передаётся в JSON и не читается из JavaScript. Он хранится в HttpOnly cookie, поэтому все запросы выполняются с:

```ts
credentials: 'include'
```

Если защищённый запрос получает `401`:

1. Клиент вызывает `GET /api/v1/auth/refresh`.
2. Cookie отправляется автоматически.
3. Backend проверяет refresh-токен, ротирует его, устанавливает новую cookie и возвращает `accessToken`, `expiresAt` и `user`.
4. `setSession()` обновляет store.
5. Исходный запрос повторяется один раз с новым access-токеном.
6. Если обновление не удалось — сессия очищается, выбрасывается событие `auth:session-expired`, приложение переходит на `/login`.

Одновременные запросы используют один общий `refreshPromise`, чтобы не отправлять несколько запросов на обновление сразу.

### Logout

`src/layouts/AppLayout.vue` вызывает `logout()` из `src/api/auth.ts`.

1. Отправляется `POST /api/v1/auth/logout`.
2. Backend отзывает refresh-токен и очищает cookie.
3. Очищается кэш TanStack Query и store.
4. Выполняется переход на `/login`.

Даже если запрос logout завершился ошибкой, локальная сессия очищается.

## API-слой

`src/api/http.ts` — обёртка над `fetch`:

- базовый URL берётся из `VITE_API_BASE_URL` или остаётся пустым;
- все запросы идут с `credentials: 'include'`;
- тело автоматически сериализуется в JSON;
- JSON-ответ парсится только при соответствующем `content-type`;
- ошибки выбрасываются как `ApiError` с `message`, `status` и `data`;
- access-токен подставляется автоматически;
- ответ проверяется Zod-схемой, переданной вторым аргументом;
- обрабатывается обновление сессии и повтор запроса.

`src/api/auth.ts` содержит типизированные функции:

- `login(credentials)` — вход по username и паролю;
- `fetchSession()` — восстановление сессии и обновление access-токена;
- `logout()` — завершение сессии.

Пути вынесены в `src/api/endpoints.ts`.

## Zod-валидация

Все схемы находятся в `src/schemas/auth.ts`. Типы в `src/types/auth.ts` реэкспортируются из них через `z.infer`, поэтому схема и TypeScript-тип не расходятся.

Схемы:

- `userSchema` — пользователь с `id` и `username`;
- `authSessionSchema` — ответ login/refresh с `accessToken`, `expiresAt` и `user`;
- `loginCredentialsSchema` — username и пароль.

Zod используется на границах приложения:

| Граница | Что проверяется |
|---|---|
| Форма логина | `loginCredentialsSchema` перед отправкой |
| Ответ логина | `authSessionSchema` в `apiRequest` |
| Ответ refresh | `authSessionSchema` в `apiRequest` |
| Mock login | тело запроса через `loginCredentialsSchema` |
| Mock refresh | cookie и серверная сессия |

Если сервер вернул данные неправильной структуры, `apiRequest` выбрасывает `ApiError` с сообщением «Некорректный ответ сервера». Mock-API возвращает `422` и список ошибок по полям в формате Zod.

## Mock-API

`mock-api.ts` — Vite-плагин, который подключается в `vite.config.ts`.

Работает в:

- `bun run dev`;
- `bun run preview`.

В production-сборке mock отсутствует.

Mock хранит активные сессии в памяти процесса. После перезапуска dev-сервера старые cookie становятся недействительными.

### Cookie

Mock устанавливает cookie:

```text
refresh_token=<token>; HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=2592000
```

Флаг `Secure` добавляется, если запрос пришёл с `X-Forwarded-Proto: https`. В реальном backend `Secure` должен быть включён всегда для HTTPS.

### `POST /api/v1/auth/login`

Тело:

```json
{
  "username": "demo",
  "password": "demo1234"
}
```

Успешный ответ:

```json
{
  "accessToken": "mock-access-...",
  "expiresAt": "2026-10-23T19:47:00.000Z",
  "user": {
    "id": "usr_demo",
    "username": "demo"
  }
}
```

Дополнительно устанавливается HttpOnly cookie с refresh-токеном.

Ошибки:

| Код | Причина |
|---|---|
| `400` | некорректный JSON |
| `401` | неверный username или пароль |
| `405` | метод не `POST` |
| `422` | данные не прошли Zod-валидацию |

### `GET /api/v1/auth/refresh`

GET-эндпоинт для восстановления и обновления сессии.

Refresh-токен читается из cookie. При успехе mock:

1. Проверяет сессию.
2. Удаляет старый refresh-токен.
3. Создаёт новый refresh-токен.
4. Устанавливает новую cookie.
5. Возвращает `accessToken`, `expiresAt` и `user`.

Успешный ответ:

```json
{
  "accessToken": "mock-access-...",
  "expiresAt": "2026-10-23T19:47:00.000Z",
  "user": {
    "id": "usr_demo",
    "username": "demo"
  }
}
```

Ошибки:

| Код | Причина |
|---|---|
| `401` | cookie отсутствует или сессия недействительна |
| `405` | метод не `GET` |

### `POST /api/v1/auth/logout`

Удаляет серверную сессию, очищает cookie и возвращает `204`.

| Код | Причина |
|---|---|
| `204` | сессия завершена |
| `405` | метод не `POST` |

## TanStack Query

Клиент создаётся в `src/lib/queryClient.ts`:

```ts
{
  queries: {
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: 0,
  },
}
```

Сейчас TanStack Query используется для mutation логина. При выходе и при истечении сессии кэш очищается через `queryClient.clear()`.

## Стили

Все основные цвета, тени, радиусы и шрифты вынесены в CSS-переменные в `src/style.css`. Файл разбит на блоки с комментариями:

- глобальные переменные;
- тёмная тема;
- базовые стили;
- общие классы страниц;
- кнопки;
- формы;
- бейджи и код.

Чтобы быстро поменять внешний вид, начните с блока `:root`:

```css
--accent: #111111;
--bg: #f7f7f7;
--surface: #ffffff;
--border: #dedede;
--radius-sm: 9px;
--radius-lg: 18px;
```

Общие классы `.page`, `.panel`, `.grid`, `.button`, `.field`, `.badge` можно использовать в новых экранах.

Стили конкретных экранов находятся в `<style scoped>` соответствующих `.vue`-файлов. Там тоже добавлены комментарии, объясняющие назначение блоков.

## Как добавить новый экран

1. Создать компонент, например `src/views/SettingsView.vue`.
2. Добавить дочерний маршрут в `src/router/index.ts`:

```ts
{
  path: 'settings',
  name: 'settings',
  component: () => import('../views/SettingsView.vue'),
}
```

3. Добавить ссылку в навигацию `src/layouts/AppLayout.vue`.

Такой экран автоматически будет защищён родительским `requiresAuth`.

## Подключение реального backend

1. Создать `.env.local`:

```bash
VITE_API_BASE_URL=https://api.example.com
```

2. Убедиться, что backend реализует:

- `POST /api/v1/auth/login` — принимает `username` и `password`, устанавливает refresh cookie, возвращает `accessToken`, `expiresAt` и `user`;
- `GET /api/v1/auth/refresh` — читает refresh cookie, ротирует её, возвращает `accessToken`, `expiresAt` и `user`;
- `POST /api/v1/auth/logout` — отзывает сессию и очищает cookie.

3. Настроить CORS с `credentials: true` и конкретным `Access-Control-Allow-Origin`, если frontend и API находятся на разных доменах.

4. Убедиться, что cookie имеет флаги `HttpOnly`, `Secure`, `SameSite` и `Path`, подходящие для домена API.

5. При необходимости изменить пути в `src/api/endpoints.ts`.

## Ограничения и безопасность

Текущая реализация — учебная заготовка:

- access-токен хранится в памяти и исчезает при перезагрузке; сессия восстанавливается через cookie;
- refresh-токен недоступен JavaScript, но при cross-site сценарии нужна отдельная CSRF-защита;
- mock-сессии хранятся в памяти, не имеют срока жизни и сбрасываются при перезапуске dev-сервера;
- mock ротирует refresh-токен, но не реализует reuse detection;
- при истечении сессии выполняется переход на логин, но незавершённые запросы могут завершиться ошибкой;
- несколько вкладок могут одновременно обновлять сессию; production-backend должен поддерживать grace period или другую защиту от гонки ротации;
- mock-API доступен только в dev/preview, в production нужен реальный backend;
- Zod увеличивает размер клиентского бандла; при жёстких требованиях к размеру можно рассмотреть `zod/mini`.

## Проверка

```bash
bun run typecheck
bun run build
```

Обе команды должны завершаться без ошибок.
