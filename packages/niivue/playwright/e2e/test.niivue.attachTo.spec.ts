import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue attachTo', async ({ page }) => {
  const gl = await page.evaluate(async (testOptions) => {
    console.log('Niivue in browser ', Niivue)
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    return nv.gl
  }, TEST_OPTIONS)

  expect(gl).toBeDefined()
  await page.waitForTimeout(1000)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
