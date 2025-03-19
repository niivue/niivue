import { Niivue } from '@niivue/niivue'
import { vox2nii } from './lib/loader.js'

export async function setupNiivue(element: HTMLCanvasElement) {
  const nv = new Niivue()
  await nv.attachToCanvas(element)
  // supply loader function, fromExt, and toExt (without dots)
  nv.useLoader(vox2nii, 'vox', 'nii')
  await nv.loadImages([
    {
      url: '/monu1.vox'
    }
  ])
}
