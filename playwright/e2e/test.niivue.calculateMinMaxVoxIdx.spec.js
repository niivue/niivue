const { test, expect } = require('@playwright/test')
const { httpServerAddress } = require('./helpers')

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(httpServerAddress)
  console.log(`Running ${testInfo.title}`)
})

test('niivue calculateMinMaxVoxIdx', async ({ page }) => {
  const minmax = await page.evaluate(() => {
    const nv = new niivue.Niivue()
    const minmax = nv.calculateMinMaxVoxIdx([10, 1])
    return minmax
  })
  expect(minmax).toEqual([1, 10])
})
