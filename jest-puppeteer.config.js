export default {
  launch: {
    dumpio: true,
    headless: 'new',
    defaultViewport: null,
    args: [`--window-size=1920,1080`, '--no-sandbox', '--disable-setuid-sandbox'],
    product: 'chrome'
  },
  browserContext: 'default',
  server: {
    command: 'node server.js',
    port: 8888,
    launchTimeout: 10000
  }
}
