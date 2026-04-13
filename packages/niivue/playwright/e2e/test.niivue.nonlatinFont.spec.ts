import test, { expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test('niivue renders non-Latin Unicode text with Poem font', async ({ page }) => {
    const loaded = await page.evaluate(async (testOptions) => {
        // eslint-disable-next-line no-undef
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        const fontUrl = 'https://raw.githubusercontent.com/niivue/fonts/main/fonts/Poem'
        await nv.loadFont(fontUrl + '.png', fontUrl + '.json')
        nv.opts.loadingText = '麻雀虽小'
        nv.drawScene()
        return true
    }, TEST_OPTIONS)
    expect(loaded).toBe(true)
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})
