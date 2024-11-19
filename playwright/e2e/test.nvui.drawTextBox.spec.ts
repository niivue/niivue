import { test, expect } from '@playwright/test'
import { Niivue, UIKit, UIKFont } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('nvui drawTextBoxCenteredOn roundness', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    const ui = new UIKit(nv.gl)
    const font = new UIKFont(nv.gl)
    await font.loadFont('./fonts/Roboto-Regular-Extra.png', './fonts/Roboto-Regular-Extra.json')

    const str = 'hello world'
    const textHeight = font.getTextHeight(str)
    const textWidth = font.getTextWidth(str)
    const leftTopWidthHeight = [
      (nv.canvas.width - textWidth) / 4,
      (nv.canvas.height - textHeight) / 8,
      textWidth,
      textHeight
    ]
    const textColor = [0, 0, 1, 1]
    const fillColor = [0, 1, 0, 0.5]
    const outlineColor = [1, 1, 1, 1]
    const margin = 15
    const spacing = textHeight * 3
    const scale = 0.5

    nv.gl.viewport(0, 0, nv.canvas.width, nv.canvas.height)
    nv.gl.clear(nv.gl.COLOR_BUFFER_BIT)

    const roundnessValues = [0.0, 0.25, 0.5, 0.75, 1.0]
    roundnessValues.forEach((roundness, i) => {
      const position = [leftTopWidthHeight[0], leftTopWidthHeight[1] + spacing * i] as [number, number]
      ui.drawTextBoxCenteredOn({
        font,
        position,
        str,
        textColor,
        outlineColor,
        fillColor,
        margin,
        roundness,
        scale
      })
      ui.drawText({
        font,
        position: [leftTopWidthHeight[0] + textWidth + spacing, leftTopWidthHeight[1] + spacing * i - textHeight],
        text: `roundness = ${roundness.toFixed(2)}`,
        scale
      })
    })
  }, TEST_OPTIONS)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('uikit drawTextBoxCenteredOn aspect ratio sides stay rounded', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    const ui = new UIKit(nv.gl)
    const font = new UIKFont(nv.gl)
    await font.loadFont('./fonts/Roboto-Regular-Extra.png', './fonts/Roboto-Regular-Extra.json')

    const textColor = [0, 0, 1, 1]
    const fillColor = [0, 1, 0, 0.5]
    const outlineColor = [1, 1, 1, 1]
    const margin = 15
    const spacing = font.getTextHeight('very long rectangular box') * 3
    const scale = 0.5
    const roundness = 0.5
    const leftTopWidthHeight = [nv.canvas.width / 2, nv.canvas.height / 4] as [number, number]

    nv.gl.viewport(0, 0, nv.canvas.width, nv.canvas.height)
    nv.gl.clear(nv.gl.COLOR_BUFFER_BIT)

    const strings = ['very long rectangular box', 'shorter', '!']
    strings.forEach((str, i) => {
      const position = [leftTopWidthHeight[0], leftTopWidthHeight[1] + spacing * i] as [number, number]
      ui.drawTextBoxCenteredOn({
        font,
        position,
        str,
        textColor,
        outlineColor,
        fillColor,
        margin,
        roundness,
        scale
      })
    })
  }, TEST_OPTIONS)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
