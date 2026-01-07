import { defineConfig, devices } from '@playwright/test';

const isCI: boolean = Boolean(process.env.CI);

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './playwright/e2e',
  testMatch: ['**/*.spec.ts'],
  testIgnore: ['**/tests-out/**', '**/dist/**'],

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,

  /* Retry on CI, or once locally for flaky tests */
  retries: isCI ? 2 : 1,

  /* Opt-in workers on CI only */
  workers: isCI ? 2 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }]],

  /* Shared settings for all the projects below. */
  use: {
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },

  expect: {
    // bumped to 5% due to GitHub Actions rendering differences
    toHaveScreenshot: { maxDiffPixelRatio: 0.05 },
  },

  snapshotPathTemplate:
    './playwright/e2e/__screenshots__/{testName}/{testName}-{projectName}{ext}',

  maxFailures: 1,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        launchOptions: {
          args: isCI
            ? ['--window-size=1280,720']
            : [
                '--window-size=1280,720',
                '--use-gl=angle',
                '--enable-unsafe-swiftshader',
              ],
        },
      },
    },
  ],

  webServer: {
    port: 8888,
    command: 'node server.js',
    timeout: 120 * 1000,
    reuseExistingServer: !isCI,
    stderr: 'pipe',
    stdout: 'pipe',
  },
});
