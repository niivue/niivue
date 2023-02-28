const os = require("os");
module.exports = {
  launch: {
    dumpio: true,
    headless:
      process.arch === "arm64" && process.platform === "darwin" ? false : true,
    defaultViewport: null,
    args: [
      `--window-size=1920,1080`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
    product: "chrome",
  },
  browserContext: "default",
  server: {
    command: "node server.js",
    port: 8888,
    launchTimeout: 10000,
  },
};
