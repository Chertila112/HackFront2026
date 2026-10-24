<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { onMounted, onUnmounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'

const router = useRouter()
const queryClient = useQueryClient()

function handleSessionExpired() {
  queryClient.clear()
  router.replace({
    name: 'login',
    query: { redirect: router.currentRoute.value.fullPath },
  })
}

onMounted(() => window.addEventListener('auth:session-expired', handleSessionExpired))
onUnmounted(() => window.removeEventListener('auth:session-expired', handleSessionExpired))
</script>

<template>
  <RouterView />
</template>
