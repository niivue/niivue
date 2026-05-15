import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    testTimeout: 10000,
    environment: 'node'
  }
})
