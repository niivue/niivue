import * as fs from 'fs'
import { test, expect } from '@playwright/test'
import { httpServerAddressDemos } from './helpers.js'

const files = fs.readdirSync('./demos/features').filter((f) => f.endsWith('.html'))
for (const file of files) {
  test(`niivue demo file: ${file}`, async ({ page }) => {
    await page.goto(`${httpServerAddressDemos}${file}`, { waitUntil: 'domcontentloaded' })
    // find the first canvas element on the page
    const canvas = await page.locator('canvas').first()
    await page.waitForSelector('canvas')
    await expect(canvas).toHaveScreenshot({ timeout: 30000 })
  })
}
