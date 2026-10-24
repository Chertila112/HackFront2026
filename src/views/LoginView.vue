<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../api/auth'
import AuthSplit from '../components/AuthSplit.vue'
import { loginCredentialsSchema } from '../schemas/auth'
import { useAuth } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const { setSession } = useAuth()

const form = reactive({
  username: 'admin@hack.local',
  password: 'admin123',
})

const redirectQuery =
  typeof route.query.redirect === 'string' &&
  route.query.redirect.startsWith('/') &&
  !route.query.redirect.startsWith('//')
    ? route.query.redirect
    : null

const registerTo = redirectQuery
  ? { path: '/register', query: { redirect: redirectQuery } }
  : { path: '/register' }

const validationError = ref<string | null>(null)

const mutation = useMutation({
  mutationFn: login,
  onSuccess: (session) => {
    setSession(session)

    const redirect =
      typeof route.query.redirect === 'string' &&
      route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/'

    router.replace(redirect)
  },
})

function clearErrors() {
  validationError.value = null
  mutation.reset()
}

function submit() {
  const parsed = loginCredentialsSchema.safeParse({
    username: form.username,
    password: form.password,
  })

  if (!parsed.success) {
    validationError.value =
      parsed.error.issues[0]?.message ?? 'Проверьте введённые данные'
    return
  }

  validationError.value = null
  mutation.mutate(parsed.data)
}
</script>

<template>
  <AuthSplit
    title="Вход"
    subtitle="Введите данные учётной записи, чтобы продолжить."
  >
    <form class="auth-card" novalidate @submit.prevent="submit">
      <label class="field">
        <span>Имя аккаунта</span>
        <input
          v-model="form.username"
          type="text"
          name="username"
          autocomplete="username"
          placeholder="Введите username"
          required
          @input="clearErrors"
        />
      </label>

      <label class="field">
        <span>Пароль</span>
        <input
          v-model="form.password"
          type="password"
          name="password"
          autocomplete="current-password"
          placeholder="Введите пароль"
          required
          @input="clearErrors"
        />
      </label>

      <p
        v-if="validationError || mutation.error.value"
        class="form-error"
        role="alert"
      >
        {{ validationError || mutation.error.value?.message }}
      </p>

      <button
        class="button auth-submit"
        type="submit"
        :disabled="mutation.isPending.value"
      >
        {{ mutation.isPending.value ? 'Вход…' : 'Войти' }}
      </button>

      <p class="switch-link">
        <span>Нет аккаунта?</span>
        <RouterLink :to="registerTo" class="switch-link-button">
          Зарегистрироваться
        </RouterLink>
      </p>
    </form>
  </AuthSplit>
</template>

<style scoped>
/* Карточка формы в правой колонке. */
.auth-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.auth-submit {
  width: 100%;
}

.switch-link {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin: 0;
  font-size: 14px;
}

.switch-link-button {
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}

.switch-link-button:hover {
  text-decoration: underline;
}
</style>
