/**
 * CoordinateTransform Module
 *
 * Handles all coordinate system transformations for NVImage:
 * - Voxel ↔ Millimeter conversions
 * - Voxel ↔ Fractional texture coordinate conversions
 * - Fractional ↔ Millimeter conversions
 *
 * This module provides pure functions for transforming between different
 * coordinate spaces used in medical imaging visualization.
 */

import { mat4, vec3, vec4 } from 'gl-matrix'
import type { NVImage } from './index'

/**
 * Convert voxel location to millimeter coordinates.
 *
 * Transforms from 0-indexed voxel space (row, column, slice) to world space
 * using the provided transformation matrix.
 *
 * @param _nvImage - The NVImage instance (unused, for API consistency)
 * @param XYZ - Voxel coordinates [x, y, z]
 * @param mtx - Transformation matrix (typically matRAS)
 * @returns Millimeter coordinates in world space
 */
export function vox2mm(_nvImage: NVImage, XYZ: number[], mtx: mat4): vec3 {
    const sform = mat4.clone(mtx)
    mat4.transpose(sform, sform)
    const pos = vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1)
    vec4.transformMat4(pos, pos, sform)
    const pos3 = vec3.fromValues(pos[0], pos[1], pos[2])
    return pos3
}

/**
 * Convert millimeter coordinates to voxel location.
 *
 * Transforms from world space (millimeters) to 0-indexed voxel space
 * using the image's matRAS transformation matrix.
 *
 * @param nvImage - The NVImage instance
 * @param mm - Millimeter coordinates [x, y, z]
 * @param frac - If true, return fractional voxel coordinates; if false, return rounded integers
 * @returns Voxel coordinates (Float32Array if rounded, vec3 if fractional)
 * @throws Error if matRAS is undefined
 */
export function mm2vox(nvImage: NVImage, mm: number[], frac = false): Float32Array | vec3 {
    if (!nvImage.matRAS) {
        throw new Error('matRAS undefined')
    }

    const sform = mat4.clone(nvImage.matRAS)
    const out = mat4.clone(sform)
    mat4.transpose(out, sform)
    mat4.invert(out, out)
    const pos = vec4.fromValues(mm[0], mm[1], mm[2], 1)
    vec4.transformMat4(pos, pos, out)
    const pos3 = vec3.fromValues(pos[0], pos[1], pos[2])
    if (frac) {
        return pos3
    }
    return new Float32Array([Math.round(pos3[0]), Math.round(pos3[1]), Math.round(pos3[2])])
}

/**
 * Convert voxel coordinates to fractional texture coordinates.
 *
 * Transforms from 0-indexed voxel space [0..dim[i]-1] to normalized
 * texture space [0..1]. Voxel centers are positioned at fractional
 * coordinates (e.g., for 3 voxels: centers at 0.25, 0.5, 0.75).
 *
 * @param nvImage - The NVImage instance
 * @param vox - Voxel coordinates [x, y, z]
 * @returns Fractional texture coordinates [0..1, 0..1, 0..1]
 */
export function convertVox2Frac(nvImage: NVImage, vox: vec3): vec3 {
    // convert from  0-index voxel space [0..dim[1]-1, 0..dim[2]-1, 0..dim[3]-1] to normalized texture space XYZ= [0..1, 0..1 ,0..1]
    // consider dimension with 3 voxels, the voxel centers are at 0.25, 0.5, 0.75 corresponding to 0,1,2
    const frac = vec3.fromValues((vox[0] + 0.5) / nvImage.dimsRAS![1], (vox[1] + 0.5) / nvImage.dimsRAS![2], (vox[2] + 0.5) / nvImage.dimsRAS![3])
    return frac
}

/**
 * Convert fractional texture coordinates to voxel coordinates.
 *
 * Transforms from normalized texture space [0..1] to 0-indexed voxel
 * space, rounding to the nearest voxel center.
 *
 * @param nvImage - The NVImage instance
 * @param frac - Fractional texture coordinates [0..1, 0..1, 0..1]
 * @returns Voxel coordinates (rounded to nearest integer)
 */
export function convertFrac2Vox(nvImage: NVImage, frac: vec3): vec3 {
    const vox = vec3.fromValues(
        Math.round(frac[0] * nvImage.dims![1] - 0.5), // dims === RAS
        Math.round(frac[1] * nvImage.dims![2] - 0.5), // dims === RAS
        Math.round(frac[2] * nvImage.dims![3] - 0.5) // dims === RAS
    )
    return vox
}

/**
 * Convert fractional texture coordinates to millimeter coordinates.
 *
 * Transforms from normalized texture space [0..1] to world space (millimeters)
 * using either the oblique-corrected or original transformation matrix.
 *
 * @param nvImage - The NVImage instance
 * @param frac - Fractional texture coordinates [0..1, 0..1, 0..1]
 * @param isForceSliceMM - If true, use frac2mm; if false, use frac2mmOrtho
 * @returns Millimeter coordinates in world space (vec4 with homogeneous coordinate)
 */
export function convertFrac2MM(nvImage: NVImage, frac: vec3, isForceSliceMM = false): vec4 {
    const pos = vec4.fromValues(frac[0], frac[1], frac[2], 1)
    if (isForceSliceMM) {
        vec4.transformMat4(pos, pos, nvImage.frac2mm!)
    } else {
        vec4.transformMat4(pos, pos, nvImage.frac2mmOrtho!)
    }
    return pos
}

/**
 * Convert millimeter coordinates to fractional texture coordinates.
 *
 * Transforms from world space (millimeters) to normalized texture space [0..1].
 * Uses either the oblique-corrected or original inverse transformation.
 *
 * @param nvImage - The NVImage instance
 * @param mm - Millimeter coordinates [x, y, z] or [x, y, z, w]
 * @param isForceSliceMM - If true, use matRAS inverse; if false, use frac2mmOrtho inverse
 * @returns Fractional texture coordinates [0..1, 0..1, 0..1]
 */
export function convertMM2Frac(nvImage: NVImage, mm: vec3 | vec4, isForceSliceMM = false): vec3 {
    // given mm, return volume fraction
    // convert from object space in millimeters to normalized texture space XYZ= [0..1, 0..1 ,0..1]
    const mm4 = vec4.fromValues(mm[0], mm[1], mm[2], 1)
    const d = nvImage.dimsRAS
    const frac = vec3.fromValues(0, 0, 0)
    if (typeof d === 'undefined') {
        return frac
    }
    if (!isForceSliceMM) {
        const xform = mat4.clone(nvImage.frac2mmOrtho!)
        mat4.invert(xform, xform)
        vec4.transformMat4(mm4, mm4, xform)
        frac[0] = mm4[0]
        frac[1] = mm4[1]
        frac[2] = mm4[2]
        return frac
    }
    if (d[1] < 1 || d[2] < 1 || d[3] < 1) {
        return frac
    }
    const sform = mat4.clone(nvImage.matRAS!)
    mat4.invert(sform, sform)
    mat4.transpose(sform, sform)
    vec4.transformMat4(mm4, mm4, sform)
    frac[0] = (mm4[0] + 0.5) / d[1]
    frac[1] = (mm4[1] + 0.5) / d[2]
    frac[2] = (mm4[2] + 0.5) / d[3]
    return frac
}

/**
 * Check if two arrays are equal.
 *
 * Compares two arrays element-by-element for equality.
 * Note: This is a shallow comparison and won't work correctly for complex objects.
 *
 * @param a - First array
 * @param b - Second array
 * @returns true if arrays have the same length and all elements are equal
 */
export function arrayEquals(a: unknown[], b: unknown[]): boolean {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index])
}
