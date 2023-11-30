import { test, expect } from '@playwright/test'
import { httpServerAddress } from './helpers'

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto(httpServerAddress)
  console.log(`Running ${testInfo.title}`)
})

test('niivue utilities arrayEquals', async ({ page }) => {
  const val = await page.evaluate(() => {
    const nv = new niivue.Niivue()
    const arreq = nv.arrayEquals([1, 2, 3], [1, 2, 3])
    return arreq
  })
  await expect(val).toBeTruthy()
})
