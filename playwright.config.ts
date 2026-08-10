import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!Deno.env.get('CI'),
  retries: Deno.env.get('CI') ? 2 : 0,
  workers: Deno.env.get('CI') ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'deno task build && deno task preview',
    port: 3000,
    reuseExistingServer: !Deno.env.get('CI'),
    timeout: 180_000,
  },
});
