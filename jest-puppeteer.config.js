module.exports = {
  launch: {
    dumpio: true,
    headless: true, // process.env.HEADLESS === "true",
    defaultViewport: null,
    args: [`--window-size=1920,1080`, '--no-sandbox', '--disable-setuid-sandbox'],
    product: 'chrome'
  },
  browserContext: 'default',
  server: {
    command: "node server.js",
    port: 5000,
    launchTimeout: 10000
  }
}