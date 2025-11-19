import { NIFTI1, NIFTI2 } from 'nifti-reader-js'
import { ImageType } from '@/nvimage/utils'

export interface ParsedVolumeData {
  hdr: NIFTI1 | NIFTI2 | null
  imgRaw: ArrayBufferLike | null
  imageType: ImageType
  error?: string
}

export * as BrainVoyager from '@/nvimage/ImageReaders/brainvoyager'
export * as DsiStudio from '@/nvimage/ImageReaders/dsistudio'
export * as Ecat from '@/nvimage/ImageReaders/ecat'
export * as Image from '@/nvimage/ImageReaders/image'
export * as Itk from '@/nvimage/ImageReaders/itk'
export * as Mgh from '@/nvimage/ImageReaders/mgh'
export * as Mrtrix from '@/nvimage/ImageReaders/mrtrix'
export * as Nii from '@/nvimage/ImageReaders/nii'
export * as Nrrd from '@/nvimage/ImageReaders/nrrd'
export * as Numpy from '@/nvimage/ImageReaders/numpy'
export * as Zarr from '@/nvimage/ImageReaders/zarr'
