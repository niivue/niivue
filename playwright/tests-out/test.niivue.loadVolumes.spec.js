'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const fs = require('fs')
const test_1 = require('@playwright/test')
const index_1 = require('../../dist/index')
const helpers_1 = require('./helpers')
const test_types_1 = require('./test.types')
test_1.test.beforeEach(async ({ page }) => {
  await page.goto(helpers_1.httpServerAddress)
})
;(0, test_1.test)('niivue loadVolumes compressed nifti volume', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
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
    return nv.volumes.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(1)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadVolumes readRGB nifti', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/ct_perfusion.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'ct_perfusion.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(1)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadVolumes complex nifti volume', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/complex_image.nii.gz',
        name: 'complex_image.nii.gz',
        colormap: 'gray'
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(1)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadVolumes dicom manifest', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/dicom/niivue-manifest.txt',
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true,
        isManifest: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(1)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadVolumes limit 4D frames loaded', async ({ page }) => {
  const imgLength = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/pcasl.nii.gz',
        name: 'pcasl.nii.gz',
        limitFrames4D: 1
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes[0].img.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(imgLength).toBe(imgLength)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadVolumes from query string nifti volume', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    // load one volume object in an array
    const volumeList = [
      {
        url: './images/mni152.nii.gz?test=test',
        colormap: 'gray',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(1)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
;(0, test_1.test)('niivue loadVolumes nifti volume overlay', async ({ page }) => {
  const nvols = await page.evaluate(async (testOptions) => {
    // eslint-disable-next-line no-undef
    const nv = new index_1.Niivue(testOptions)
    await nv.attachTo('gl')
    const volumeList = [
      {
        url: './images/mni152.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'mni152.nii.gz',
        colormap: 'gray',
        opacity: 1,
        visible: true
      },
      {
        url: './images/hippo.nii.gz', // "./RAS.nii.gz", "./spm152.nii.gz",
        volume: { hdr: null, img: null },
        name: 'hippo.nii.gz',
        colormap: 'winter',
        opacity: 1,
        visible: true
      }
    ]
    await nv.loadVolumes(volumeList)
    return nv.volumes.length
  }, test_types_1.TEST_OPTIONS)
  ;(0, test_1.expect)(nvols).toBe(2)
  await page.waitForTimeout(1000)
  await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
})
const files = fs.readdirSync('./tests/images/nifti_space')
for (const file of files) {
  ;(0, test_1.test)(`niivue load niftispace ${file}`, async ({ page }) => {
    const options = { ...test_types_1.TEST_OPTIONS, filePath: file }
    await page.evaluate(async (options) => {
      const nv = new index_1.Niivue(options)
      await nv.attachTo('gl')
      const volumeList = [
        {
          url: `./images/nifti_space/${options.filePath}`,
          colormap: 'gray',
          opacity: 1,
          visible: true
        }
      ]
      await nv.loadVolumes(volumeList)
    }, options)
    await page.waitForTimeout(1000)
    await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
  })
}
for (const file of files) {
  ;(0, test_1.test)(`niivue load niftispace ${file} 3D render`, async ({ page }) => {
    const options = { ...test_types_1.TEST_OPTIONS, filePath: file }
    await page.evaluate(async (options) => {
      const nv = new index_1.Niivue(options)
      await nv.attachTo('gl')
      const volumeList = [
        {
          url: `./images/nifti_space/${options.filePath}`,
          colormap: 'gray',
          opacity: 1,
          visible: true
        }
      ]
      await nv.loadVolumes(volumeList)
      nv.setSliceType(nv.sliceTypeRender)
    }, options)
    await page.waitForTimeout(1000)
    await (0, test_1.expect)(page).toHaveScreenshot({ timeout: 30000 })
  })
}
// construct an object with file types as keys and an file names as values
const volumeFormats = [
  { fileType: 'nifti', fileName: 'mni152.nii.gz', meshOrVolume: 'volume' },
  { fileType: 'mif', fileName: 'RAS.mif', meshOrVolume: 'volume' },
  { fileType: 'nrrd', fileName: 'FLAIR.nrrd', meshOrVolume: 'volume' },
  { fileType: 'HEAD-BRIK', fileName: 'scaled+tlrc.HEAD', meshOrVolume: 'volume' },
  { fileType: 'mgz', fileName: 'wm.mgz', meshOrVolume: 'volume' },
  { fileType: 'dicom', fileName: 'enh.dcm', meshOrVolume: 'volume' }
]
for (const file of volumeFormats) {
  ;(0, test_1.test)(`niivue loadVolumes for file format ${file.fileName}`, async ({ page }) => {
    await page.evaluate(
      async (testOptions) => {
        const nv = new index_1.Niivue(testOptions)
        await nv.attachTo('gl')
        // load one volume object in an array
        const imageList = [
          {
            url: `./images/${testOptions.file.fileName}`,
            opacity: 1,
            visible: true
          }
        ]
        await nv.loadVolumes(imageList)
      },
      { ...test_types_1.TEST_OPTIONS, file }
    )
    await page.waitForTimeout(1000)
    await (0, test_1.expect)(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
  })
}
// # sourceMappingURL=test.niivue.loadVolumes.spec.js.map
