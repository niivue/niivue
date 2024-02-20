'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue crosshairWidth can be set', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error))
  const opts = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    nv.setCrosshairWidth(3)
    await nv.attachTo('gl')
    return nv.opts
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(opts.crosshairWidth).toEqual(3)
  ;(0, test_1.expect)(errors).toHaveLength(0)
})
// # sourceMappingURL=test.niivue.setCrosshairWidth.spec.js.map
