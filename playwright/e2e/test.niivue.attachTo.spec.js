import { test, expect } from '@playwright/test'
import { httpServerAddress } from './helpers'

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(httpServerAddress)
  console.log(`Running ${testInfo.title}`)
})

test('niivue attachTo', async ({ page }) => {
  const gl = await page.evaluate(async () => {
    const nv = new niivue.Niivue()
    await nv.attachTo('gl', false)
    return nv.gl
  })
  expect(gl).toBeDefined()
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
