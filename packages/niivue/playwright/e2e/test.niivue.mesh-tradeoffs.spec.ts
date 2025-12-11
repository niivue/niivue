import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test('niivue mesh features demo: mesh tradeoffs', async ({ page }) => {
    await page.waitForSelector('#gl', { timeout: 5000 })

    const result = await page.evaluate(async (testOptions) => {
        // Define NVMeshLayerDefaults inside test body
        const NVMeshLayerDefaults = {
            colormap: 'gray',
            opacity: 0.0,
            nFrame4D: 0,
            frame4D: 0,
            outlineBorder: 0,
            cal_min: 0,
            cal_max: 0,
            cal_minNeg: 0,
            cal_maxNeg: 0,
            colormapType: 0, // COLORMAP_TYPE.MIN_TO_MAX
            values: [] as number[],
            useNegativeCmap: false,
            showLegend: true
        }

        const nv1 = new Niivue({
            ...testOptions,
            backColor: [1, 1, 1, 1]
        })

        nv1.opts.showLegend = false
        await nv1.attachTo('gl')

        // Demo-defined layers
        const rawLayers = [
            {
                url: './images/lh.curv',
                colormap: 'gray',
                cal_min: 0.3,
                cal_max: 0.5,
                opacity: 222 / 255
            },
            { url: './images/boggle.lh.annot', colormap: 'rocket', opacity: 1 },
            {
                url: './images/pval.LH.nii.gz',
                cal_min: 25,
                cal_max: 35.0,
                opacity: 1
            }
        ]

        // Merge with defaults to fill missing values
        const meshLayers = rawLayers.map((layer) => ({ ...NVMeshLayerDefaults, ...layer }))

        await nv1.loadMeshes([
            { url: './images/CIT168.mz3', rgba255: [0, 0, 255, 255] },
            { url: './images/lh.pial', rgba255: [222, 164, 164, 255], layers: meshLayers }
        ])

        // Apply property changes corresponding to control defaults

        // dpiCheck.onclick() — checked
        nv1.setHighResolutionCapable(true)

        // alphaSelect.onchange() — selected index 1 ("Translucent")
        const alphaIndex = 1
        const midx = nv1.meshes.length - 1
        nv1.meshes[midx].visible = alphaIndex > 0
        nv1.meshes[midx].opacity = alphaIndex === 1 ? 0.2 : alphaIndex === 2 ? 1 : 0

        // xRaySlider.onchange() — value 10
        nv1.opts.meshXRay = 10 * 0.01

        // outlineCheck.onclick() — checked (use mesh index 1)
        nv1.setMeshShader(1, 'Outline')

        // curvSlider.oninput() — 222
        nv1.setMeshLayerProperty(1, 0, 'opacity', 222 / 255)

        // atlasSlider.oninput() — 128
        nv1.setMeshLayerProperty(1, 1, 'opacity', 128 / 255)

        // statSlider.oninput() — 162
        nv1.setMeshLayerProperty(1, 2, 'opacity', 162 / 255)

        // threshSlider.oninput() — 25
        nv1.setMeshLayerProperty(1, 2, 'cal_min', 25)

        // atlasCheck.onclick() — checked
        nv1.setMeshLayerProperty(1, 1, 'outlineBorder', 1)

        // statCheck.onclick() — unchecked
        nv1.setMeshLayerProperty(1, 2, 'outlineBorder', 0)

        nv1.drawScene()
        nv1.gl.finish()

        return { meshes: nv1.meshes.length }
    }, TEST_OPTIONS)

    expect(result.meshes).toBeGreaterThanOrEqual(2)
    await page.waitForTimeout(1000)
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
})
