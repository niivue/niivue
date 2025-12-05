/**
 * ImageMetadata module
 *
 * Handles image metadata access and configuration management.
 * This module contains functions for:
 * - Getting NIfTI metadata (dimensions, datatypes, etc.)
 * - Getting and updating image options
 * - Managing image configuration settings
 */

import type { NVImage } from './index'
import type { ImageMetadata as ImageMetadataType, ImageFromUrlOptions } from '@/nvimage/utils'
import { NVImageFromUrlOptions } from '@/nvimage/utils'

/**
 * Get NIfTI specific metadata about the image
 *
 * @param nvImage - The NVImage instance
 * @returns Object containing image metadata (dimensions, datatypes, etc.)
 * @throws Error if header is undefined
 */
export function getImageMetadata(nvImage: NVImage): ImageMetadataType {
    if (!nvImage.hdr) {
        throw new Error('hdr undefined')
    }
    const id = nvImage.id
    const datatypeCode = nvImage.hdr.datatypeCode
    const dims = nvImage.hdr.dims
    const nx = dims[1]
    const ny = dims[2]
    const nz = dims[3]
    const nt = Math.max(1, dims[4])
    const pixDims = nvImage.hdr.pixDims
    const dx = pixDims[1]
    const dy = pixDims[2]
    const dz = pixDims[3]
    const dt = pixDims[4]
    const bpv = Math.floor(nvImage.hdr.numBitsPerVoxel / 8)

    return { id, datatypeCode, nx, ny, nz, nt, dx, dy, dz, dt, bpv }
}

/**
 * Get current image options
 *
 * @param nvImage - The NVImage instance
 * @returns Object containing current image options
 */
export function getImageOptions(nvImage: NVImage): ImageFromUrlOptions {
    const options = NVImageFromUrlOptions(
        '', // url,
        '', // urlImageData
        nvImage.name, // name
        nvImage._colormap, // colormap
        nvImage.opacity, // opacity
        nvImage.hdr!.cal_min, // cal_min
        nvImage.hdr!.cal_max, // cal_max
        nvImage.trustCalMinMax, // trustCalMinMax,
        nvImage.percentileFrac, // percentileFrac
        nvImage.ignoreZeroVoxels, // ignoreZeroVoxels
        nvImage.useQFormNotSForm, // useQFormNotSForm
        nvImage.colormapNegative, // colormapNegative
        nvImage.frame4D,
        nvImage.imageType, // imageType
        nvImage.colormapType
    )
    return options
}

/**
 * Update image options
 *
 * @param nvImage - The NVImage instance
 * @param options - New options to apply to the image
 */
export function applyOptionsUpdate(nvImage: NVImage, options: ImageFromUrlOptions): void {
    nvImage.hdr!.cal_min = options.cal_min!
    nvImage.hdr!.cal_max = options.cal_max!
    Object.assign(nvImage, options)
}
