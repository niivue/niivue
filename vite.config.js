import { resolve } from 'path'
import commonjs from '@rollup/plugin-commonjs'
import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    open: '/demos/index.html',
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    }
  },
  optimizeDeps: {
    include: ['nifti-reader-js']
  },
  plugins: [
    commonjs({
      include: /node_modules/
    })
  ],
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
