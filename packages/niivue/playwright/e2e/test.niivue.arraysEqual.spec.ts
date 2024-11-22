import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('niivue utilities arrayEquals', async ({ page }) => {
  const val = await page.evaluate(() => {
    const nv = new Niivue()
    const arreq = nv.arrayEquals([1, 2, 3], [1, 2, 3])
    return arreq
  })
  await expect(val).toBeTruthy()
})
