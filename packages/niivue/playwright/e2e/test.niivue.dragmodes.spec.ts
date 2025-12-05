import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test.describe('NiiVue Drag Modes', () => {
    // Helper to setup NiiVue with mouseEventConfig for comprehensive testing
    const setupNiiVueWithMouseConfig = async (page, leftButtonMode, rightButtonMode = 1) => {
        return await page.evaluate(
            async ({ testOptions, leftButtonMode, rightButtonMode }) => {
                const nv = new Niivue(testOptions)
                await nv.attachTo('gl')

                const volumeList = [
                    {
                        url: './images/mni152.nii.gz',
                        volume: { hdr: null, img: null },
                        name: 'mni152.nii.gz',
                        colormap: 'gray',
                        opacity: 1,
                        visible: true
                    }
                ]
                await nv.loadVolumes(volumeList)
                nv.setSliceType(0) // axial

                // Apply mouse configuration using setMouseEventConfig
                nv.setMouseEventConfig({
                    leftButton: {
                        primary: leftButtonMode
                    },
                    rightButton: rightButtonMode,
                    centerButton: 3
                })

                window.nv = nv
                return true
            },
            { testOptions: TEST_OPTIONS, leftButtonMode, rightButtonMode }
        )
    }

    // Test all drag modes with LEFT mouse button
    test.describe('Left Mouse Button Drag Modes', () => {
        enum DRAG_MODE {
            none = 0,
            contrast = 1,
            measurement = 2,
            pan = 3,
            slicer3D = 4,
            callbackOnly = 5,
            roiSelection = 6,
            angle = 7,
            crosshair = 8,
            windowing = 9
        }
        const x1 = 400
        const y1 = 250
        const x2 = 450
        const y2 = 300
        test('contrast mode with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.contrast)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('measurement mode with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.measurement)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('measurement mode two measurements with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.measurement)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })

            // second measurement
            await page.mouse.move(x1, y1 - 50)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2 - 50)
            await page.mouse.up({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('angle mode with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.angle)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })
            await page.mouse.move(x2 + 50, y2 - 25)
            await page.mouse.down({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('angle mode two angles with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.angle)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })
            await page.mouse.move(x2 + 50, y2 - 25)
            await page.mouse.down({ button: 'left' })
            await page.mouse.up({ button: 'left' })

            // second angle
            await page.mouse.move(x1 + 75, y1 + 50)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2 + 50, y2 + 50)
            await page.mouse.up({ button: 'left' })
            await page.mouse.move(x2 + 50 + 50, y2 - 25 - 50)
            await page.mouse.down({ button: 'left' })
            await page.mouse.up({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('pan mode with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.pan)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('slicer3D mode with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.slicer3D)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('callbackOnly mode with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.callbackOnly)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('roiSelection mode with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.roiSelection)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('crosshair mode with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.crosshair)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('windowing mode with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.windowing)
            await page.mouse.move(x1 - 100, y1 - 100)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2 + 100, y2 + 100)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('none mode with left mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'left' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'left' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })
    })

    // Test all drag modes with RIGHT mouse button
    test.describe('Right Mouse Button Drag Modes', () => {
        enum DRAG_MODE {
            none = 0,
            contrast = 1,
            measurement = 2,
            pan = 3,
            slicer3D = 4,
            callbackOnly = 5,
            roiSelection = 6,
            angle = 7,
            crosshair = 8,
            windowing = 9
        }
        const x1 = 400
        const y1 = 250
        const x2 = 450
        const y2 = 300

        test('contrast mode with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.contrast)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('measurement mode with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.measurement)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('measurement mode two measurements with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.measurement)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })

            // second measurement
            await page.mouse.move(x1, y1 - 50)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2 - 50)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('angle mode with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.angle)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })
            await page.mouse.move(x2 + 50, y2 - 25)
            await page.mouse.down({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('angle mode two angles with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.angle)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })
            await page.mouse.move(x2 + 50, y2 - 25)
            await page.mouse.down({ button: 'right' })
            await page.mouse.up({ button: 'right' })

            // second angle
            await page.mouse.move(x1 + 75, y1 + 50)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2 + 50, y2 + 50)
            await page.mouse.up({ button: 'right' })
            await page.mouse.move(x2 + 50 + 50, y2 - 25 - 50)
            await page.mouse.down({ button: 'right' })
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('pan mode with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.pan)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('slicer3D mode with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.slicer3D)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('callbackOnly mode with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.callbackOnly)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('roiSelection mode with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.roiSelection)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('crosshair mode with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.crosshair)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('windowing mode with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.windowing)
            await page.mouse.move(x1 - 100, y1 - 100)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2 + 100, y2 + 100)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })

        test('none mode with right mouse', async ({ page }) => {
            await setupNiiVueWithMouseConfig(page, DRAG_MODE.none, DRAG_MODE.none)
            await page.mouse.move(x1, y1)
            await page.mouse.down({ button: 'right' })
            await page.mouse.move(x2, y2)
            await page.mouse.up({ button: 'right' })

            await page.waitForTimeout(500)
            await expect(page).toHaveScreenshot({ timeout: 30000 })
        })
    })
})
