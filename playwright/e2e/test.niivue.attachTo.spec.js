import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue attachTo', async ({ page }) => {
  const gl = await page.evaluate(async (testOptions) => {
    const nv = new niivue.Niivue(testOptions)
    await nv.attachTo('gl', false)
    return nv.gl
  })
  expect(gl).toBeDefined()
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
