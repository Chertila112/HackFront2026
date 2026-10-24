<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { logout as logoutRequest } from '../api/auth'
import { useAuth } from '../stores/auth'

const router = useRouter()
const queryClient = useQueryClient()
const { displayName, clearSession } = useAuth()

async function logout() {
  try {
    await logoutRequest()
  } finally {
    await queryClient.cancelQueries()
    queryClient.clear()
    clearSession()
    router.replace({ name: 'login' })
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink class="brand" to="/">HackFront</RouterLink>

      <nav class="app-nav" aria-label="Основная навигация">
        <RouterLink to="/" active-class="is-active">Главная</RouterLink>
        <RouterLink to="/analytics" active-class="is-active">Аналитика</RouterLink>
      </nav>

      <div class="app-user">
        <span class="user-name">{{ displayName }}</span>
        <button class="button button--ghost" type="button" @click="logout">
          Выйти
        </button>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Общая оболочка приложения на всю высоту экрана. */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  background: var(--bg);
}

/* Шапка: липкая, чтобы навигация была всегда доступна. */
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 14px clamp(18px, 4vw, 40px);
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

/* Логотип/название проекта. */
.brand {
  color: var(--text-h);
  font-size: 17px;
  font-weight: 700;
  text-decoration: none;
}

/* Группа ссылок навигации. */
.app-nav {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: var(--surface-muted);
}

.app-nav a {
  padding: 7px 14px;
  border-radius: 999px;
  color: var(--text);
  font-size: 14px;
  text-decoration: none;
}

.app-nav a:hover {
  color: var(--text-h);
}

/* Активная ссылка навигации. */
.app-nav a.is-active {
  background: var(--surface);
  color: var(--text-h);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* Блок пользователя прижат к правому краю. */
.app-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.user-name {
  max-width: 220px;
  overflow: hidden;
  color: var(--text);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Контент страницы на всю ширину с небольшим отступом. */
.app-main {
  flex: 1;
  width: 100%;
  padding: clamp(16px, 2.5vw, 28px) clamp(12px, 2vw, 24px);
}

/* На мобильных прячем имя и переносим навигацию на новую строку. */
@media (max-width: 760px) {
  .app-header {
    flex-wrap: wrap;
    gap: 12px;
  }

  .app-nav {
    order: 3;
    width: 100%;
    justify-content: center;
  }

  .user-name {
    display: none;
  }
}
</style>
