import { test, expect } from '@playwright/test'
import { Niivue, UIKit, UIKFont } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('nvui drawText unicode rtl fonts', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    const ui = new UIKit(nv.gl)

    const hebrew = 'קומיסורה קדמית'
    const russian = 'передняя комиссура'

    const russianFont = new UIKFont(nv.gl)
    await russianFont.loadFont('./fonts/Roboto-Regular-Extra.png', './fonts/Roboto-Regular-Extra.json')
    const left = nv.canvas.width / 2
    const textHeight = russianFont.getTextHeight(russian)
    let top = (nv.canvas.height - textHeight) / 2

    const hebrewFont = new UIKFont(nv.gl)
    await hebrewFont.loadFont('./fonts/Heebo-Regular.png', './fonts/Heebo-Regular.json')

    nv.gl.viewport(0, 0, nv.canvas.width, nv.canvas.height)
    nv.gl.clear(nv.gl.COLOR_BUFFER_BIT)

    // Draw the Russian text
    ui.drawText({
      font: russianFont,
      position: [left, top],
      text: russian
    })
    top += textHeight * 2

    // Draw the Hebrew text
    ui.drawText({
      font: hebrewFont,
      position: [left, top],
      text: hebrew
    })
  }, TEST_OPTIONS)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
