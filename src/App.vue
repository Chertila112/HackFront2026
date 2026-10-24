<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { onMounted, onUnmounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { startRealtime, stopRealtime } from './lib/realtime'
import { useAuth } from './stores/auth'

const router = useRouter()
const queryClient = useQueryClient()
const { isAuthenticated } = useAuth()

const stopAuthWatch = watch(
  isAuthenticated,
  (value) => {
    if (value) {
      void startRealtime()
      return
    }

    void stopRealtime()
  },
  { immediate: true },
)

function handleSessionExpired() {
  queryClient.clear()
  router.replace({
    name: 'login',
    query: { redirect: router.currentRoute.value.fullPath },
  })
}

onMounted(() => window.addEventListener('auth:session-expired', handleSessionExpired))
onUnmounted(() => {
  window.removeEventListener('auth:session-expired', handleSessionExpired)
  stopAuthWatch()
  void stopRealtime()
})
</script>

<template>
  <RouterView />
</template>
