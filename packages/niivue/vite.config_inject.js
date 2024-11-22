// vite.config.js
// import path using import rather than require
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { deflateSync } from 'zlib'
import commonjs from '@rollup/plugin-commonjs'
import { defineConfig } from 'vite'

// function that reads the text contents of ./dist/niivue.umd.js as a string.
// that string is then injected into the __NIIVUE_UMD__ variable in the
// bundle. This allows niivue to inject itself into html pages constructed
// by saveAsHtml.
function readAndZipNiivueUmd() {
  const niivueUmd = readFileSync('./dist_intermediate/niivue.umd.js', 'utf8')
  // use nodejs zlib to compress the string
  const compressed = deflateSync(niivueUmd)
  // convert to base64
  const base64 = compressed.toString('base64')
  // console.log(base64)
  // convert to a string literal
  const stringLiteral = String.raw`${base64}`
  // return the string literal
  return stringLiteral
}

const niivueUmd = readAndZipNiivueUmd()

export default defineConfig({
  define: {
    __NIIVUE_VERSION__: JSON.stringify(process.env.npm_package_version),
    __NIIVUE_UMD__: JSON.stringify(niivueUmd)
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
    outDir: './dist',
    emptyOutDir: false,
    lib: {
      formats: ['umd'],
      entry: resolve(__dirname, 'src/niivue/index.ts'),
      name: 'niivue',
      fileName: (format) => `niivue.${format}.js`
    }
  }
})
