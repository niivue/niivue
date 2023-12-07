import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/niivue/index.ts'],
  outDir: 'dist',
  target: 'es2020',
  splitting: false,
  format: 'esm',
  sourcemap: true,
  clean: true,
  loader: {
    '.jpg': 'dataurl',
    '.png': 'dataurl'
  },
  // TODO: remove this once testing setup doesn't rely on one single JS file
  noExternal: [/(.*)/]
  // TODO: enable this as soon as TS port is completed
  // dts: true
})
