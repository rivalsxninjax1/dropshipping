import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore - optional sentry plugin
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { configDefaults } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.SENTRY_AUTH_TOKEN ? [sentryVitePlugin({ org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT })] : [])
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Default to localhost for host-machine dev. Docker compose passes VITE_API_BASE=http://backend:8000
        target: process.env.VITE_API_BASE || 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    exclude: [...configDefaults.exclude, 'e2e/**']
  }
})
