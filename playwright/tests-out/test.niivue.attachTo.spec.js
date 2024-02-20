'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue attachTo', async ({ page }) => {
  const gl = await page.evaluate(async (testOptions) => {
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    return nv.gl
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(gl).toBeDefined()
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
// # sourceMappingURL=test.niivue.attachTo.spec.js.map
