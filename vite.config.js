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
    lib: {
      entry: resolve(__dirname, 'src/niivue/index.js'),
      name: 'niivue',
      fileName: (format) => `niivue.${format}.js`
    }
  }
})
