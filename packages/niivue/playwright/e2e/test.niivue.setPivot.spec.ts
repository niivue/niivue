import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test.describe('NiiVue setPivot3DPoint', () => {
    const setupNiivue = async (page) => {
        await page.evaluate(
            async ({ testOptions }) => {
                const nv = new Niivue(testOptions)
                await nv.attachTo('gl')
                await nv.loadVolumes([
                    {
                        url: './images/mni152.nii.gz',
                        colormap: 'gray',
                        opacity: 1
                    }
                ])
                nv.setSliceType(nv.sliceTypeRender)
                nv.setRenderAzimuthElevation(110, 10)
                ;(window as unknown as { nv: Niivue }).nv = nv
            },
            { testOptions: TEST_OPTIONS }
        )
    }

    test('setPivot3DPoint and pivot3D work correctly', async ({ page }) => {
        await setupNiivue(page)

        const result = await page.evaluate(() => {
            const nv = (window as unknown as { nv: Niivue }).nv

            const initialPivot = nv.pivot3D

            // Set a pivot point
            nv.setPivot3DPoint([10, 20, 30])
            const setPivot = nv.pivot3D

            // Clear the pivot point
            nv.setPivot3DPoint(null)
            const clearedPivot = nv.pivot3D

            return {
                initialPivot,
                setPivot,
                clearedPivot
            }
        })

        expect(result.setPivot[0]).toBeCloseTo(10, 6)
        expect(result.setPivot[1]).toBeCloseTo(20, 6)
        expect(result.setPivot[2]).toBeCloseTo(30, 6)
        expect(result.clearedPivot[0]).toBeCloseTo(result.initialPivot[0], 6)
        expect(result.clearedPivot[1]).toBeCloseTo(result.initialPivot[1], 6)
        expect(result.clearedPivot[2]).toBeCloseTo(result.initialPivot[2], 6)

    })

    test('setPivot3DPoint ignores invalid values', async ({ page }) => {
        await setupNiivue(page)

        const result = await page.evaluate(() => {
            const nv = (window as unknown as { nv: Niivue }).nv

            // Set a valid pivot
            nv.setPivot3DPoint([5, 10, 15])
            const validPivot = nv.pivot3D

            // Try to set invalid values
            nv.setPivot3DPoint([NaN, 0, 0])
            const afterNaN = nv.pivot3D

            nv.setPivot3DPoint([0, Infinity, 0])
            const afterInfinity = nv.pivot3D

            nv.setPivot3DPoint([0, 0, -Infinity])
            const afterNegInfinity = nv.pivot3D

            return {
                validPivot,
                afterNaN,
                afterInfinity,
                afterNegInfinity
            }
        })

        // All invalid attempts should leave the valid pivot unchanged
        expect(result.validPivot![0]).toBeCloseTo(5, 6)
        expect(result.validPivot![1]).toBeCloseTo(10, 6)
        expect(result.validPivot![2]).toBeCloseTo(15, 6)

        expect(result.afterNaN![0]).toBeCloseTo(5, 6)
        expect(result.afterNaN![1]).toBeCloseTo(10, 6)
        expect(result.afterNaN![2]).toBeCloseTo(15, 6)

        expect(result.afterInfinity![0]).toBeCloseTo(5, 6)
        expect(result.afterInfinity![1]).toBeCloseTo(10, 6)
        expect(result.afterInfinity![2]).toBeCloseTo(15, 6)

        expect(result.afterNegInfinity![0]).toBeCloseTo(5, 6)
        expect(result.afterNegInfinity![1]).toBeCloseTo(10, 6)
        expect(result.afterNegInfinity![2]).toBeCloseTo(15, 6)
    })

    test('setPivot3DPoint affects rendering pivot', async ({ page }) => {
        await setupNiivue(page)

        // Take screenshot with default pivot
        await page.evaluate(() => {
            const nv = (window as unknown as { nv: Niivue }).nv
            nv.setPivot3DPoint(null)
        })
        await page.waitForTimeout(100)
        const defaultPivot = await page.locator('#gl').screenshot()

        // Set a custom pivot point and rotate
        await page.evaluate(() => {
            const nv = (window as unknown as { nv: Niivue }).nv
            nv.setPivot3DPoint([30, -20, 10])
            nv.setRenderAzimuthElevation(130, 25)
        })
        await page.waitForTimeout(100)
        const customPivot = await page.locator('#gl').screenshot()

        // Reset pivot and use the same rotation
        await page.evaluate(() => {
            const nv = (window as unknown as { nv: Niivue }).nv
            nv.setPivot3DPoint(null)
            nv.setRenderAzimuthElevation(130, 25)
        })
        await page.waitForTimeout(100)
        const resetPivot = await page.locator('#gl').screenshot()

        // Custom pivot should produce different rendering than reset
        expect(customPivot).not.toEqual(resetPivot)
    })

    test('setPivot3DPoint returns a copy not a reference', async ({ page }) => {
        await setupNiivue(page)

        const result = await page.evaluate(() => {
            const nv = (window as unknown as { nv: Niivue }).nv

            const original: [number, number, number] = [7, 14, 21]
            nv.setPivot3DPoint(original)

            const retrieved = nv.pivot3D
            // Modify retrieved array
            if (retrieved) {
                retrieved[0] = 999
            }

            // Get again to check internal state wasn't modified
            const retrievedAgain = nv.pivot3D

            return {
                original: original[0],
                retrieved: retrieved ? retrieved[0] : null,
                retrievedAgain: retrievedAgain ? retrievedAgain[0] : null
            }
        })

        // Original should be unchanged
        expect(result.original).toBe(7)
        // First retrieval was modified
        expect(result.retrieved).toBe(999)
        // Second retrieval should still be original value
        expect(result.retrievedAgain).toBeCloseTo(7, 6)
    })
})
