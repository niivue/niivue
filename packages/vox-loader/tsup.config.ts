import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/lib/loader.ts', 'src/vox2nii.ts'],
  outDir: 'build',
  target: 'es2020',
  splitting: false,
  format: 'esm',
  sourcemap: true,
  clean: true,
  dts: true,
  cjsInterop: true,
  metafile: true
})
