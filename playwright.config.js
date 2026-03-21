const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      // Express 백엔드 (port 3000)
      command: 'node --env-file=.env server/index.js',
      url: 'http://localhost:3000/api/fred/keys',
      reuseExistingServer: true,
      timeout: 15000,
    },
    {
      // Vite 프론트엔드 (port 5173)
      command: 'npx vite',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
})
