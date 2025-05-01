import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './playwright/tests-out',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 }
  },

  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.05 } // bumped to 5% due to github actions rendering differences
  },

  snapshotPathTemplate: './playwright/e2e/__screenshots__/{testName}/{testName}-{projectName}{ext}',

  maxFailures: 1,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        launchOptions: {
          // args: ['--headless', '--no-sandbox', '--use-angle=angle', '--use-gl=swiftshader']
          // args: ['--window-size=1280,720', '--no-sandbox']
          args: [
            '--headless=new', // new headless engine (Ozone/EGL)
            '--enable-features=UseOzonePlatform',
            '--ozone-platform=headless', // force Ozone headless backend
            '--use-gl=angle', // route GL through ANGLE :contentReference[oaicite:0]{index=0}
            // drop any --use-angle=swiftshader-webgl here—
            // ANGLE will pick up your system’s Mesa/EGL or SwiftShader automatically
            '--in-process-gpu', // run the GPU thread in-process so it can see your Mesa libs :contentReference[oaicite:1]{index=1}
            '--disable-software-rasterizer', // prefer ANGLE path
            '--no-sandbox',
            '--disable-dev-shm-usage'
          ]
        }
      }
    }

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
  webServer: {
    port: 8888,
    command: 'node server.js',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stderr: 'pipe',
    stdout: 'pipe'
  }
})
