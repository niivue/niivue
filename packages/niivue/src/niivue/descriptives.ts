import { NiftiHeader } from '@/types'

/** Typed array types supported for voxel data */
export type TypedVoxelArray = Float32Array | Uint8Array | Int16Array | Float64Array | Uint16Array

/**
 * Options for creating a mask array
 */
export type MaskOptions = {
    /** Total number of voxels */
    nv: number
    /** Array of mask volume images to apply */
    maskImages?: TypedVoxelArray[]
    /** Drawing bitmap to use as mask */
    drawBitmap?: Uint8Array
    /** Whether to use drawing as mask */
    drawingIsMask?: boolean
    /** Whether to use ROI as mask */
    roiIsMask?: boolean
    /** Starting voxel coordinates for ROI */
    startVox?: number[]
    /** Ending voxel coordinates for ROI */
    endVox?: number[]
    /** NIfTI header for dimension info */
    hdr?: NiftiHeader
    /** Pixel dimensions in RAS space */
    pixDimsRAS?: number[]
}

/**
 * Result from creating an elliptical ROI mask
 */
export type EllipseMaskResult = {
    mask: Uint8Array
    area: number
}

/**
 * Result from computing descriptive statistics
 */
export type DescriptiveStats = {
    mean: number
    stdev: number
    nvox: number
    min: number
    max: number
    meanNot0: number
    stdevNot0: number
    nvoxNot0: number
    minNot0: number
    maxNot0: number
}

/**
 * Creates an elliptical mask based on start and end voxel coordinates.
 * The ellipse is drawn on a 2D plane where one dimension is constant.
 */
export function createEllipticalMask(nv: number, startVox: number[], endVox: number[], hdr: NiftiHeader, pixDimsRAS: number[]): EllipseMaskResult | null {
    const mask = new Uint8Array(nv)
    mask.fill(0)

    // identify the constant dimension (the plane where the ellipse is drawn)
    let constantDim = -1
    if (startVox[0] === endVox[0]) {
        constantDim = 0
    } else if (startVox[1] === endVox[1]) {
        constantDim = 1
    } else if (startVox[2] === endVox[2]) {
        constantDim = 2
    } else {
        console.error('Error: No constant dimension found.')
        return null
    }

    // get the varying dimensions
    const dims = [0, 1, 2]
    const varDims = dims.filter((dim) => dim !== constantDim)

    // compute the center of the ellipse in voxel coordinates
    const centerVox: number[] = []
    centerVox[constantDim] = startVox[constantDim]
    centerVox[varDims[0]] = (startVox[varDims[0]] + endVox[varDims[0]]) / 2
    centerVox[varDims[1]] = (startVox[varDims[1]] + endVox[varDims[1]]) / 2

    // compute the radii along each varying dimension
    const radiusX = Math.abs(endVox[varDims[0]] - startVox[varDims[0]]) / 2
    const radiusY = Math.abs(endVox[varDims[1]] - startVox[varDims[1]]) / 2

    // dimensions of the image
    const xdim = hdr.dims[1]
    const ydim = hdr.dims[2]

    // define the ranges for the varying dimensions
    const minVarDim0 = Math.max(0, Math.floor(centerVox[varDims[0]] - radiusX))
    const maxVarDim0 = Math.min(hdr.dims[varDims[0] + 1] - 1, Math.ceil(centerVox[varDims[0]] + radiusX))

    const minVarDim1 = Math.max(0, Math.floor(centerVox[varDims[1]] - radiusY))
    const maxVarDim1 = Math.min(hdr.dims[varDims[1] + 1] - 1, Math.ceil(centerVox[varDims[1]] + radiusY))

    // the constant dimension value
    const constDimVal = centerVox[constantDim]
    if (constDimVal < 0 || constDimVal >= hdr.dims[constantDim + 1]) {
        console.error('Error: Constant dimension value is out of bounds.')
        return null
    }

    // iterate over the varying dimensions and apply the elliptical mask
    for (let i = minVarDim0; i <= maxVarDim0; i++) {
        for (let j = minVarDim1; j <= maxVarDim1; j++) {
            // set the voxel coordinates
            const voxel: number[] = []
            voxel[constantDim] = constDimVal
            voxel[varDims[0]] = i
            voxel[varDims[1]] = j

            // calculate the normalized distances from the center
            const di = (voxel[varDims[0]] - centerVox[varDims[0]]) / radiusX
            const dj = (voxel[varDims[1]] - centerVox[varDims[1]]) / radiusY

            // calculate the squared distance in ellipse space
            const distSq = di * di + dj * dj

            // check if the voxel is within the ellipse
            if (distSq <= 1) {
                const x = voxel[0]
                const y = voxel[1]
                const z = voxel[2]
                const index = z * xdim * ydim + y * xdim + x
                mask[index] = 1
            }
        }
    }

    // calculate the area using the ellipse area formula
    const radiusX_mm = radiusX * pixDimsRAS[varDims[0] + 1]
    const radiusY_mm = radiusY * pixDimsRAS[varDims[1] + 1]
    const area = Math.PI * radiusX_mm * radiusY_mm

    return { mask, area }
}

/**
 * Creates a mask array based on the provided options.
 * Returns null for area if not an ROI mask.
 */
export function createMask(options: MaskOptions): { mask: Uint8Array; area: number | null } {
    const { nv, maskImages, drawBitmap, drawingIsMask, roiIsMask, startVox, endVox, hdr, pixDimsRAS } = options

    const mask = new Uint8Array(nv)
    mask.fill(1)
    const area: number | null = null

    if (maskImages && maskImages.length > 0) {
        for (const imgMask of maskImages) {
            if (imgMask.length !== nv) {
                continue
            }
            for (let i = 0; i < nv; i++) {
                if (imgMask[i] === 0 || isNaN(imgMask[i])) {
                    mask[i] = 0
                }
            }
        }
    } else if (drawingIsMask && drawBitmap) {
        for (let i = 0; i < nv; i++) {
            if (drawBitmap[i] === 0 || isNaN(drawBitmap[i])) {
                mask[i] = 0
            }
        }
    } else if (roiIsMask && startVox && endVox && hdr && pixDimsRAS) {
        const result = createEllipticalMask(nv, startVox, endVox, hdr, pixDimsRAS)
        if (!result) {
            return { mask, area: null }
        }
        return { mask: result.mask, area: result.area }
    }

    return { mask, area }
}

/**
 * Computes descriptive statistics for image data using Welford's online algorithm.
 * This method is numerically stable for computing mean and standard deviation.
 * @see https://www.johndcook.com/blog/2008/09/26/comparing-three-methods-of-computing-standard-deviation/
 */
export function computeDescriptiveStats(img: Float32Array, mask: Uint8Array): DescriptiveStats {
    const nv = img.length
    let k = 0
    let M = 0
    let S = 0
    let mx = Number.NEGATIVE_INFINITY
    let mn = Number.POSITIVE_INFINITY
    let kNot0 = 0
    let MNot0 = 0
    let SNot0 = 0

    for (let i = 0; i < nv; i++) {
        if (mask[i] < 1) {
            continue
        }
        const x = img[i]
        k++
        let Mnext = M + (x - M) / k
        S = S + (x - M) * (x - Mnext)
        M = Mnext
        if (x === 0) {
            continue
        }
        kNot0++
        Mnext = MNot0 + (x - MNot0) / kNot0
        SNot0 = SNot0 + (x - MNot0) * (x - Mnext)
        MNot0 = Mnext

        mn = Math.min(x, mn)
        mx = Math.max(x, mx)
    }

    const stdev = Math.sqrt(S / (k - 1))
    const stdevNot0 = Math.sqrt(SNot0 / (kNot0 - 1))
    const mnNot0 = mn
    const mxNot0 = mx

    if (k !== kNot0) {
        mn = Math.min(0, mn)
        mx = Math.max(0, mx)
    }

    return {
        mean: M,
        stdev,
        nvox: k,
        min: mn,
        max: mx,
        meanNot0: MNot0,
        stdevNot0,
        nvoxNot0: kNot0,
        minNot0: mnNot0,
        maxNot0: mxNot0
    }
}

/**
 * Scales raw image data by slope and intercept values.
 */
export function scaleImageData(imgRaw: TypedVoxelArray, slope: number, inter: number): Float32Array {
    const nv = imgRaw.length
    const img = new Float32Array(nv)
    for (let i = 0; i < nv; i++) {
        img[i] = imgRaw[i] * slope + inter
    }
    return img
}
