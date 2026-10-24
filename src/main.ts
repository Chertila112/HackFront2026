import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'
import App from './App.vue'
import { fetchSession } from './api/auth'
import { queryClient } from './lib/queryClient'
import { router } from './router'
import { useAuth } from './stores/auth'
import './style.css'

async function bootstrap() {
  try {
    const session = await fetchSession()
    useAuth().setSession(session)
  } catch {
    useAuth().clearSession()
  }

  createApp(App)
    .use(router)
    .use(VueQueryPlugin, { queryClient })
    .mount('#app')
}

bootstrap()
