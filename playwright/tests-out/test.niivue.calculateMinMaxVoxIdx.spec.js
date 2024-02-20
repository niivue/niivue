'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue calculateMinMaxVoxIdx', async ({ page }) => {
  const minmax = await page.evaluate((testOptions) => {
    const nv = new index_1.Niivue(testOptions)
    const minmax = nv.calculateMinMaxVoxIdx([10, 1])
    return minmax
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(minmax).toEqual([1, 10])
})
// # sourceMappingURL=test.niivue.calculateMinMaxVoxIdx.spec.js.map
