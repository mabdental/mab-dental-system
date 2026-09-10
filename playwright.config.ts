import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  reporter: [['list']],
  use: {
    trace: 'on-first-retry',
    baseURL: 'http://localhost:3000',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'] } },
  ],
  webServer: [
    { command: 'npm.cmd run dev:web', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120000 },
    { command: 'npm.cmd run dev:admin', url: 'http://localhost:3001/login', reuseExistingServer: true, timeout: 120000 },
  ],
})
