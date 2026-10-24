import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { mockApiPlugin } from './mock-api.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), mockApiPlugin()],
})
