import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'element-shadows-proof.spec.ts',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    video: 'on',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--force-device-scale-factor=1', '--high-dpi-support=1'],
    },
  },
});
