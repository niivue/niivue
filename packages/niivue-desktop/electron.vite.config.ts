// packages/niivue-desktop/electron.vite.config.ts
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * electron-vite + Vite typings sometimes disagree about which fields are allowed
 * on the grouped main/preload/renderer objects (especially across Vite major
 * versions). To keep strict TS checkers happy while preserving runtime behavior,
 * we cast the nested Vite `build` blocks to `any`.
 *
 * The runtime Vite options used below are standard Vite options and should
 * work with Vite 7.x. If your environment still complains about missing named
 * exports from `vite`, make sure the workspace resolves Vite 7 for the
 * package (see earlier troubleshooting steps about hoisted vite versions).
 */

export default defineConfig({
  main: {
    // use a Vite-compatible `build` block for the main process
    build: ({
      outDir: 'out/main',
      // Keep native/Node modules external in the main process build
      rollupOptions: {
        external: ['electron', 'zlib', 'node:module', 'node:zlib', 'fflate', 'pako']
      },
      // If you want to prevent hoisting / externalization of certain deps,
      // tune externalizeDeps here. Some electron-vite versions expose an
      // externalizeDeps helper — but to avoid typing mismatch we keep this
      // block as a plain object. Adjust `exclude` / `include` to your needs.
      externalizeDeps: {
        exclude: []
      }
    } as any)
  },

  preload: {
    build: (({
      outDir: 'out/preload',
      rollupOptions: {
        external: ['electron', 'zlib', 'node:zlib', 'fflate', 'pako']
      },
      externalizeDeps: {
        exclude: []
      }
    }) as any)
  },

  renderer: {
    // Set public directory for static assets like WASM files
    publicDir: resolve(__dirname, 'public'),

    // allow serving files from the monorepo root (adjust path as needed)
    server: {
      fs: {
        allow: ['../../../../']
      }
    },

    worker: {
      format: 'es'
    },

    optimizeDeps: {
      exclude: ['@niivue/niivue', '@niivue/niimath', '@niivue/dcm2niix'],
      include: [
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-core',
        '@tensorflow/tfjs-layers',
        '@tensorflow/tfjs-converter',
        '@tensorflow/tfjs-data',
        '@tensorflow/tfjs-backend-cpu',
        '@tensorflow/tfjs-backend-webgl',
        '@tensorflow/tfjs-backend-wasm',
        '@tensorflow/tfjs-backend-webgpu'
      ]
    },

    build: (({
      outDir: 'out/renderer',
      commonjsOptions: {
        exclude: ['@niivue/niivue']
      },
      rollupOptions: {
        // treat these as external for renderer builds so they are not bundled
        external: [
          'zlib',
          'pako',
          'node:zlib',
          'module'
        ]
      },
      // If you want to keep certain internal packages externalized, list them
      // here. Otherwise move them to `optimizeDeps.exclude` / `commonjsOptions`
      // to bundle them.
      externalizeDeps: {
        include: ['@niivue/niivue', '@niivue/niimath', '@niivue/dcm2niix']
      }
    }) as any),

    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },

    plugins: [react() as any]
  }
})
