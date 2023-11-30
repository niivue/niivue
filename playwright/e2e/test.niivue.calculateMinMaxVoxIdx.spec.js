import { test, expect } from '@playwright/test'
import { httpServerAddress } from './helpers'

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
