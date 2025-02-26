import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/niivue/index.ts'],
  outDir: 'dist', // use dist for tests so we don't need to modify all test files
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
  noExternal: [/(.*)/],
  dts: true,
  metafile: true,
  platform: 'browser'
})
