import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl';
import path from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'), // Entry file
      name: 'UIKit', // Global variable name for UMD build
      fileName: (format) => `index.${format}.js`, // Output file names
      formats: ['es', 'cjs'] // Build both ESM and CommonJS
    },
    rollupOptions: {
      external: [], // Add external dependencies if necessary
      output: {
        globals: {} // Add global variables for UMD builds if necessary
      }
    }
  },
  plugins: [glsl({
    include: '**/*.glsl', // Match shader files
    compress: false // Optional: Compress GLSL code
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.js', '.ts', '.glsl'] // Add `.glsl` here
  }
})
