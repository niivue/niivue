'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue defaultOptions set correctly', async ({ page }) => {
  const opts = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    return nv.opts
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(opts.textHeight).toEqual(0.06)
  ;(0, test_1.expect)(opts.colorbarHeight).toEqual(0.05)
  ;(0, test_1.expect)(opts.crosshairWidth).toEqual(1)
  ;(0, test_1.expect)(opts.backColor).toEqual([0, 0, 0, 1])
  ;(0, test_1.expect)(opts.crosshairColor).toEqual([1, 0, 0, 1])
  ;(0, test_1.expect)(opts.selectionBoxColor).toEqual([1, 1, 1, 0.5])
  ;(0, test_1.expect)(opts.colorbarMargin).toEqual(0.05)
})
// # sourceMappingURL=test.niivue.defaultOptions.spec.js.map
