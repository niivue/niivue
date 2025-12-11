/**
 * TensorProcessing module
 *
 * Handles diffusion tensor and vector field processing.
 * This module contains functions for:
 * - Converting vector fields to RGBA representation
 * - Loading and processing V1 vector data with optional flips
 */

import type { NVImage } from './index'
import { log } from '@/logger'
import { NiiDataType } from '@/nvimage/utils'

/**
 * Convert vector field from Float32 to RGBA representation.
 * Note: We use RGBA rather than RGB and use least significant bits to store vector polarity.
 * This allows a single bitmap to store BOTH (unsigned) color magnitude and signed vector direction.
 *
 * @param nvImage - The NVImage instance
 * @param inImg - Input Float32Array containing vector field data
 * @returns Uint8Array with RGBA encoded vector data
 */
export function float32V1asRGBA(nvImage: NVImage, inImg: Float32Array): Uint8Array {
    if (inImg.length !== nvImage.nVox3D * 3) {
        log.warn('float32V1asRGBA() expects ' + nvImage.nVox3D * 3 + 'voxels, got ', +inImg.length)
    }
    const f32 = inImg.slice()
    // Note we will use RGBA rather than RGB and use least significant bits to store vector polarity
    // this allows a single bitmap to store BOTH (unsigned) color magnitude and signed vector direction
    nvImage.hdr.datatypeCode = NiiDataType.DT_RGBA32
    nvImage.nFrame4D = 1
    for (let i = 4; i < 7; i++) {
        nvImage.hdr.dims[i] = 1
    }
    nvImage.hdr.dims[0] = 3 // 3D
    const imgRaw = new Uint8Array(nvImage.nVox3D * 4) //* 3 for RGB
    let mx = 1.0
    for (let i = 0; i < nvImage.nVox3D * 3; i++) {
        // n.b. NaN values created by dwi2tensor and tensor2metric tensors.mif -vector v1.mif
        if (isNaN(f32[i])) {
            continue
        }
        mx = Math.max(mx, Math.abs(f32[i]))
    }
    const slope = 255 / mx
    const nVox3D2 = nvImage.nVox3D * 2
    let j = 0
    for (let i = 0; i < nvImage.nVox3D; i++) {
        // n.b. it is really necessary to overwrite imgRaw with a new datatype mid-method
        const x = f32[i]
        const y = f32[i + nvImage.nVox3D]
        const z = f32[i + nVox3D2]
        ;(imgRaw as Uint8Array)[j] = Math.abs(x * slope)
        ;(imgRaw as Uint8Array)[j + 1] = Math.abs(y * slope)
        ;(imgRaw as Uint8Array)[j + 2] = Math.abs(z * slope)
        const xNeg = Number(x > 0) * 1
        const yNeg = Number(y > 0) * 2
        const zNeg = Number(z > 0) * 4
        let alpha = 248 + xNeg + yNeg + zNeg
        if (Math.abs(x) + Math.abs(y) + Math.abs(z) < 0.1) {
            alpha = 0
        }
        ;(imgRaw as Uint8Array)[j + 3] = alpha
        j += 4
    }
    return imgRaw
}

/**
 * Load and process V1 vector data with optional flips.
 * Modifies the nvImage.img property with the processed RGBA data.
 *
 * @param nvImage - The NVImage instance
 * @param isFlipX - Flip X component (default: false)
 * @param isFlipY - Flip Y component (default: false)
 * @param isFlipZ - Flip Z component (default: false)
 * @returns true if successful, false if V1 data is not available
 */
export function loadImgV1(nvImage: NVImage, isFlipX: boolean = false, isFlipY: boolean = false, isFlipZ: boolean = false): boolean {
    let v1 = nvImage.v1
    if (!v1 && nvImage.nFrame4D === 3 && nvImage.img.constructor === Float32Array) {
        v1 = nvImage.img.slice()
    }
    if (!v1) {
        log.warn('Image does not have V1 data')
        return false
    }
    if (isFlipX) {
        for (let i = 0; i < nvImage.nVox3D; i++) {
            v1[i] = -v1[i]
        }
    }
    if (isFlipY) {
        for (let i = nvImage.nVox3D; i < 2 * nvImage.nVox3D; i++) {
            v1[i] = -v1[i]
        }
    }
    if (isFlipZ) {
        for (let i = 2 * nvImage.nVox3D; i < 3 * nvImage.nVox3D; i++) {
            v1[i] = -v1[i]
        }
    }
    nvImage.img = float32V1asRGBA(nvImage, v1)
    return true
}
