const { test, expect } = require('@playwright/test')
const { httpServerAddress } = require('./helpers')

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(httpServerAddress)
  console.log(`Running ${testInfo.title}`)
})

test('niivue attachTo', async ({page}) => {
  const gl = await page.evaluate(async () => {
    nv = new niivue.Niivue()
    nv = await nv.attachTo('gl', false)
    return nv.gl
  })
  expect(gl).toBeDefined()
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

