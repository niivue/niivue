import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue calculateMinMaxVoxIdx', async ({ page }) => {
  const minmax = await page.evaluate((testOptions) => {
    const nv = new Niivue(testOptions)
    const minmax = nv.calculateMinMaxVoxIdx([10, 1])
    return minmax
  }, TEST_OPTIONS)
  expect(minmax).toEqual([1, 10])
})
