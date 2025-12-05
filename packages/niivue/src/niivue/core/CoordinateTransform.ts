import { vec3, vec4, mat4 } from 'gl-matrix'
import { NVImage } from '@/nvimage'
import { NVMesh } from '@/nvmesh'
import { NiivueObject3D } from '@/niivue-object3D'
import { SLICE_TYPE } from '@/nvdocument'
import { swizzleVec3 } from '@/utils'
import { NVUtilities } from '@/nvutilities'

/**
 * Represents a 2D screen slice with its geometric properties
 */
export interface ScreenSlice {
    leftTopWidthHeight: number[]
    axCorSag: SLICE_TYPE
    sliceFrac: number
    AxyzMxy: number[]
    leftTopMM: number[]
    fovMM: number[]
    screen2frac?: number[]
}

/**
 * Parameters for scene extent calculations
 */
export interface SceneExtentsParams {
    volumes: NVImage[]
    meshes: NVMesh[]
    volumeObject3D: NiivueObject3D | null
}

/**
 * Returns the scene's min, max, and range extents in mm or voxel space.
 * Includes both volume and mesh geometry.
 * @param params - Scene data (volumes, meshes, volumeObject3D)
 * @param isSliceMM - Whether to use slice MM coordinates (default: true)
 * @returns Array of [min, max, range] vectors
 */
export function sceneExtentsMinMax(params: SceneExtentsParams, isSliceMM = true): vec3[] {
    const { volumes, meshes, volumeObject3D } = params
    let mn = vec3.fromValues(0, 0, 0)
    let mx = vec3.fromValues(0, 0, 0)

    if (volumes.length > 0) {
        if (!volumeObject3D) {
            throw new Error('volumeObject3D undefined')
        }
        mn = vec3.fromValues(volumeObject3D.extentsMin[0], volumeObject3D.extentsMin[1], volumeObject3D.extentsMin[2])
        mx = vec3.fromValues(volumeObject3D.extentsMax[0], volumeObject3D.extentsMax[1], volumeObject3D.extentsMax[2])

        if (!isSliceMM) {
            mn = vec3.fromValues(volumes[0].extentsMinOrtho![0], volumes[0].extentsMinOrtho![1], volumes[0].extentsMinOrtho![2])
            mx = vec3.fromValues(volumes[0].extentsMaxOrtho![0], volumes[0].extentsMaxOrtho![1], volumes[0].extentsMaxOrtho![2])
        }
    }

    if (meshes.length > 0) {
        if (volumes.length < 1) {
            const minExtents = meshes[0].extentsMin as number[]
            const maxExtents = meshes[0].extentsMax as number[]
            mn = vec3.fromValues(minExtents[0], minExtents[1], minExtents[2])
            mx = vec3.fromValues(maxExtents[0], maxExtents[1], maxExtents[2])
        }
        for (let i = 0; i < meshes.length; i++) {
            const minExtents = meshes[i].extentsMin as number[]
            const maxExtents = meshes[i].extentsMax as number[]
            const vmn = vec3.fromValues(minExtents[0], minExtents[1], minExtents[2])
            vec3.min(mn, mn, vmn)
            const vmx = vec3.fromValues(maxExtents[0], maxExtents[1], maxExtents[2])
            vec3.max(mx, mx, vmx)
        }
    }

    const range = vec3.create()
    vec3.subtract(range, mx, mn)
    return [mn, mx, range]
}

/**
 * Convert millimeter coordinates to fractional volume coordinates.
 * @param mm - Millimeter coordinates (vec3 or vec4)
 * @param options - Conversion options
 * @returns Fractional coordinates [0..1, 0..1, 0..1]
 */
export function mm2frac(
    mm: vec3 | vec4,
    options: {
        volumes: NVImage[]
        meshes: NVMesh[]
        volumeObject3D: NiivueObject3D | null
        volIdx?: number
        isSliceMM?: boolean
    }
): vec3 {
    const { volumes, meshes, volumeObject3D, volIdx = 0, isSliceMM = false } = options

    if (volumes.length < 1) {
        const frac = vec3.fromValues(0.1, 0.5, 0.5)
        const [mn, _mx, range] = sceneExtentsMinMax({ volumes, meshes, volumeObject3D }, isSliceMM)
        frac[0] = (mm[0] - mn[0]) / range[0]
        frac[1] = (mm[1] - mn[1]) / range[1]
        frac[2] = (mm[2] - mn[2]) / range[2]

        // Handle non-finite values
        if (!isFinite(frac[0])) {
            frac[0] = 0.5
        }
        if (!isFinite(frac[1])) {
            frac[1] = 0.5
        }
        if (!isFinite(frac[2])) {
            frac[2] = 0.5
        }

        return frac
    }

    return volumes[volIdx].convertMM2Frac(mm, isSliceMM)
}

/**
 * Convert fractional volume coordinates to millimeter coordinates.
 * @param frac - Fractional coordinates [0..1, 0..1, 0..1]
 * @param options - Conversion options
 * @returns Millimeter coordinates as vec4
 */
export function frac2mm(
    frac: vec3,
    options: {
        volumes: NVImage[]
        meshes: NVMesh[]
        volumeObject3D: NiivueObject3D | null
        volIdx?: number
        isSliceMM?: boolean
    }
): vec4 {
    const { volumes, meshes, volumeObject3D, volIdx = 0, isSliceMM = false } = options
    const pos = vec4.fromValues(frac[0], frac[1], frac[2], 1)

    if (volumes.length > 0) {
        return volumes[volIdx].convertFrac2MM(frac, isSliceMM)
    } else {
        const [mn, mx] = sceneExtentsMinMax({ volumes, meshes, volumeObject3D }, isSliceMM)
        const lerp = (x: number, y: number, a: number): number => x * (1 - a) + y * a
        pos[0] = lerp(mn[0], mx[0], frac[0])
        pos[1] = lerp(mn[1], mx[1], frac[1])
        pos[2] = lerp(mn[2], mx[2], frac[2])
    }

    return pos
}

/**
 * Convert voxel coordinates to fractional volume coordinates.
 * @param vox - Voxel coordinates
 * @param volumes - Volume array
 * @param volIdx - Volume index (default: 0)
 * @returns Fractional coordinates [0..1, 0..1, 0..1]
 */
export function vox2frac(vox: vec3, volumes: NVImage[], volIdx = 0): vec3 {
    return volumes[volIdx].convertVox2Frac(vox)
}

/**
 * Convert fractional volume coordinates to voxel coordinates.
 * @param frac - Fractional coordinates [0..1, 0..1, 0..1]
 * @param volumes - Volume array
 * @param volIdx - Volume index (default: 0)
 * @returns Voxel coordinates
 */
export function frac2vox(frac: vec3, volumes: NVImage[], volIdx = 0): vec3 {
    if (volumes.length <= volIdx) {
        return vec3.fromValues(0, 0, 0)
    }
    return volumes[volIdx].convertFrac2Vox(frac)
}

/**
 * Convert voxel coordinates to millimeter coordinates using a transformation matrix.
 * This is a convenience wrapper around NVUtilities.vox2mm.
 * @param XYZ - Voxel coordinates
 * @param mtx - 4x4 transformation matrix
 * @returns Millimeter coordinates
 */
export function vox2mm(XYZ: number[], mtx: mat4): vec3 {
    return NVUtilities.vox2mm(XYZ, mtx)
}

/**
 * Apply coordinate swizzling based on slice orientation.
 * Transforms between NIfTI RAS space and screen display space.
 * @param v3 - Input vector in millimeters
 * @param axCorSag - Slice orientation type
 * @returns Swizzled vector
 */
export function swizzleVec3MM(v3: vec3, axCorSag: SLICE_TYPE): vec3 {
    // For coronal: 2D coronal screenXYZ = nifti [i,k,j]
    if (axCorSag === SLICE_TYPE.CORONAL) {
        return swizzleVec3(v3, [0, 2, 1])
    }
    // For sagittal: 2D sagittal screenXYZ = nifti [j,k,i]
    else if (axCorSag === SLICE_TYPE.SAGITTAL) {
        return swizzleVec3(v3, [1, 2, 0])
    }
    return v3
}

/**
 * Convert screen pixel coordinates to texture fractional coordinates for a given slice.
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param screenSlices - Array of screen slices
 * @param sliceIndex - Index of the slice to use
 * @param options - Conversion options
 * @returns Fractional texture coordinates, or [-1, -1, -1] if out of bounds
 */
export function screenXY2TextureFrac(
    x: number,
    y: number,
    screenSlices: ScreenSlice[],
    sliceIndex: number,
    options: {
        volumes: NVImage[]
        meshes: NVMesh[]
        volumeObject3D: NiivueObject3D | null
        isSliceMM?: boolean
        restrict0to1?: boolean
    }
): vec3 {
    const { volumes, meshes, volumeObject3D, isSliceMM = false, restrict0to1 = true } = options
    const texFrac = vec3.fromValues(-1, -1, -1) // texture 0..1 so -1 is out of bounds

    const slice = screenSlices[sliceIndex]
    const axCorSag = slice.axCorSag

    if (axCorSag > SLICE_TYPE.SAGITTAL) {
        return texFrac
    }

    const ltwh = slice.leftTopWidthHeight.slice()
    let isMirror = false
    if (ltwh[2] < 0) {
        isMirror = true
        ltwh[0] += ltwh[2]
        ltwh[2] = -ltwh[2]
    }

    let fracX = (x - ltwh[0]) / ltwh[2]
    if (isMirror) {
        fracX = 1.0 - fracX
    }
    const fracY = 1.0 - (y - ltwh[1]) / ltwh[3]

    if (fracX < 0.0 || fracX > 1.0 || fracY < 0.0 || fracY > 1.0) {
        return texFrac
    }

    if (slice.AxyzMxy.length < 4) {
        return texFrac
    }

    let xyzMM = vec3.fromValues(0, 0, 0)
    xyzMM[0] = slice.leftTopMM[0] + fracX * slice.fovMM[0]
    xyzMM[1] = slice.leftTopMM[1] + fracY * slice.fovMM[1]

    const v = slice.AxyzMxy
    xyzMM[2] = v[2] + v[4] * (xyzMM[1] - v[1]) - v[3] * (xyzMM[0] - v[0])

    if (axCorSag === SLICE_TYPE.CORONAL) {
        xyzMM = swizzleVec3(xyzMM, [0, 2, 1]) // screen RSA to NIfTI RAS
    }
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        xyzMM = swizzleVec3(xyzMM, [2, 0, 1]) // screen ASR to NIfTI RAS
    }

    const xyz = mm2frac(xyzMM, { volumes, meshes, volumeObject3D, isSliceMM })

    if (restrict0to1) {
        if (xyz[0] < 0 || xyz[0] > 1 || xyz[1] < 0 || xyz[1] > 1 || xyz[2] < 0 || xyz[2] > 1) {
            return texFrac
        }
    }

    return xyz
}

/**
 * Convert screen pixel coordinates to millimeter coordinates.
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param screenSlices - Array of screen slices
 * @param options - Conversion options
 * @returns Millimeter coordinates as vec4 (x, y, z, sliceIndex) or NaN if invalid
 */
export function screenXY2mm(
    x: number,
    y: number,
    screenSlices: ScreenSlice[],
    options: {
        volumes: NVImage[]
        meshes: NVMesh[]
        volumeObject3D: NiivueObject3D | null
        isSliceMM?: boolean
        forceSlice?: number
    }
): vec4 {
    const { volumes, meshes, volumeObject3D, isSliceMM = false, forceSlice = -1 } = options

    for (let s = 0; s < screenSlices.length; s++) {
        let i = s
        if (forceSlice >= 0) {
            i = forceSlice
        }

        const slice = screenSlices[i]
        const axCorSag = slice.axCorSag

        if (axCorSag > SLICE_TYPE.SAGITTAL) {
            continue
        }

        const ltwh = slice.leftTopWidthHeight
        if (x < ltwh[0] || y < ltwh[1] || x > ltwh[0] + ltwh[2] || y > ltwh[1] + ltwh[3]) {
            continue
        }

        const texFrac = screenXY2TextureFrac(x, y, screenSlices, i, {
            volumes,
            meshes,
            volumeObject3D,
            isSliceMM,
            restrict0to1: false
        })

        if (texFrac[0] < 0.0) {
            continue
        }

        const mm = frac2mm(texFrac, { volumes, meshes, volumeObject3D, isSliceMM })
        return vec4.fromValues(mm[0], mm[1], mm[2], i)
    }

    return vec4.fromValues(NaN, NaN, NaN, NaN)
}

/**
 * Convert canvas position to fractional texture coordinates.
 * @param canvasPos - Canvas position [x, y]
 * @param screenSlices - Array of screen slices
 * @param options - Conversion options
 * @returns Fractional coordinates or [-1, -1, -1] if out of bounds
 */
export function canvasPos2frac(
    canvasPos: number[],
    screenSlices: ScreenSlice[],
    options: {
        volumes: NVImage[]
        meshes: NVMesh[]
        volumeObject3D: NiivueObject3D | null
        isSliceMM?: boolean
    }
): vec3 {
    const { volumes, meshes, volumeObject3D, isSliceMM = false } = options

    for (let i = 0; i < screenSlices.length; i++) {
        const texFrac = screenXY2TextureFrac(canvasPos[0], canvasPos[1], screenSlices, i, {
            volumes,
            meshes,
            volumeObject3D,
            isSliceMM
        })
        if (texFrac[0] >= 0) {
            return texFrac
        }
    }

    return vec3.fromValues(-1, -1, -1) // texture 0..1 so -1 is out of bounds
}

/**
 * Convert fractional volume coordinates to canvas pixel coordinates.
 * Returns the first valid screen slice that contains the fractional coordinates.
 * @param frac - Fractional coordinates [0..1, 0..1, 0..1]
 * @param screenSlices - Array of screen slices
 * @param options - Conversion options
 * @returns Canvas position [x, y] or null if no valid slice found
 */
export function frac2canvasPos(
    frac: vec3,
    screenSlices: ScreenSlice[],
    options: {
        volumes: NVImage[]
        meshes: NVMesh[]
        volumeObject3D: NiivueObject3D | null
        isSliceMM?: boolean
        sliceType?: SLICE_TYPE
    }
): number[] | null {
    const { volumes, meshes, volumeObject3D, isSliceMM = false, sliceType } = options

    // Convert fractional coordinates to world coordinates
    const worldMM = frac2mm(frac, { volumes, meshes, volumeObject3D, isSliceMM })

    // Try to find a screen slice that can display this world coordinate
    let bestMatch = { index: -1, distance: Infinity }

    for (let i = 0; i < screenSlices.length; i++) {
        const slice = screenSlices[i]
        const axCorSag = slice.axCorSag

        // Only handle 2D slices (axial, coronal, sagittal)
        if (axCorSag > SLICE_TYPE.SAGITTAL) {
            continue
        }

        // Check if slice has valid transformation data
        if (slice.AxyzMxy.length < 4) {
            continue
        }

        // Start with world coordinates
        let xyzMM = vec3.fromValues(worldMM[0], worldMM[1], worldMM[2])

        // Apply inverse coordinate swizzling based on slice orientation
        if (axCorSag === SLICE_TYPE.CORONAL) {
            xyzMM = swizzleVec3(xyzMM, [0, 2, 1]) // NIfTI RAS to screen RSA
        }
        if (axCorSag === SLICE_TYPE.SAGITTAL) {
            xyzMM = swizzleVec3(xyzMM, [1, 2, 0]) // NIfTI RAS to screen ASR
        }

        // Check if this point lies on the slice plane
        const v = slice.AxyzMxy
        const expectedZ = v[2] + v[4] * (xyzMM[1] - v[1]) - v[3] * (xyzMM[0] - v[0])

        // Calculate distance from the slice plane
        const distance = Math.abs(xyzMM[2] - expectedZ)

        // Allow larger tolerance for multiplanar mode
        const tolerance = sliceType === SLICE_TYPE.MULTIPLANAR ? 1.0 : 0.1

        // Keep track of the best matching slice
        if (distance < bestMatch.distance) {
            bestMatch = { index: i, distance }
        }

        // If within tolerance, try to use this slice
        if (distance <= tolerance) {
            // Convert world coordinates to normalized slice coordinates
            const fracX = (xyzMM[0] - slice.leftTopMM[0]) / slice.fovMM[0]
            const fracY = (xyzMM[1] - slice.leftTopMM[1]) / slice.fovMM[1]

            // Check if coordinates are within valid slice bounds
            if (fracX >= 0.0 && fracX <= 1.0 && fracY >= 0.0 && fracY <= 1.0) {
                // Convert normalized slice coordinates to screen coordinates
                const ltwh = slice.leftTopWidthHeight.slice()
                let isMirror = false

                // Handle mirrored/flipped display
                if (ltwh[2] < 0) {
                    isMirror = true
                    ltwh[0] += ltwh[2]
                    ltwh[2] = -ltwh[2]
                }

                let screenFracX = fracX
                if (isMirror) {
                    screenFracX = 1.0 - fracX
                }
                const screenFracY = 1.0 - fracY

                // Convert to screen pixel coordinates
                const screenX = ltwh[0] + screenFracX * ltwh[2]
                const screenY = ltwh[1] + screenFracY * ltwh[3]

                return [screenX, screenY]
            }
        }
    }

    // If no slice was within tolerance but we have a best match, try to project onto it
    if (bestMatch.index >= 0 && bestMatch.distance < 2.0) {
        const i = bestMatch.index
        const slice = screenSlices[i]
        const axCorSag = slice.axCorSag

        // Start with world coordinates
        let xyzMM = vec3.fromValues(worldMM[0], worldMM[1], worldMM[2])

        // Apply inverse coordinate swizzling based on slice orientation
        if (axCorSag === SLICE_TYPE.CORONAL) {
            xyzMM = swizzleVec3(xyzMM, [0, 2, 1]) // NIfTI RAS to screen RSA
        }
        if (axCorSag === SLICE_TYPE.SAGITTAL) {
            xyzMM = swizzleVec3(xyzMM, [1, 2, 0]) // NIfTI RAS to screen ASR
        }

        // Project the point onto the slice plane
        const v = slice.AxyzMxy
        xyzMM[2] = v[2] + v[4] * (xyzMM[1] - v[1]) - v[3] * (xyzMM[0] - v[0])

        // Convert world coordinates to normalized slice coordinates
        const fracX = (xyzMM[0] - slice.leftTopMM[0]) / slice.fovMM[0]
        const fracY = (xyzMM[1] - slice.leftTopMM[1]) / slice.fovMM[1]

        // Check if coordinates are within valid slice bounds (with small margin)
        if (fracX >= -0.1 && fracX <= 1.1 && fracY >= -0.1 && fracY <= 1.1) {
            // Clamp to valid range
            const clampedFracX = Math.max(0, Math.min(1, fracX))
            const clampedFracY = Math.max(0, Math.min(1, fracY))

            // Convert normalized slice coordinates to screen coordinates
            const ltwh = slice.leftTopWidthHeight.slice()
            let isMirror = false

            // Handle mirrored/flipped display
            if (ltwh[2] < 0) {
                isMirror = true
                ltwh[0] += ltwh[2]
                ltwh[2] = -ltwh[2]
            }

            let screenFracX = clampedFracX
            if (isMirror) {
                screenFracX = 1.0 - clampedFracX
            }
            const screenFracY = 1.0 - clampedFracY

            // Convert to screen pixel coordinates
            const screenX = ltwh[0] + screenFracX * ltwh[2]
            const screenY = ltwh[1] + screenFracY * ltwh[3]

            return [screenX, screenY]
        }
    }

    return null // no valid screen slice found
}

/**
 * Convert fractional volume coordinates to canvas pixel coordinates with tile information.
 * Returns both canvas position and the tile index for validation.
 * @param frac - Fractional coordinates [0..1, 0..1, 0..1]
 * @param screenSlices - Array of screen slices
 * @param options - Conversion options
 * @returns Object with pos and tileIndex, or null if no valid slice found
 */
export function frac2canvasPosWithTile(
    frac: vec3,
    screenSlices: ScreenSlice[],
    options: {
        volumes: NVImage[]
        meshes: NVMesh[]
        volumeObject3D: NiivueObject3D | null
        isSliceMM?: boolean
        preferredSliceType?: SLICE_TYPE
    }
): { pos: number[]; tileIndex: number } | null {
    const { volumes, meshes, volumeObject3D, isSliceMM = false, preferredSliceType } = options

    // Convert fractional coordinates to world coordinates
    const worldMM = frac2mm(frac, { volumes, meshes, volumeObject3D, isSliceMM })

    // Try to find a screen slice that can display this world coordinate
    let bestMatch = { index: -1, distance: Infinity }

    for (let i = 0; i < screenSlices.length; i++) {
        const slice = screenSlices[i]
        const axCorSag = slice.axCorSag

        // Only handle 2D slices (axial, coronal, sagittal)
        if (axCorSag > SLICE_TYPE.SAGITTAL) {
            continue
        }

        // Check if slice has valid transformation data
        if (slice.AxyzMxy.length < 4) {
            continue
        }

        // Prioritize preferred slice type if specified
        if (preferredSliceType !== undefined && axCorSag !== preferredSliceType) {
            continue
        }

        // Start with world coordinates
        let xyzMM = vec3.fromValues(worldMM[0], worldMM[1], worldMM[2])

        // Apply inverse coordinate swizzling based on slice orientation
        if (axCorSag === SLICE_TYPE.CORONAL) {
            xyzMM = swizzleVec3(xyzMM, [0, 2, 1]) // NIfTI RAS to screen RSA
        }
        if (axCorSag === SLICE_TYPE.SAGITTAL) {
            xyzMM = swizzleVec3(xyzMM, [1, 2, 0]) // NIfTI RAS to screen ASR
        }

        // Check if this point lies on the slice plane
        const v = slice.AxyzMxy
        const expectedZ = v[2] + v[4] * (xyzMM[1] - v[1]) - v[3] * (xyzMM[0] - v[0])

        // Calculate distance from the slice plane
        const distance = Math.abs(xyzMM[2] - expectedZ)

        // Keep track of the best matching slice
        if (distance < bestMatch.distance) {
            bestMatch = { index: i, distance }
        }

        // If within tolerance, try to use this slice
        const tolerance = 0.1
        if (distance <= tolerance) {
            // Convert world coordinates to normalized slice coordinates
            const fracX = (xyzMM[0] - slice.leftTopMM[0]) / slice.fovMM[0]
            const fracY = (xyzMM[1] - slice.leftTopMM[1]) / slice.fovMM[1]

            // Check if coordinates are within valid slice bounds
            if (fracX >= 0.0 && fracX <= 1.0 && fracY >= 0.0 && fracY <= 1.0) {
                // Convert normalized slice coordinates to screen coordinates
                const ltwh = slice.leftTopWidthHeight.slice()
                let isMirror = false

                // Handle mirrored/flipped display
                if (ltwh[2] < 0) {
                    isMirror = true
                    ltwh[0] += ltwh[2]
                    ltwh[2] = -ltwh[2]
                }

                let screenFracX = fracX
                if (isMirror) {
                    screenFracX = 1.0 - fracX
                }
                const screenFracY = 1.0 - fracY

                // Convert to screen pixel coordinates
                const screenX = ltwh[0] + screenFracX * ltwh[2]
                const screenY = ltwh[1] + screenFracY * ltwh[3]

                return { pos: [screenX, screenY], tileIndex: i }
            }
        }
    }

    // If no slice was within tolerance but we have a best match, try to project onto it
    if (bestMatch.index >= 0 && bestMatch.distance < 2.0) {
        const i = bestMatch.index
        const slice = screenSlices[i]
        const axCorSag = slice.axCorSag

        // Start with world coordinates
        let xyzMM = vec3.fromValues(worldMM[0], worldMM[1], worldMM[2])

        // Apply inverse coordinate swizzling based on slice orientation
        if (axCorSag === SLICE_TYPE.CORONAL) {
            xyzMM = swizzleVec3(xyzMM, [0, 2, 1]) // NIfTI RAS to screen RSA
        }
        if (axCorSag === SLICE_TYPE.SAGITTAL) {
            xyzMM = swizzleVec3(xyzMM, [1, 2, 0]) // NIfTI RAS to screen ASR
        }

        // Project the point onto the slice plane
        const v = slice.AxyzMxy
        xyzMM[2] = v[2] + v[4] * (xyzMM[1] - v[1]) - v[3] * (xyzMM[0] - v[0])

        // Convert world coordinates to normalized slice coordinates
        const fracX = (xyzMM[0] - slice.leftTopMM[0]) / slice.fovMM[0]
        const fracY = (xyzMM[1] - slice.leftTopMM[1]) / slice.fovMM[1]

        // Check if coordinates are within valid slice bounds (with small margin)
        if (fracX >= -0.1 && fracX <= 1.1 && fracY >= -0.1 && fracY <= 1.1) {
            // Clamp to valid range
            const clampedFracX = Math.max(0, Math.min(1, fracX))
            const clampedFracY = Math.max(0, Math.min(1, fracY))

            // Convert normalized slice coordinates to screen coordinates
            const ltwh = slice.leftTopWidthHeight.slice()
            let isMirror = false

            // Handle mirrored/flipped display
            if (ltwh[2] < 0) {
                isMirror = true
                ltwh[0] += ltwh[2]
                ltwh[2] = -ltwh[2]
            }

            let screenFracX = clampedFracX
            if (isMirror) {
                screenFracX = 1.0 - clampedFracX
            }
            const screenFracY = 1.0 - clampedFracY

            // Convert to screen pixel coordinates
            const screenX = ltwh[0] + screenFracX * ltwh[2]
            const screenY = ltwh[1] + screenFracY * ltwh[3]

            return { pos: [screenX, screenY], tileIndex: i }
        }
    }

    return null // no valid screen slice found
}
