import { NIFTI1, NIFTI2 } from 'nifti-reader-js'
import { ImageType } from '@/nvimage/utils'

export interface ParsedVolumeData {
  hdr: NIFTI1 | NIFTI2 | null
  imgRaw: ArrayBufferLike | null
  imageType: ImageType
  error?: string
}

export * as Mgh from '@/nvimage/ImageReaders/mgh'
export * as Nii from '@/nvimage/ImageReaders/nii'
export * as Nrrd from '@/nvimage/ImageReaders/nrrd'
