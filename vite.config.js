// vite.config.js
const path = require("path");
const { defineConfig } = require("vite");
import commonjs from "@rollup/plugin-commonjs";

module.exports = defineConfig({
  define: {
    __NIIVUE_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  root: ".",
  server: {
    open: "/src/index.html",
    fs: {
      // Allow serving files from one level up to the project root
      allow: [".."],
    },
  },
  optimizeDeps: {
    include: ['nifti-reader-js'],
  },
  plugins: [commonjs({
    include: /node_modules/,
  })],
  build: {
    outDir: "./dist",
    lib: {
      entry: path.resolve(__dirname, "src/niivue.js"),
      name: "niivue",
      fileName: (format) => `niivue.${format}.js`,
    },
  },
});
