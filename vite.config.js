// vite.config.js
const path = require('path')
const { defineConfig } = require('vite')
import commonjs from '@rollup/plugin-commonjs';

module.exports = defineConfig({
    root: '.',
		server: {
			open: '/src/index.html',
    	fs: {
				// Allow serving files from one level up to the project root
				allow: ['..']
    	}
  	},
  plugins: [
    commonjs()
  ],
    build: {
        outDir: './dist',
        lib: {
            entry: path.resolve(__dirname, 'src/niivue.js'),
            name: 'niivue',
            fileName: (format) => `niivue.${format}.js`
        },
    }
})
