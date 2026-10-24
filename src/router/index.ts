import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth'
import AnalyticsView from '../views/AnalyticsView.vue'
import AppLayout from '../layouts/AppLayout.vue'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true },
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: HomeView,
      },
      {
        path: 'analytics',
        name: 'analytics',
        component: AnalyticsView,
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'home' },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const { isAuthenticated } = useAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'home' }
  }

  return true
})
