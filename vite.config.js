// vite.config.js
const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
    root: 'src',
    build: {
        outDir: '../dist',
        lib: {
            entry: path.resolve(__dirname, 'src/niivue.js'),
            name: 'niivue',
            fileName: (format) => `niivue.${format}.js`
        },
    }
})