<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import { reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { register } from '../api/auth'
import { loginCredentialsSchema } from '../schemas/auth'
import { useAuth } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const { setSession } = useAuth()

const form = reactive({
  username: '',
  password: '',
  repeatPassword: ''
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
  <main class="login-page">
    <form class="login-card" novalidate @submit.prevent="submit">
      <div>
        <p class="eyebrow">Вход</p>
        <h1>Регистрация</h1>
        <p class="muted">Введите данные учётной записи, чтобы продолжить.</p>
      </div>

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

      <label class="field">
        <span>Подтвердите пароль</span>
        <input
          v-model="form.repeatPassword"
          type="password"
          name="repeatPassword"
          autocomplete="current-password"
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

      <button class="button login-submit" type="submit" :disabled="mutation.isPending.value">
        {{ mutation.isPending.value ? 'Входим…' : 'Зарегистрироваться' }}
      </button>

      <p class="demo-hint">
        Демо-аккаунты:<br />
        <code class="code">demo / demo1234</code><br />
        <code class="code">user / user1234</code>
      </p>
    </form>
  </main>
</template>

<style scoped>
/* Центрируем форму на весь экран. */
.login-page {
  display: grid;
  place-items: center;
  min-height: 100svh;
  padding: 24px;
  background: var(--bg);
}

/* Карточка формы. Меняйте ширину, отступы и тень здесь. */
.login-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(100%, 380px);
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
}

/* Заголовок внутри карточки. */
.login-card h1 {
  margin: 0 0 6px;
  font-size: 30px;
  letter-spacing: -0.03em;
}

/* Кнопка входа растягивается на всю ширину карточки. */
.login-submit {
  width: 100%;
}

/* Подсказка с демо-учётками. */
.demo-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.8;
  text-align: center;
}
</style>
