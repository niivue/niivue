/**
 * Regression test for https://github.com/niivue/niivue/issues/862
 */

import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddressFlexbox } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 600 })
  await page.goto(httpServerAddressFlexbox)

  const gl = await page.evaluate(async () => {
    const nv = new Niivue()
    await nv.attachTo('gl')
    return nv.gl
  })
  expect(gl).toBeDefined()
  await expect(page.getByText('bottom of page')).toBeInViewport()
})

// skipped because I don't have a solution for this atm.
test.skip('canvas height decreases when viewport height decreases', async ({ page }) => {
  const originalBox = await page.locator('#gl').boundingBox()

  if (originalBox === null) {
    throw new Error('boundingBox is null, meaning canvas is not visible')
  }

  // gradually decrease window size by 100, which triggers nv.resizeListener()
  for (let i = 1; i <= 100; i++) {
    await page.setViewportSize({ width: 600, height: 600 - i })
  }

  await expect(page.getByText('bottom of page')).toBeInViewport()

  // gradually increase window size until back to original size.
  for (let i = 1; i <= 100; i++) {
    await page.setViewportSize({ width: 600, height: 500 + i })
  }

  await expect
    .poll(async () => {
      const box = await page.locator('#gl').boundingBox()
      if (box === null) {
        throw new Error('boundingBox is null, meaning canvas is not visible')
      }
      return box.height
    })
    .toBe(originalBox.height)
})

test('canvas height increases by *close to the* same amount as viewport when viewport is enlarged', async ({
  page
}) => {
  await expect(page.getByText('bottom of page')).toBeInViewport()
  const originalBox = await page.locator('#gl').boundingBox()

  if (originalBox === null) {
    throw new Error('boundingBox is null, meaning canvas is not visible')
  }

  // gradually increase window size by 100, which triggers nv.resizeListener()
  for (let i = 1; i <= 100; i++) {
    await page.setViewportSize({ width: 600, height: 600 + i })
  }

  await expect(page.getByText('bottom of page')).toBeInViewport()

  await expect
    .poll(async () => {
      const box = await page.locator('#gl').boundingBox()
      if (box === null) {
        throw new Error('boundingBox is null, meaning canvas is not visible')
      }
      const expected = originalBox.height + 100
      const actual = box.height
      const percentChange = Math.abs(expected - actual) / expected
      return percentChange
    })
    .toBeLessThan(0.05)
})
