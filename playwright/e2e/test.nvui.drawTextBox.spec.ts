import { test, expect } from '@playwright/test'
import { Niivue, NVUI, NVFont } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

test('nvui drawTextBoxCenteredOn roundness', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    const ui = new NVUI(nv.gl)
    const font = new NVFont(nv.gl)
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
    ui.drawTextBoxCenteredOn(
      font,
      [leftTopWidthHeight[0], leftTopWidthHeight[1]],
      str,
      textColor,
      outlineColor,
      fillColor,
      margin,
      0.0,
      scale
    )
    ui.drawText(
      font,
      [leftTopWidthHeight[0] + textWidth + spacing, leftTopWidthHeight[1] - textHeight],
      'roundness = 0.0',
      scale
    )
    ui.drawTextBoxCenteredOn(
      font,
      [leftTopWidthHeight[0], leftTopWidthHeight[1] + spacing],
      str,
      textColor,
      outlineColor,
      fillColor,
      margin,
      0.25,
      scale
    )
    ui.drawText(
      font,
      [leftTopWidthHeight[0] + textWidth + spacing, leftTopWidthHeight[1] + spacing - textHeight],
      'roundness = 0.25',
      scale
    )
    ui.drawTextBoxCenteredOn(
      font,
      [leftTopWidthHeight[0], leftTopWidthHeight[1] + spacing * 2],
      str,
      textColor,
      outlineColor,
      fillColor,
      margin,
      0.5,
      scale
    )
    ui.drawText(
      font,
      [leftTopWidthHeight[0] + textWidth + spacing, leftTopWidthHeight[1] + spacing * 2 - textHeight],
      'roundness = 0.5',
      scale
    )
    ui.drawTextBoxCenteredOn(
      font,
      [leftTopWidthHeight[0], leftTopWidthHeight[1] + spacing * 3],
      str,
      textColor,
      outlineColor,
      fillColor,
      margin,
      0.75,
      scale
    )
    ui.drawText(
      font,
      [leftTopWidthHeight[0] + textWidth + spacing, leftTopWidthHeight[1] + spacing * 3 - textHeight],
      'roundness = 0.75',
      scale
    )
    ui.drawTextBoxCenteredOn(
      font,
      [leftTopWidthHeight[0], leftTopWidthHeight[1] + spacing * 4],
      str,
      textColor,
      outlineColor,
      fillColor,
      margin,
      1.0,
      scale
    )
    ui.drawText(
      font,
      [leftTopWidthHeight[0] + textWidth + spacing, leftTopWidthHeight[1] + spacing * 4 - textHeight],
      'roundness = 1.0',
      scale
    )
  }, TEST_OPTIONS)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('nvui drawTextBoxCenteredOn aspect ratio sides stay rounded', async ({ page }) => {
  await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl')
    const ui = new NVUI(nv.gl)
    const font = new NVFont(nv.gl)
    await font.loadFont('./fonts/Roboto-Regular-Extra.png', './fonts/Roboto-Regular-Extra.json')

    let str = 'very long rectangular box'
    const textHeight = font.getTextHeight(str)
    const textWidth = font.getTextWidth(str)
    const leftTopWidthHeight = [nv.canvas.width / 2, nv.canvas.height / 4, textWidth, textHeight]
    const textColor = [0, 0, 1, 1]
    const fillColor = [0, 1, 0, 0.5]
    const outlineColor = [1, 1, 1, 1]
    const margin = 15
    const spacing = textHeight * 3
    const scale = 0.5
    const roundness = 0.5

    nv.gl.viewport(0, 0, nv.canvas.width, nv.canvas.height)
    nv.gl.clear(nv.gl.COLOR_BUFFER_BIT)
    ui.drawTextBoxCenteredOn(
      font,
      [leftTopWidthHeight[0], leftTopWidthHeight[1]],
      str,
      textColor,
      outlineColor,
      fillColor,
      margin,
      roundness,
      scale
    )

    str = 'shorter'
    ui.drawTextBoxCenteredOn(
      font,
      [leftTopWidthHeight[0], leftTopWidthHeight[1] + spacing],
      str,
      textColor,
      outlineColor,
      fillColor,
      margin,
      roundness,
      scale
    )

    str = '!'
    ui.drawTextBoxCenteredOn(
      font,
      [leftTopWidthHeight[0], leftTopWidthHeight[1] + spacing * 2],
      str,
      textColor,
      outlineColor,
      fillColor,
      margin,
      roundness,
      scale
    )
  }, TEST_OPTIONS)
  await expect(page).toHaveScreenshot({ timeout: 30000 })
})
