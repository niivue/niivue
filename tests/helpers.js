const path = require('path')
const fs = require('fs')
const { toMatchImageSnapshot } = require('jest-image-snapshot')

expect.extend({ toMatchImageSnapshot })

async function snapshot(id = '#gl', failureThreshold = 0.1) {
  const canvas = await page.$(id)
  const image = await canvas.screenshot()

  expect(image).toMatchImageSnapshot({
    failureThreshold,
    failureThresholdType: 'percent'
  })
}

function seconds(n) {
  return 1000 * n
}

function ensureDownloadFolder() {
  const downloadPath = path.resolve('./downloads')
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true })
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

module.exports.wait = wait
module.exports.httpServerAddress = 'http://localhost:8888/tests/index.html'
module.exports.httpServerAddressSync = 'http://localhost:8888/tests/sync.html'
module.exports.httpServerAddressFlexbox = 'http://localhost:8888/tests/flexbox.html'
module.exports.httpServerAddressDemos = 'http://localhost:8888/demos/features/'
module.exports.snapshot = snapshot
module.exports.seconds = seconds
module.exports.ensureDownloadFolder = ensureDownloadFolder
