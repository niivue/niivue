import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/niivue/index.ts'],
  outDir: 'build',
  target: 'es2020',
  splitting: false,
  format: 'esm',
  sourcemap: true,
  clean: true,
  loader: {
    '.jpg': 'dataurl',
    '.png': 'dataurl'
  },
  dts: true,
  metafile: true,
  platform: 'browser',
  external: [
    'fflate', // often the source of DEFLATE-related code
    'pako', // another possible compression module
    'zlib', // Node's native compression (not for browser!)
    'node:zlib', // same reason
    'node:module' // uses createRequire
  ]
})
