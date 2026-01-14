import { test, expect } from '@playwright/test'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test.describe('NiiVue Clip Plane', () => {
    // Helper to setup NiiVue with clip plane in full 3D render mode
    const setupNiiVueWithClipPlane = async (page) => {
        return await page.evaluate(async ({ testOptions }) => {
            const nv = new Niivue({
                ...testOptions,
                show3Dcrosshair: true,
                backColor: [0.5, 0.5, 0.6, 1]
            })
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

            // Setup in full 3D render mode with clip plane
            nv.setClipPlane([-0.12, 180, 40])
            nv.setRenderAzimuthElevation(230, 15)
            nv.setSliceType(nv.sliceTypeRender) // Full 3D render mode

            window.nv = nv
            return true
        }, { testOptions: TEST_OPTIONS })
    }

    test('right-drag on 3D render adjusts clip plane without recursion error', async ({ page }) => {
        // Listen for page errors (would catch stack overflow)
        const errors: string[] = []
        page.on('pageerror', (error) => {
            errors.push(error.message)
        })

        await setupNiiVueWithClipPlane(page)
        await page.waitForTimeout(500)

        // Get canvas bounds
        const canvas = page.locator('#gl')
        const box = await canvas.boundingBox()
        if (!box) {
            throw new Error('Canvas not found')
        }

        // Start drag in center of canvas (full 3D render mode)
        const startX = box.x + box.width / 2
        const startY = box.y + box.height / 2

        // Perform right-drag to rotate clip plane
        await page.mouse.move(startX, startY)
        await page.mouse.down({ button: 'right' })

        // Drag in multiple steps to simulate real drag behavior
        for (let i = 1; i <= 10; i++) {
            await page.mouse.move(startX - i * 15, startY + i * 8)
            await page.waitForTimeout(30)
        }

        await page.mouse.up({ button: 'right' })
        await page.waitForTimeout(500)

        // Check that no errors occurred (the old bug caused "Maximum call stack size exceeded")
        const stackOverflowErrors = errors.filter((e) => e.includes('Maximum call stack size exceeded'))
        expect(stackOverflowErrors).toHaveLength(0)

        // Take screenshot to verify clip plane was adjusted
        await expect(page).toHaveScreenshot({ timeout: 30000 })
    })

    test('clip plane orientation changes after right-drag', async ({ page }) => {
        await setupNiiVueWithClipPlane(page)
        await page.waitForTimeout(500)

        // Get initial clip plane values
        const initialClipPlane = await page.evaluate(() => {
            return window.nv.scene.clipPlaneDepthAziElevs[0].slice()
        })

        const canvas = page.locator('#gl')
        const box = await canvas.boundingBox()
        if (!box) {
            throw new Error('Canvas not found')
        }

        // Right-drag on 3D render
        const startX = box.x + box.width / 2
        const startY = box.y + box.height / 2

        await page.mouse.move(startX, startY)
        await page.mouse.down({ button: 'right' })

        // Drag with significant movement
        for (let i = 1; i <= 10; i++) {
            await page.mouse.move(startX - i * 15, startY + i * 8)
            await page.waitForTimeout(30)
        }

        await page.mouse.up({ button: 'right' })
        await page.waitForTimeout(300)

        // Get clip plane values after drag
        const finalClipPlane = await page.evaluate(() => {
            return window.nv.scene.clipPlaneDepthAziElevs[0].slice()
        })

        // Verify that azimuth or elevation changed (depth should stay the same)
        expect(finalClipPlane[0]).toBeCloseTo(initialClipPlane[0], 5) // depth unchanged
        const azimuthChanged = Math.abs(finalClipPlane[1] - initialClipPlane[1]) > 0.1
        const elevationChanged = Math.abs(finalClipPlane[2] - initialClipPlane[2]) > 0.1
        expect(azimuthChanged || elevationChanged).toBe(true)

        await expect(page).toHaveScreenshot({ timeout: 30000 })
    })
})
