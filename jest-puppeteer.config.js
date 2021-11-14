module.exports = {
  launch: {
    dumpio: true,
    headless: false, // process.env.HEADLESS === "true",
    defaultViewport: null,
    args: [`--window-size=1920,1080`, '--no-sandbox', '--disable-setuid-sandbox'],
    product: 'chrome'
  },
  browserContext: 'default',
  server: {
    command: "node server.js",
    port: 8888,
    launchTimeout: 10000
  }
}