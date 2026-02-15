import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/cli/**/*.test.ts'],
    testTimeout: 120000,
    hookTimeout: 30000,
    // CLI tests run in Node environment (no DOM needed)
    environment: 'node'
  }
})
