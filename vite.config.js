// vite.config.js
const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
    root: 'src',
		server: {
    fs: {
      // Allow serving files from one level up to the project root
    	allow: ['..']
    	}
  	},
    build: {
        outDir: '../dist',
        lib: {
            entry: path.resolve(__dirname, 'src/niivue.js'),
            name: 'niivue',
            fileName: (format) => `niivue.${format}.js`
        },
    }
})
