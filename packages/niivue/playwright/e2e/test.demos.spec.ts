import * as fs from 'fs'
import { test, expect } from '@playwright/test'
import { httpServerAddressDemos } from './helpers.js'

// make a wait function that waits for a promise to resolve
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const files = fs.readdirSync('./demos/features').filter((f) => f.endsWith('.html'))
for (const file of files) {
  test(`niivue demo file: ${file}`, async ({ page }) => {
    await page.goto(`${httpServerAddressDemos}${file}`, { waitUntil: 'domcontentloaded' })
    // find the first canvas element on the page
    const canvas = await page.locator('canvas').first()
    await page.waitForSelector('canvas')
    // wait for the canvas to be fully rendered
    await wait(5000)
    await expect(canvas).toHaveScreenshot({ timeout: 30000 })
  })
}
