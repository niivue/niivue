import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/niivue/index.js'],
  outDir: 'dist',
  splitting: true,
  sourcemap: true,
  clean: true,
  metafile: true
  // TODO: enable this as soon as TS port is completed
  // dts: true
})
