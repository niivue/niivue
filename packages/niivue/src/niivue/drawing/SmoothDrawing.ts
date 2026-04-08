/**
 * Smooth drawing utilities for 3D Gaussian blur of drawing bitmaps.
 * Creates a smoothed distance-field-like representation of the drawing
 * that enables smooth isosurface rendering in 3D.
 */

/**
 * Compute a 3D Gaussian blur of a drawing bitmap using separable passes.
 * The result is a Float32Array where non-zero regions of the bitmap are
 * blurred to create smooth boundaries suitable for isosurface extraction.
 *
 * @param bitmap - The raw drawing bitmap (Uint8Array, values 0 = empty, >0 = drawn)
 * @param dims - Volume dimensions [_, nx, ny, nz]
 * @param radius - Gaussian blur radius in voxels (sigma = radius / 2)
 * @returns Float32Array of same dimensions with smoothed values in [0, 1]
 */
export function blurDrawingBitmap(bitmap: Uint8Array, dims: number[], radius: number): Float32Array {
    const nx = dims[1]
    const ny = dims[2]
    const nz = dims[3]
    const nVoxels = nx * ny * nz
    if (bitmap.length < nVoxels) {
        return new Float32Array(nVoxels)
    }

    // Convert bitmap to float (0 or 1)
    const input = new Float32Array(nVoxels)
    for (let i = 0; i < nVoxels; i++) {
        input[i] = bitmap[i] > 0 ? 1.0 : 0.0
    }

    const sigma = Math.max(radius / 2.0, 0.5)
    const kernelRadius = Math.ceil(radius)
    const kernelSize = kernelRadius * 2 + 1

    // Build 1D Gaussian kernel
    const kernel = new Float32Array(kernelSize)
    let sum = 0.0
    for (let i = 0; i < kernelSize; i++) {
        const x = i - kernelRadius
        kernel[i] = Math.exp(-(x * x) / (2.0 * sigma * sigma))
        sum += kernel[i]
    }
    // Normalize
    for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= sum
    }

    // Separable 3D Gaussian: blur X, then Y, then Z
    const temp1 = new Float32Array(nVoxels)
    const temp2 = new Float32Array(nVoxels)

    // Pass 1: Blur along X
    for (let z = 0; z < nz; z++) {
        for (let y = 0; y < ny; y++) {
            const rowBase = z * ny * nx + y * nx
            for (let x = 0; x < nx; x++) {
                let val = 0.0
                for (let k = -kernelRadius; k <= kernelRadius; k++) {
                    const sx = Math.min(Math.max(x + k, 0), nx - 1)
                    val += input[rowBase + sx] * kernel[k + kernelRadius]
                }
                temp1[rowBase + x] = val
            }
        }
    }

    // Pass 2: Blur along Y
    for (let z = 0; z < nz; z++) {
        for (let x = 0; x < nx; x++) {
            for (let y = 0; y < ny; y++) {
                let val = 0.0
                for (let k = -kernelRadius; k <= kernelRadius; k++) {
                    const sy = Math.min(Math.max(y + k, 0), ny - 1)
                    val += temp1[z * ny * nx + sy * nx + x] * kernel[k + kernelRadius]
                }
                temp2[z * ny * nx + y * nx + x] = val
            }
        }
    }

    // Pass 3: Blur along Z
    const output = new Float32Array(nVoxels)
    for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
            for (let z = 0; z < nz; z++) {
                let val = 0.0
                for (let k = -kernelRadius; k <= kernelRadius; k++) {
                    const sz = Math.min(Math.max(z + k, 0), nz - 1)
                    val += temp2[sz * ny * nx + y * nx + x] * kernel[k + kernelRadius]
                }
                output[z * ny * nx + y * nx + x] = val
            }
        }
    }

    return output
}
