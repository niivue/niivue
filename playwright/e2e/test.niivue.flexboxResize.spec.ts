/**
 * Regression test for https://github.com/niivue/niivue/issues/862
 */

import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index'
import { httpServerAddressFlexbox } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 600 })
  await page.goto(httpServerAddressFlexbox)
})

test('canvas size is sized consistently in a flexbox parent', async ({ page }) => {
  const gl = await page.evaluate(async (testOptions) => {
    const nv = new Niivue(testOptions)
    await nv.attachTo('gl', false)
    return nv.gl
  })
  expect(gl).toBeDefined()

  await page.evaluate(async () => {
    const nv = new Niivue()
    await nv.attachTo('gl', false)
  })
  await expect(page.getByText('bottom of page')).toBeInViewport()
  const originalBox = await page.locator('#gl').boundingBox()

  if (originalBox === null) {
    throw new Error('boundingBox is null, meaning canvas is not visible')
  }

  // gradually decrease window size by 100, which triggers nv.resizeListener()
  for (let i = 0; i < 100; i++) {
    await page.setViewportSize({width: 600, height: 600 - i})
  }

  await expect(page.getByText('bottom of page')).toBeInViewport()

  // gradually increase window size until back to original size.
  for (let i = 0; i < 100; i++) {
    await page.setViewportSize({width: 600, height: 500 + i})
  }

  await expect.poll(async () => {
    const box = await page.locator('#gl').boundingBox()
    if (box === null) {
      throw new Error('boundingBox is null, meaning canvas is not visible')
    }
    return box.height
  }).toBe(originalBox.height)
})
