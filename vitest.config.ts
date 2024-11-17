import { defineConfig, coverageConfigDefaults } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        'demos/**',
        'docs/**',
        'playwright*/**',
        'devdocs/**',
        'tests/**',
        'dist_intermediate/**',
        'bundle.js',
        '**/*.config.*',
        'server.js'
      ]
    },
    dir: 'tests/unit',
    environment: 'happy-dom'
  },
  plugins: [tsconfigPaths()]
})
