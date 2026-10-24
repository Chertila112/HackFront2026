<script setup lang="ts">
import { useAuth } from '../stores/auth'

const { state } = useAuth()
</script>

<template>
  <section class="page">
    <div class="page-head">
      <p class="eyebrow">Профиль</p>
      <h1>Данные пользователя</h1>
      <p class="lead">
        Здесь хранится глобальное состояние пользователя и статус сессии.
      </p>
    </div>

    <div class="grid">
      <article class="panel">
        <h2>Учётная запись</h2>
        <dl class="info-list">
          <div>
            <dt>Username</dt>
            <dd>{{ state.user?.username || '—' }}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>{{ state.user?.id || '—' }}</dd>
          </div>
        </dl>
      </article>

      <article class="panel">
        <h2>Сессия</h2>
        <p class="muted">
          Access-токен хранится только в памяти приложения. Refresh-токен
          недоступен JavaScript и передаётся в HttpOnly cookie.
        </p>

        <dl class="info-list">
          <div>
            <dt>Access-токен</dt>
            <dd>
              <span class="badge">
                {{ state.accessToken ? 'В памяти' : 'Отсутствует' }}
              </span>
            </dd>
          </div>
          <div>
            <dt>Refresh-токен</dt>
            <dd><code class="code">HttpOnly cookie</code></dd>
          </div>
        </dl>
      </article>
    </div>
  </section>
</template>

<style scoped>
/* Заголовки карточек. */
.panel h2 {
  margin: 0 0 18px;
  font-size: 19px;
  letter-spacing: -0.02em;
}

/* Список пар «ключ — значение». */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
}

.info-list > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.info-list > div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.info-list dt {
  color: var(--text);
  font-size: 14px;
}

.info-list dd {
  margin: 0;
  color: var(--text-h);
  font-size: 14px;
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}

/* Отступ между описанием и списком. */
.panel .muted {
  margin-bottom: 16px;
}
</style>
