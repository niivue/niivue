import { readFile, writeFile } from 'fs/promises'
import { build } from 'tsup'

// inline top-level async/await
;(async () => {
  // build bundle with tsup
  await build({
    entry: ['src/niivue/index.ts'],
    outDir: 'dist_intermediate/demos',
    target: 'es2020',
    splitting: false,
    format: 'esm',
    sourcemap: false,
    clean: true,
    loader: {
      '.jpg': 'dataurl',
      '.png': 'dataurl'
    },
    minify: 'terser',
    noExternal: [/(.*)/]
  })

  // load output and export it again as a string
  const content = await readFile('./dist_intermediate/demos/index.js', 'utf-8')

  await writeFile('./dist/index.min.js', `export const esm = "${encodeURIComponent(content)}"`)
})()
