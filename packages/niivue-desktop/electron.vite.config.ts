import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['zlib', 'node:module', 'node:zlib', 'fflate', 'pako']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
    outDir: 'out/preload'
  }
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
      exclude: ['@niivue/niivue', '@niivue/niimath', '@niivue/dcm2niix']
    },
    build: {
      commonjsOptions: {
        exclude: ['@niivue/niivue']
      },
      rollupOptions: {
        external: ['zlib', 'pako', 'node:zlib', 'module']
      },
      outDir: 'out/renderer'
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
