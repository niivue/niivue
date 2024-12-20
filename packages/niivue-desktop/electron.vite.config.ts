import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    server: {
      fs: {
        // allow vite dev server to serve files from the monorepo root where shared node_modules is located
        allow: ['../../../../']
      }
    },
    worker: {
      format: 'es'
    },
    optimizeDeps: {
      exclude: ['@niivue/niimath', '@niivue/dcm2niix']
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
