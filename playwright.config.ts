import { defineConfig, devices } from 'playwright/test';

const useProduction = !!process.env.BASE_URL;

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Headed + GPU when running against production so queryRenderedFeatures works
        headless: !useProduction,
        launchOptions: useProduction ? { args: ['--enable-gpu'] } : {},
      },
    },
  ],
  use: {
    viewport: { width: 1280, height: 800 },
  },
  // Skip local dev server when testing against a remote BASE_URL
  ...(useProduction ? {} : {
    webServer: {
      command: 'npm -w console run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  }),
});
