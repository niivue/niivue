import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // For development, serve the HTML file directly
  root: '.',
  
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'NiivueUIKit',
      fileName: (format) => `index.${format === 'es' ? 'es' : 'cjs'}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      // Mark dependencies as external so they're not bundled
      external: ['@niivue/niivue', '@niivue/uikit'],
      output: {
        globals: {
          '@niivue/niivue': 'Niivue',
          '@niivue/uikit': 'UIKit'
        }
      }
    },
    outDir: 'dist'
  },
  
  // For development server
  server: {
    open: '/index.html'
  }
}) 