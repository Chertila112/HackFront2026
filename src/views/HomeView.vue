<script setup lang="ts">
import { useAuth } from '../stores/auth'

const { state } = useAuth()
</script>

<template>
  <section class="page">
    <div class="page-head">
      <p class="eyebrow">Главная</p>
      <h1>Главная страница</h1>
      <p class="lead">
        Добро пожаловать, {{ state.user?.username }}. Это стандартный экран проекта.
      </p>
    </div>

    <div class="panel home-panel">
      <p class="muted">
        Данные пользователя и статус сессии доступны на странице профиля.
      </p>
      <RouterLink class="button" to="/profile">Перейти в профиль</RouterLink>
    </div>
  </section>
</template>

<style scoped>
/* Карточка на главной: меняйте отступы и выравнивание здесь. */
.home-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 520px;
}

/* Убираем лишний отступ у абзацев внутри карточки. */
.home-panel p {
  margin: 0;
}
</style>
