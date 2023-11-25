import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/niivue/index.js'],
  outDir: 'dist',
  target: 'es2020',
  splitting: false,
  format: 'esm',
  sourcemap: true,
  clean: true,
  loader: {
    '.jpg': 'base64',
    '.png': 'base64'
  },
  // TODO: remove this once UMD isn't needed anymore
  noExternal: [/(.*)/]
  // TODO: enable this as soon as TS port is completed
  // dts: true
})
