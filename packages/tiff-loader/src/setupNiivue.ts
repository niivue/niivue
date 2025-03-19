import { Niivue } from '@niivue/niivue'
import { tiff2nii } from './lib/loader.js'

export async function setupNiivue(element: HTMLCanvasElement) {
  const nv = new Niivue()
  await nv.attachToCanvas(element)
  // supply loader function, fromExt, and toExt (without dots)
  nv.useLoader(tiff2nii, 'tif', 'nii')
  nv.useLoader(tiff2nii, 'tiff', 'nii')
  nv.useLoader(tiff2nii, 'lsm', 'nii')
  await nv.loadImages([
    {
      url: '/shapes_deflate.tif'
    }
  ])
}
