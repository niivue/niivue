import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { TEST_OPTIONS } from './test.types.js'

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

test('niivue saveDocument without embedded images', async ({ page }) => {
    const jsonData = await page.evaluate(async (testOptions) => {
        const nv = new Niivue(testOptions)
        await nv.attachTo('gl')
        await nv.loadVolumes([
            {
                url: './images/mni152.nii.gz',
                name: 'mni152.nii.gz',
                colormap: 'gray',
                opacity: 1
            }
        ])
        await nv.saveDocument('test.nvd', false, {
            embedImages: false,
            embedPreview: false
        })
        return nv.document.json(false)
    }, TEST_OPTIONS)

    expect(Array.isArray(jsonData.encodedImageBlobs)).toBe(true)
    expect(jsonData.encodedImageBlobs.length).toBe(0)
    expect(jsonData.imageOptionsArray?.[0]?.url?.endsWith('mni152.nii.gz')).toBe(true)
})
