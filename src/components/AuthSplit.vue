<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <main class="auth-page">
    <section class="auth-brand">
      <div class="brand-text">
        <p class="brand-eyebrow">churn-dashboard</p>
        <h1 class="brand-title">{{ title }}</h1>
        <p v-if="subtitle" class="brand-subtitle">{{ subtitle }}</p>
      </div>
    </section>

    <div class="auth-divider" role="presentation"></div>

    <section class="auth-panel">
      <slot />
    </section>
  </main>
</template>

<style scoped>
/* Разделённый экран: слева бренд, посередине линия, справа форма. */
.auth-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  align-items: center;
  gap: clamp(28px, 5vw, 72px);
  min-height: 100svh;
  padding: clamp(24px, 5vw, 64px);
  background: var(--bg);
}

/* Левая колонка с брендом. */
.auth-brand {
  display: flex;
  flex-direction: column;
  gap: 20px;
  justify-self: end;
  max-width: 380px;
}

.brand-eyebrow {
  margin: 0 0 6px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.brand-title {
  margin: 0;
  color: var(--text-h);
  font-size: clamp(30px, 4vw, 40px);
  letter-spacing: -0.03em;
}

.brand-subtitle {
  margin: 10px 0 0;
  color: var(--text);
  font-size: 15px;
  line-height: 1.6;
}

/* Вертикальное разделение посередине. */
.auth-divider {
  width: 1px;
  height: min(60vh, 480px);
  background: var(--border);
}

.auth-panel {
  justify-self: start;
  width: min(100%, 400px);
}

/* На узких экранах — колонкой, разделитель горизонтальный. */
@media (max-width: 880px) {
  .auth-page {
    grid-template-columns: 1fr;
    align-content: center;
    justify-items: center;
    gap: 28px;
    text-align: center;
  }

  .auth-brand {
    align-items: center;
    justify-self: center;
  }

  .auth-divider {
    width: min(240px, 60%);
    height: 1px;
  }

  .auth-panel {
    justify-self: center;
  }
}
</style>
