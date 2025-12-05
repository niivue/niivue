/**
 * IntensityCalibration module
 *
 * Handles intensity calibration, windowing, and histogram analysis.
 * This module contains functions for:
 * - Calculating robust intensity range (2%..98% percentile)
 * - Converting between raw and calibrated intensity values
 */

import type { NVImage } from './index'
import { log } from '@/logger'
import { cmapper } from '@/colortables'
import { NiiIntentCode } from '@/nvimage/utils'

/**
 * Convert voxel intensity from stored value to scaled intensity.
 *
 * @param nvImage - The NVImage instance
 * @param raw - Raw intensity value
 * @returns Scaled intensity value
 */
export function intensityRaw2Scaled(nvImage: NVImage, raw: number): number {
    if (!nvImage.hdr) {
        throw new Error('hdr undefined')
    }

    if (nvImage.hdr.scl_slope === 0) {
        nvImage.hdr.scl_slope = 1.0
    }
    return raw * nvImage.hdr.scl_slope + nvImage.hdr.scl_inter
}

/**
 * Convert voxel intensity from scaled intensity to stored value.
 *
 * @param nvImage - The NVImage instance
 * @param scaled - Scaled intensity value
 * @returns Raw intensity value
 */
export function intensityScaled2Raw(nvImage: NVImage, scaled: number): number {
    if (!nvImage.hdr) {
        throw new Error('hdr undefined')
    }

    if (nvImage.hdr.scl_slope === 0) {
        nvImage.hdr.scl_slope = 1.0
    }
    return (scaled - nvImage.hdr.scl_inter) / nvImage.hdr.scl_slope
}

/**
 * Set contrast/brightness to robust range (2%..98%).
 * Calculate robust intensity range using histogram analysis.
 *
 * @param nvImage - The NVImage instance
 * @param vol - Volume for estimate (use -1 to use estimate on all loaded volumes; use INFINITY for current volume)
 * @param isBorder - If true (default) only center of volume used for estimate
 * @returns Volume brightness and returns array [pct2, pct98, mnScale, mxScale]
 */
export function calMinMax(nvImage: NVImage, vol: number = Number.POSITIVE_INFINITY, isBorder: boolean = true): number[] {
    if (!nvImage.hdr) {
        throw new Error('hdr undefined')
    }
    if (!nvImage.img) {
        throw new Error('img undefined')
    }
    // determine full range: min..max
    let mn = Number.POSITIVE_INFINITY // not this.img[0] in case ignoreZeroVoxels
    let mx = Number.NEGATIVE_INFINITY // this.img[0] in case ignoreZeroVoxels
    let nZero = 0
    let nNan = 0
    let nVox3D = nvImage.hdr.dims[1] * nvImage.hdr.dims[2] * nvImage.hdr.dims[3]
    // n.b. due to limitFrames4D nVol may not equal dims[4]
    const nVol = Math.floor(nvImage.img.length / nVox3D)
    if (vol >= nVol) {
        vol = nvImage.frame4D
    }
    vol = Math.min(vol, nVol - 1)
    const skipVox = vol * nVox3D
    let img = []
    if (!isBorder) {
        img = new (nvImage.img.constructor as new (length: number) => any)(nVox3D)
        for (let i = 0; i < nVox3D; i++) {
            img[i] = nvImage.img[i + skipVox]
        }
    } else {
        const borderFrac = 0.25
        const borders = [Math.floor(borderFrac * nvImage.hdr.dims[1]), Math.floor(borderFrac * nvImage.hdr.dims[2]), Math.floor(borderFrac * nvImage.hdr.dims[3])]
        const dims = [nvImage.hdr.dims[1] - 2 * borders[0], nvImage.hdr.dims[2] - 2 * borders[1], nvImage.hdr.dims[3] - 2 * borders[2]]
        const bordersHi = [dims[0] + borders[0], dims[1] + borders[1], dims[2] + borders[2]]
        nVox3D = dims[0] * dims[1] * dims[2]
        img = new (nvImage.img.constructor as new (length: number) => any)(nVox3D)
        let j = -1
        let i = 0
        for (let z = 0; z < nvImage.hdr.dims[3]; z++) {
            for (let y = 0; y < nvImage.hdr.dims[2]; y++) {
                for (let x = 0; x < nvImage.hdr.dims[1]; x++) {
                    j++
                    if (x < borders[0] || y < borders[1] || z < borders[2]) {
                        continue
                    }
                    if (x >= bordersHi[0] || y >= bordersHi[1] || z >= bordersHi[2]) {
                        continue
                    }
                    img[i] = nvImage.img[j + skipVox]
                    i++
                }
            }
        }
    }
    /* for (let i = 0; i < nVox3D; i++) {
    img[i] = nvImage.img[i + skipVox]
  } */
    // we can accelerate loops for integer data (which can not store NaN)
    // n.b. do to stack size, we can not use Math.max.apply()
    const isFastCalc = img.constructor !== Float64Array && img.constructor !== Float32Array && nvImage.ignoreZeroVoxels
    if (isFastCalc) {
        for (let i = 0; i < nVox3D; i++) {
            mn = Math.min(img[i], mn)
            mx = Math.max(img[i], mx)
            if (img[i] === 0) {
                nZero++
            }
        }
    } else {
        for (let i = 0; i < nVox3D; i++) {
            if (isNaN(img[i])) {
                nNan++
                continue
            }
            if (img[i] === 0) {
                nZero++
                if (nvImage.ignoreZeroVoxels) {
                    continue
                }
            }
            mn = Math.min(img[i], mn)
            mx = Math.max(img[i], mx)
        }
    }
    if (nvImage.ignoreZeroVoxels && mn === mx && nZero > 0) {
        mn = 0
    }
    const mnScale = intensityRaw2Scaled(nvImage, mn)
    const mxScale = intensityRaw2Scaled(nvImage, mx)
    const cmap = cmapper.colormapFromKey(nvImage._colormap)
    let cmMin = 0
    let cmMax = 0
    if (cmap.min !== undefined) {
        cmMin = cmap.min
    }
    if (cmap.max !== undefined) {
        cmMax = cmap.max
    }
    if (cmMin === cmMax && nvImage.trustCalMinMax && isFinite(nvImage.hdr.cal_min) && isFinite(nvImage.hdr.cal_max) && nvImage.hdr.cal_max > nvImage.hdr.cal_min) {
        nvImage.cal_min = nvImage.hdr.cal_min
        nvImage.cal_max = nvImage.hdr.cal_max
        nvImage.robust_min = nvImage.cal_min
        nvImage.robust_max = nvImage.cal_max
        nvImage.global_min = mnScale
        nvImage.global_max = mxScale
        return [nvImage.hdr.cal_min, nvImage.hdr.cal_max, nvImage.hdr.cal_min, nvImage.hdr.cal_max]
    }
    // if color map specifies non zero values for min and max then use them
    if (cmMin !== cmMax) {
        nvImage.cal_min = cmMin
        nvImage.cal_max = cmMax
        nvImage.robust_min = nvImage.cal_min
        nvImage.robust_max = nvImage.cal_max
        return [cmMin, cmMax, cmMin, cmMax]
    }
    const percentZero = (100 * nZero) / (nVox3D - 0)
    let isOverrideIgnoreZeroVoxels = false
    if (percentZero > 60 && !nvImage.ignoreZeroVoxels) {
        log.warn(`${Math.round(percentZero)}% of voxels are zero: ignoring zeros for cal_max`)
        isOverrideIgnoreZeroVoxels = true
        nvImage.ignoreZeroVoxels = true
    }
    if (!nvImage.ignoreZeroVoxels) {
        nZero = 0
    }
    nZero += nNan
    const n2pct = Math.round((nVox3D - 0 - nZero) * nvImage.percentileFrac)
    if (n2pct < 1 || mn === mx) {
        if (isBorder) {
            // central region has no variability: explore entire image
            return calMinMax(nvImage, vol, false)
        }
        log.debug('no variability in image intensity?')
        nvImage.cal_min = mnScale
        nvImage.cal_max = mxScale
        nvImage.robust_min = nvImage.cal_min
        nvImage.robust_max = nvImage.cal_max
        nvImage.global_min = mnScale
        nvImage.global_max = mxScale
        return [mnScale, mxScale, mnScale, mxScale]
    }
    const nBins = 1001
    const scl = (nBins - 1) / (mx - mn)
    const hist = new Array(nBins)
    for (let i = 0; i < nBins; i++) {
        hist[i] = 0
    }
    if (isFastCalc) {
        for (let i = 0; i < nVox3D; i++) {
            hist[Math.round((img[i] - mn) * scl)]++
        }
    } else if (nvImage.ignoreZeroVoxels) {
        for (let i = 0; i < nVox3D; i++) {
            if (img[i] === 0) {
                continue
            }
            if (isNaN(img[i])) {
                continue
            }
            hist[Math.round((img[i] - mn) * scl)]++
        }
    } else {
        for (let i = 0; i < nVox3D; i++) {
            if (isNaN(img[i])) {
                continue
            }
            hist[Math.round((img[i] - mn) * scl)]++
        }
    }
    let n = 0
    let lo = 0
    while (n < n2pct) {
        n += hist[lo]
        lo++
    }
    lo-- // remove final increment
    n = 0
    let hi = nBins
    while (n < n2pct) {
        hi--
        n += hist[hi]
    }
    if (lo === hi) {
        // MAJORITY are not black or white
        let ok = -1
        while (ok !== 0) {
            if (lo > 0) {
                lo--
                if (hist[lo] > 0) {
                    ok = 0
                }
            }
            if (ok !== 0 && hi < nBins - 1) {
                hi++
                if (hist[hi] > 0) {
                    ok = 0
                }
            }
            if (lo === 0 && hi === nBins - 1) {
                ok = 0
            }
        } // while not ok
    } // if lo === hi
    let pct2 = intensityRaw2Scaled(nvImage, lo / scl + mn)
    let pct98 = intensityRaw2Scaled(nvImage, hi / scl + mn)
    if (nvImage.hdr.cal_min < nvImage.hdr.cal_max && nvImage.hdr.cal_min >= mnScale && nvImage.hdr.cal_max <= mxScale) {
        pct2 = nvImage.hdr.cal_min
        pct98 = nvImage.hdr.cal_max
    }
    if (isOverrideIgnoreZeroVoxels) {
        pct2 = Math.min(pct2, 0)
    }
    nvImage.cal_min = pct2
    nvImage.cal_max = pct98
    if (nvImage.hdr.intent_code === NiiIntentCode.NIFTI_INTENT_LABEL) {
        nvImage.cal_min = mnScale
        nvImage.cal_max = mxScale
    }
    nvImage.robust_min = nvImage.cal_min
    nvImage.robust_max = nvImage.cal_max
    nvImage.global_min = mnScale
    nvImage.global_max = mxScale
    return [pct2, pct98, mnScale, mxScale]
}
