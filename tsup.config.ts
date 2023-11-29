import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/niivue/index.js'],
  outDir: 'dist',
  target: 'es2020',
  format: 'esm',
  sourcemap: true,
  clean: true,
  loader: {
    '.jpg': 'dataurl',
    '.png': 'dataurl'
  }
  // TODO: enable this as soon as TS port is completed
  // dts: true
})
