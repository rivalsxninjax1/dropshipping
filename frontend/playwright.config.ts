import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173',
    headless: true
  },
  webServer: [
    {
      command: 'npm run preview',
      cwd: '.',
      url: 'http://localhost:4173',
      timeout: 120000,
      reuseExistingServer: !process.env.CI
    }
  ]
})

