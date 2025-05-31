// packages/uikit/vite.config.ts
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  // Shared settings (both dev & build)
  const shared = {
    plugins: [
      glsl({
        include: '**/*.glsl',  // Allows importing .vert.glsl / .frag.glsl
        compress: false
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      },
      // Let Vite resolve .ts, .js, .glsl without having to specify extensions
      extensions: ['.js', '.ts', '.glsl']
    }
  };

  if (command === 'serve') {
    // Development server mode (vite dev)
    return {
      ...shared,
      // By default Vite will look for index.html in the project root,
      // so make sure you placed "index.html" at the top of packages/uikit/.
      root: '.',        // project root
      base: './',       // so that assets are loaded relative to index.html
      server: {
        port: 5173       // you can pick any port you prefer
      }
      // No build.lib here—dev will simply serve index.html → src/index.ts
    };
  } else {
    // Build mode (vite build)
    return {
      ...shared,
      build: {
        // Make a “library” bundle from src/index.ts
        lib: {
          entry: path.resolve(__dirname, 'src/index.ts'),
          name: 'UIKit',                         // global UMD name (if you ever build UMD)
          fileName: (format) => `index.${format}.js`,
          formats: ['es', 'cjs']                // output both ESM and CommonJS
        },
        rollupOptions: {
          external: [],                         // list external deps here if needed
          output: {
            globals: {}                         // provide global var overrides for UMD, if any
          }
        }
      }
    };
  }
});
