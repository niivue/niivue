module.exports = {
  launch: {
    dumpio: true,
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    product: 'chrome'
  },
  browserContext: 'default',
  server: {
    command: "node server.js",
    port: 5000,
    launchTimeout: 10000
  }
}