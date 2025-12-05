import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test('niivue mouse down updates onLocationChange', async ({ page }) => {
    const xy = await page.evaluate(async (testOptions) => {
        // eslint-disable-next-line no-undef
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        // load one volume object in an array
        const volumeList = [
            {
                url: './images/mni152.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
                volume: { hdr: null, img: null },
                name: 'mni152.nii.gz',
                colormap: 'gray',
                opacity: 1,
                visible: true
            }
        ]
        await nv.loadVolumes(volumeList)
        let xy: number[] = []

        nv.onLocationChange = (msg) => {
            if (msg && typeof msg === 'object' && 'xy' in msg && Array.isArray(msg.xy)) {
                xy = msg.xy
            }
        }

        // set defaults
        nv.mousePos = [0, 0]
        nv.mouseDown(50, 50)
        nv.mouseClick(50, 50)

        return xy
    }, TEST_OPTIONS)
    expect(xy[0]).toEqual(50)
    expect(xy[1]).toEqual(50)
})

test('niivue angle measurement tool draws angle', async ({ page }) => {
    await page.evaluate(async (testOptions) => {
        // eslint-disable-next-line no-undef
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        // load one volume object in an array
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

        // Set drag mode to angle
        nv.setDragMode('angle')
    }, TEST_OPTIONS)

    // Draw an angle: right-click and drag to draw first line
    await page.mouse.move(150, 150)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(200, 200)
    await page.mouse.up({ button: 'right' })

    // Move mouse to position second line and right-click to complete angle
    await page.mouse.move(250, 150)
    await page.mouse.click(250, 150, { button: 'right' })

    // Wait for rendering and take a snapshot for comparison
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue angle measurement tool draws small degree angle', async ({ page }) => {
    await page.evaluate(async (testOptions) => {
        // eslint-disable-next-line no-undef
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        // load one volume object in an array
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

        // Set drag mode to angle
        nv.setDragMode('angle')
    }, TEST_OPTIONS)

    await page.mouse.move(150, 200)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(250, 200)
    await page.mouse.up({ button: 'right' })

    await page.mouse.move(300, 170)
    await page.mouse.click(300, 170, { button: 'right' })

    // Wait for rendering and take a snapshot for comparison
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('niivue angle measurement tool draws large degree angle', async ({ page }) => {
    await page.evaluate(async (testOptions) => {
        // eslint-disable-next-line no-undef
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        // load one volume object in an array
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

        // Set drag mode to angle
        nv.setDragMode('angle')
    }, TEST_OPTIONS)

    await page.mouse.move(150, 200)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(250, 200)
    await page.mouse.up({ button: 'right' })

    await page.mouse.move(200, 120)
    await page.mouse.click(200, 120, { button: 'right' })

    // Wait for rendering and take a snapshot for comparison
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})
