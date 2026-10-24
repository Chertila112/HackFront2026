import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'
import App from './App.vue'
import { fetchMe, fetchSession } from './api/auth'
import { queryClient } from './lib/queryClient'
import { router } from './router'
import { useAuth } from './stores/auth'
import './style.css'

const { isAuthenticated, restoreSession, setSession, clearSession } = useAuth()

async function bootstrap() {
  const stored = restoreSession()

  if (stored) {
    setSession(stored)
  } else {
    try {
      setSession(await fetchSession())
    } catch {
      clearSession()
    }
  }

  createApp(App)
    .use(router)
    .use(VueQueryPlugin, { queryClient })
    .mount('#app')

  if (isAuthenticated.value) {
    void fetchMe().catch(() => {})
  }
}

bootstrap()
