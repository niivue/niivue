import * as fs from 'fs'
import { test, expect } from '@playwright/test'
import { httpServerAddressDemos } from './helpers.js'

const files = fs.readdirSync('./demos/features').filter((f) => f.endsWith('.html'))
for (const file of files) {
  test(`niivue demo file: ${file}`, async ({ page }) => {
    await page.goto(`${httpServerAddressDemos}${file}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot({ timeout: 30000 })
  })
}
