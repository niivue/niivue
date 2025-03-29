import { NIFTI1, NIFTI2 } from 'nifti-reader-js'
import { ImageType } from '../utils.js'

export interface ParsedVolumeData {
  hdr: NIFTI1 | NIFTI2 | null
  imgRaw: ArrayBufferLike | null
  imageType: ImageType
  error?: string
}

export * as Mgh from './mgh.js'
export * as Nii from './nii.js'
export * as Nrrd from './nrrd.js'
