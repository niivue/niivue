import { resolve } from 'path'
import commonjs from '@rollup/plugin-commonjs'
import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    __NIIVUE_VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  root: '.',
  server: {
    open: '/src/index.html',
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['../..']
    }
  },
  optimizeDeps: {
    // include: ['nifti-reader-js'],
    exclude: ['@niivue/dcm2niix']
  },
  plugins: [
    commonjs({
      include: /node_modules/
    })
  ],
  worker: {
    format: 'es'
  },
  build: {
    outDir: './dist_intermediate',
    emptyOutDir: false,
    lib: {
      formats: ['umd'],
      entry: resolve(__dirname, 'src/niivue/index.ts'),
      name: 'niivue',
      fileName: (format) => `niivue.${format}.js`
    }
  }
})
