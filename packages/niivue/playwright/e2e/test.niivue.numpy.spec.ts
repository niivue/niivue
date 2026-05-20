import { test, expect } from '@playwright/test'
import { Niivue } from '../../dist/index.js'
import { httpServerAddress } from './helpers.js'
import { NiivueTestOptions, NiivueTestOptionsFilePath, TEST_OPTIONS } from './test.types.js'

const numpyFiles = [
    '01_float32_blobs_64x64x48.npy',
    '02_int16_signed_gradient_80x64x48.npy',
    '03_uint8_labels_64x64x48.npy',
    '04_float32_timeseries_40x40x24x6.npy',
    '05_float32_2d_slice_128x96.npy',
    '06_uint16_fortran_order_32x48x40.npy',
    '07_float32_big_endian_48x48x32.npy',
    '08_bool_mask_64x64x40.npy',
    '09_uint8_rgb_lastdim3_48x48x24x3.npy',
    '10_multi_array_archive.npz'
]

test.beforeEach(async ({ page }) => {
    await page.goto(httpServerAddress)
})

for (const filePath of numpyFiles) {
    test(`niivue load NumPy array ${filePath}`, async ({ page }) => {
        const nvols = await page.evaluate(async (options) => {
            const nv = new Niivue(options as NiivueTestOptions)
            await nv.attachTo('gl')
            await nv.loadVolumes([
                {
                    url: `./images/numpy/${options.filePath}`,
                    colormap: 'gray',
                    opacity: 1
                }
            ])
            return nv.volumes.length
        }, { ...TEST_OPTIONS, filePath } as NiivueTestOptionsFilePath)

        expect(nvols).toBe(1)
        await page.waitForTimeout(1000)
        await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
    })
}
