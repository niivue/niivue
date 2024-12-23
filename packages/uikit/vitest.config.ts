// /// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

// export default defineConfig({
//   plugins: [glsl()],
//   test: {
//     environment: 'browser', // Vitest runs in a browser-like environment
//     globals: true, // If you want to use global APIs like `describe`, `it`, etc.
//     include: ['tests/**/*.test.ts'], // Path to your test files
//   },
// })
export default defineConfig({
  plugins: [glsl()],
  test: {
    browser: {
      provider: 'playwright', // or 'webdriverio'
      enabled: true,
      name: 'chromium', // browser name is required
    },
  }
})
