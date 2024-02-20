'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue utilities arrayEquals', async ({ page }) => {
  const val = await page.evaluate(() => {
    const nv = new index_1.Niivue()
    const arreq = nv.arrayEquals([1, 2, 3], [1, 2, 3])
    return arreq
  })
  await (0, test_1.expect)(val).toBeTruthy()
})
// # sourceMappingURL=test.niivue.arraysEqual.spec.js.map
