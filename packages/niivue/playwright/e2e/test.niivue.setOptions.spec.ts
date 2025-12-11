import { test, expect } from '@playwright/test'
import { Niivue, NVConfigOptions } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

type OptsChange = {
    property: keyof NVConfigOptions
    newValue: NVConfigOptions[keyof NVConfigOptions]
    oldValue: NVConfigOptions[keyof NVConfigOptions]
}

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test('niivue options enforced', async ({ page }) => {
    const opts = await page.evaluate(async (testOptions) => {
        const nv = new Niivue({
            ...testOptions,
            fontMinPx: 16, // larger text
            crosshairColor: [0, 0, 1, 1] // blue
        })
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
        return nv.opts
    }, TEST_OPTIONS)

    expect(opts.fontMinPx).toEqual(16)
    expect(opts.crosshairColor).toEqual([0, 0, 1, 1])
    await expect(page).toHaveScreenshot({ timeout: 30000 })
})

test('opts watching - basic functionality', async ({ page }) => {
    const changes = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')

        const changes: OptsChange[] = []

        // Set up opts watcher
        nv.watchOptsChanges((propertyName, newValue, oldValue) => {
            changes.push({ property: propertyName, newValue, oldValue })
        })

        // Test various option changes
        nv.opts.crosshairWidth = 5
        nv.opts.textHeight = 0.1
        nv.opts.isColorbar = true
        nv.opts.backColor = [1, 0, 0, 1]

        return changes
    }, TEST_OPTIONS)

    expect(changes).toHaveLength(4)
    expect(changes[0]).toEqual({ property: 'crosshairWidth', newValue: 5, oldValue: 1 })
    expect(changes[1]).toEqual({ property: 'textHeight', newValue: 0.1, oldValue: -1 })
    expect(changes[2]).toEqual({ property: 'isColorbar', newValue: true, oldValue: false })
    expect(changes[3]).toEqual({ property: 'backColor', newValue: [1, 0, 0, 1], oldValue: [0, 0, 0, 1] })
})

test('opts watching - no duplicate events for same value', async ({ page }) => {
    const changes = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')

        const changes: OptsChange[] = []

        nv.watchOptsChanges((propertyName, newValue, oldValue) => {
            changes.push({ property: propertyName, newValue, oldValue })
        })

        // Set the same value multiple times - should only trigger once
        nv.opts.crosshairWidth = 3
        nv.opts.crosshairWidth = 3 // Same value
        nv.opts.crosshairWidth = 3 // Same value
        nv.opts.crosshairWidth = 5 // Different value

        return changes
    }, TEST_OPTIONS)

    expect(changes).toHaveLength(2)
    expect(changes[0]).toEqual({ property: 'crosshairWidth', newValue: 3, oldValue: 1 })
    expect(changes[1]).toEqual({ property: 'crosshairWidth', newValue: 5, oldValue: 3 })
})

test('opts watching - unwatchOptsChanges stops events', async ({ page }) => {
    const changes = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')

        const changes: OptsChange[] = []

        nv.watchOptsChanges((propertyName, newValue, oldValue) => {
            changes.push({ property: propertyName, newValue, oldValue })
        })

        // Make a change
        nv.opts.crosshairWidth = 3

        // Stop watching
        nv.unwatchOptsChanges()

        // Make more changes - these should not be detected
        nv.opts.textHeight = 0.2
        nv.opts.isColorbar = true

        return changes
    }, TEST_OPTIONS)

    expect(changes).toHaveLength(1)
    expect(changes[0]).toEqual({ property: 'crosshairWidth', newValue: 3, oldValue: 1 })
})

test('opts watching - comprehensive property test', async ({ page }) => {
    const changes = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')

        const changes: OptsChange[] = []

        nv.watchOptsChanges((propertyName, newValue, oldValue) => {
            changes.push({ property: propertyName, newValue, oldValue })
        })

        // Test many different types of options
        nv.opts.crosshairWidth = 2
        nv.opts.textHeight = 0.05
        nv.opts.colorbarHeight = 0.1
        nv.opts.colorbarWidth = 100
        nv.opts.showColorbarBorder = false
        nv.opts.crosshairGap = 5
        nv.opts.rulerWidth = 6
        nv.opts.show3Dcrosshair = true
        nv.opts.backColor = [0.5, 0.5, 0.5, 1]
        nv.opts.crosshairColor = [0, 1, 0, 1]
        nv.opts.fontColor = [1, 1, 1, 1]
        nv.opts.isNearestInterpolation = true
        nv.opts.isRuler = true
        nv.opts.isColorbar = true
        nv.opts.isOrientCube = true
        nv.opts.isRadiologicalConvention = true
        nv.opts.dragMode = 2
        nv.opts.penValue = 5
        nv.opts.penSize = 3
        nv.opts.isFilledPen = true
        nv.opts.drawingEnabled = true

        return changes
    }, TEST_OPTIONS)

    expect(changes.length).toBeGreaterThan(15)

    // Verify specific important changes
    const crosshairChange = changes.find((c) => c.property === 'crosshairWidth')
    expect(crosshairChange).toEqual({ property: 'crosshairWidth', newValue: 2, oldValue: 1 })

    const colorbarChange = changes.find((c) => c.property === 'isColorbar')
    expect(colorbarChange).toEqual({ property: 'isColorbar', newValue: true, oldValue: false })

    const backColorChange = changes.find((c) => c.property === 'backColor')
    expect(backColorChange).toEqual({ property: 'backColor', newValue: [0.5, 0.5, 0.5, 1], oldValue: [0, 0, 0, 1] })
})

test('opts watching - array and object changes', async ({ page }) => {
    const changes = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')

        const changes: OptsChange[] = []

        nv.watchOptsChanges((propertyName, newValue, oldValue) => {
            changes.push({ property: propertyName, newValue, oldValue })
        })

        // Test array changes
        nv.opts.backColor = [1, 0, 0, 1]
        nv.opts.crosshairColor = [0, 1, 0, 1]
        nv.opts.fontColor = [0, 0, 1, 1]
        // nv.opts.clipVolumeLow = [0.1, 0.1, 0.1]
        // nv.opts.clipVolumeHigh = [0.9, 0.9, 0.9]

        // Test string changes
        nv.opts.loadingText = 'Custom loading...'
        nv.opts.clipPlaneHotKey = 'KeyX'
        nv.opts.viewModeHotKey = 'KeyY'

        // Test number changes
        nv.opts.doubleTouchTimeout = 600
        nv.opts.longTouchTimeout = 1200
        nv.opts.forceDevicePixelRatio = 2

        return changes
    }, TEST_OPTIONS)

    expect(changes.length).toBeGreaterThanOrEqual(9)

    // Verify array changes work
    const backColorChange = changes.find((c) => c.property === 'backColor')
    expect(backColorChange?.newValue).toEqual([1, 0, 0, 1])

    // Verify string changes work
    const loadingTextChange = changes.find((c) => c.property === 'loadingText')
    expect(loadingTextChange?.newValue).toBe('Custom loading...')

    // Verify number changes work
    const timeoutChange = changes.find((c) => c.property === 'doubleTouchTimeout')
    expect(timeoutChange?.newValue).toBe(600)
})

test('opts watching - cleanup on destroy', async ({ page }) => {
    const result = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')

        let changesAfterCleanup = 0

        nv.watchOptsChanges(() => {
            changesAfterCleanup++
        })

        // Make a change before cleanup
        nv.opts.crosshairWidth = 3
        const changesBeforeCleanup = changesAfterCleanup

        // Cleanup the instance
        nv.cleanup()

        // Try to make changes after cleanup - these should not trigger callbacks
        try {
            nv.opts.textHeight = 0.1
            nv.opts.isColorbar = true
        } catch (e) {
            // Some operations might throw errors after cleanup, which is acceptable
        }

        return { changesBeforeCleanup, changesAfterCleanup }
    }, TEST_OPTIONS)

    expect(result.changesBeforeCleanup).toBe(1)
    expect(result.changesAfterCleanup).toBe(1) // Should not have increased after cleanup
})

test('opts watching - onOptsChange callback direct usage', async ({ page }) => {
    const changes = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')

        const changes: OptsChange[] = []

        // Test direct callback assignment (alternative to watchOptsChanges)
        nv.onOptsChange = (propertyName, newValue, oldValue) => {
            changes.push({ property: propertyName, newValue, oldValue })
        }

        // Make changes
        nv.opts.crosshairWidth = 4
        nv.opts.isColorbar = true

        return changes
    }, TEST_OPTIONS)

    expect(changes).toHaveLength(2)
    expect(changes[0]).toEqual({ property: 'crosshairWidth', newValue: 4, oldValue: 1 })
    expect(changes[1]).toEqual({ property: 'isColorbar', newValue: true, oldValue: false })
})
