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
  platform: 'browser'
})
