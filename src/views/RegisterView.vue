<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { register } from '../api/auth'
import AuthSplit from '../components/AuthSplit.vue'
import { loginCredentialsSchema } from '../schemas/auth'
import { useAuth } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const { setSession } = useAuth()

const form = reactive({
  username: '',
  password: '',
  repeatPassword: '',
})

const passwordsMismatch = computed(
  () =>
    form.repeatPassword.length > 0 &&
    form.password !== form.repeatPassword,
)

const validationError = ref<string | null>(null)

const mutation = useMutation({
  mutationFn: register,
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

  if (passwordsMismatch.value) {
    validationError.value = 'Пароли не совпадают'
    return
  }

  validationError.value = null
  mutation.mutate(parsed.data)
}
</script>

<template>
  <AuthSplit
    title="Регистрация"
    subtitle="Создайте учётную запись, чтобы получить доступ к аналитике."
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
          autocomplete="new-password"
          placeholder="Введите пароль"
          required
          @input="clearErrors"
        />
      </label>

      <label class="field">
        <span>Подтвердите пароль</span>
        <input
          v-model="form.repeatPassword"
          type="password"
          name="repeatPassword"
          autocomplete="new-password"
          placeholder="Подтвердите пароль"
          required
          @input="clearErrors"
        />
      </label>

      <small v-if="passwordsMismatch" class="field-error">
        Пароли не совпадают
      </small>

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
        {{ mutation.isPending.value ? 'Создание аккаунта…' : 'Зарегистрироваться' }}
      </button>

      <p class="switch-link">
        <span>Уже есть аккаунт?</span>
        <RouterLink class="switch-link-button" :to="{ path: '/login' }">
          Войти
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

.field-error {
  margin: -6px 0 0;
  color: var(--danger);
  font-size: 13px;
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
