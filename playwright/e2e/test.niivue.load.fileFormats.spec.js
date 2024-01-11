import { test, expect } from '@playwright/test'
import { httpServerAddress, testOptions } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto(httpServerAddress)
})

// construct an object with file types as keys and an file names as values
const files = [
  { fileType: 'nifti', fileName: 'mni152.nii.gz', meshOrVolume: 'volume' },
  { fileType: 'mz3', fileName: 'BrainMesh_ICBM152.lh.mz3', meshOrVolume: 'mesh' },
  { fileType: 'gifti', fileName: 'Conte69.L.inflated.32k_fs_LR.surf.gii', meshOrVolume: 'mesh' },
  { fileType: 'mif', fileName: 'RAS.mif', meshOrVolume: 'volume' },
  { fileType: 'nrrd', fileName: 'FLAIR.nrrd', meshOrVolume: 'volume' },
  { fileType: 'HEAD-BRIK', fileName: 'scaled+tlrc.HEAD', meshOrVolume: 'volume' },
  { fileType: 'mgz', fileName: 'wm.mgz', meshOrVolume: 'volume' },
  { fileType: 'obj', fileName: 'simplify_brain.obj', meshOrVolume: 'mesh' },
  { fileType: 'vtk', fileName: 'tract.FAT_R.vtk', meshOrVolume: 'mesh' },
  { fileType: 'trk', fileName: 'tract.IFOF_R.trk', meshOrVolume: 'mesh' },
  { fileType: 'tck', fileName: 'tract.SLF1_R.tck', meshOrVolume: 'mesh' },
  { fileType: 'dicom', fileName: 'enh.dcm', meshOrVolume: 'volume' }
]

for (const file of files) {
  test(`niivue loadVolumes loadMeshes for file format ${file.fileName}`, async ({ page }) => {
    // eslint-disable-next-line prettier/prettier
    await page.evaluate(async (file, testOptions) => {
      // eslint-disable-next-line no-undef
      const nv = new Niivue(testOptions)
      await nv.attachTo('gl', false)
      // load one volume object in an array
      const imageList = [
        {
          url: `./images/${file.fileName}`,
          opacity: 1,
          visible: true
        }
      ]
      if (file.meshOrVolume === 'mesh') {
        await nv.loadMeshes(imageList)
      } else {
        await nv.loadVolumes(imageList)
      }
    }, file)
    await expect(page.locator('#gl')).toHaveScreenshot({ timeout: 30000 })
  })
}
