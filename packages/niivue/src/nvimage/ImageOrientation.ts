/**
 * ImageOrientation module
 *
 * Handles image orientation, RAS calculation, and reorientation.
 * This module contains functions for:
 * - Calculating RAS (Right-Anterior-Superior) orientation from NIfTI headers
 * - Computing oblique transformation matrices
 * - Detecting misalignment between voxel and world space
 * - Reorienting image data and headers to RAS
 */

import { mat3, mat4, vec3, vec4 } from 'gl-matrix'
import { NIFTI1, NIFTI2, readHeaderAsync } from 'nifti-reader-js'
import type { NVImage, TypedVoxelArray } from './index'
import { log } from '@/logger'
import { hdrToArrayBuffer } from '@/nvimage/utils'
import * as CoordinateTransform from '@/nvimage/CoordinateTransform'

/**
 * Detect difference between voxel grid and world space.
 * https://github.com/afni/afni/blob/25e77d564f2c67ff480fa99a7b8e48ec2d9a89fc/src/thd_coords.c#L717
 *
 * @param mtx44 - Transformation matrix
 * @returns Oblique angle in degrees
 */
export function computeObliqueAngle(mtx44: mat4): number {
    const mtx = mat4.clone(mtx44)
    mat4.transpose(mtx, mtx44)
    const dxtmp = Math.sqrt(mtx[0] * mtx[0] + mtx[1] * mtx[1] + mtx[2] * mtx[2])
    const xmax = Math.max(Math.max(Math.abs(mtx[0]), Math.abs(mtx[1])), Math.abs(mtx[2])) / dxtmp
    const dytmp = Math.sqrt(mtx[4] * mtx[4] + mtx[5] * mtx[5] + mtx[6] * mtx[6])
    const ymax = Math.max(Math.max(Math.abs(mtx[4]), Math.abs(mtx[5])), Math.abs(mtx[6])) / dytmp
    const dztmp = Math.sqrt(mtx[8] * mtx[8] + mtx[9] * mtx[9] + mtx[10] * mtx[10])
    const zmax = Math.max(Math.max(Math.abs(mtx[8]), Math.abs(mtx[9])), Math.abs(mtx[10])) / dztmp
    const fig_merit = Math.min(Math.min(xmax, ymax), zmax)
    let oblique_angle = Math.abs((Math.acos(fig_merit) * 180.0) / 3.141592653)
    if (oblique_angle > 0.01) {
        log.warn('Warning voxels not aligned with world space: ' + oblique_angle + ' degrees from plumb.\n')
    } else {
        oblique_angle = 0.0
    }
    return oblique_angle
}

/**
 * Calculate oblique transformation matrices.
 * Detects difference between voxel grid and world space.
 *
 * @param nvImage - The NVImage instance
 */
export function calculateOblique(nvImage: NVImage): void {
    if (!nvImage.matRAS) {
        throw new Error('matRAS not defined')
    }
    if (nvImage.pixDimsRAS === undefined) {
        throw new Error('pixDimsRAS not defined')
    }
    if (!nvImage.dimsRAS) {
        throw new Error('dimsRAS not defined')
    }

    nvImage.oblique_angle = computeObliqueAngle(nvImage.matRAS)
    const LPI = CoordinateTransform.vox2mm(nvImage, [0.0, 0.0, 0.0], nvImage.matRAS)
    const X1mm = CoordinateTransform.vox2mm(nvImage, [1.0 / nvImage.pixDimsRAS[1], 0.0, 0.0], nvImage.matRAS)
    const Y1mm = CoordinateTransform.vox2mm(nvImage, [0.0, 1.0 / nvImage.pixDimsRAS[2], 0.0], nvImage.matRAS)
    const Z1mm = CoordinateTransform.vox2mm(nvImage, [0.0, 0.0, 1.0 / nvImage.pixDimsRAS[3]], nvImage.matRAS)
    vec3.subtract(X1mm, X1mm, LPI)
    vec3.subtract(Y1mm, Y1mm, LPI)
    vec3.subtract(Z1mm, Z1mm, LPI)
    const oblique = mat4.fromValues(X1mm[0], X1mm[1], X1mm[2], 0, Y1mm[0], Y1mm[1], Y1mm[2], 0, Z1mm[0], Z1mm[1], Z1mm[2], 0, 0, 0, 0, 1)
    nvImage.obliqueRAS = mat4.clone(oblique)
    const XY = Math.abs(90 - vec3.angle(X1mm, Y1mm) * (180 / Math.PI))
    const XZ = Math.abs(90 - vec3.angle(X1mm, Z1mm) * (180 / Math.PI))
    const YZ = Math.abs(90 - vec3.angle(Y1mm, Z1mm) * (180 / Math.PI))
    nvImage.maxShearDeg = Math.max(Math.max(XY, XZ), YZ)
    if (nvImage.maxShearDeg > 0.1) {
        log.warn('Warning: voxels are rhomboidal, maximum shear is %f degrees.', nvImage.maxShearDeg)
    }
    // compute a matrix to transform vectors from factional space to mm:
    const dim = vec4.fromValues(nvImage.dimsRAS[1], nvImage.dimsRAS[2], nvImage.dimsRAS[3], 1)
    const sform = mat4.clone(nvImage.matRAS)
    mat4.transpose(sform, sform)
    const shim = vec4.fromValues(-0.5, -0.5, -0.5, 0) // bitmap with 5 voxels scaled 0..1, voxel centers are 0.1,0.3,0.5,0.7,0.9
    mat4.translate(sform, sform, vec3.fromValues(shim[0], shim[1], shim[2]))
    // mat.mat4.scale(sform, sform, dim);
    sform[0] *= dim[0]
    sform[1] *= dim[0]
    sform[2] *= dim[0]
    sform[4] *= dim[1]
    sform[5] *= dim[1]
    sform[6] *= dim[1]
    sform[8] *= dim[2]
    sform[9] *= dim[2]
    sform[10] *= dim[2]
    nvImage.frac2mm = mat4.clone(sform)
    const pixdimX = nvImage.pixDimsRAS[1] // vec3.length(X1mm);
    const pixdimY = nvImage.pixDimsRAS[2] // vec3.length(Y1mm);
    const pixdimZ = nvImage.pixDimsRAS[3] // vec3.length(Z1mm);
    // orthographic view
    const oform = mat4.clone(sform)
    oform[0] = pixdimX * dim[0]
    oform[1] = 0
    oform[2] = 0
    oform[4] = 0
    oform[5] = pixdimY * dim[1]
    oform[6] = 0
    oform[8] = 0
    oform[9] = 0
    oform[10] = pixdimZ * dim[2]
    const originVoxel = CoordinateTransform.mm2vox(nvImage, [0, 0, 0], true)
    // set matrix translation for distance from origin
    oform[12] = (-originVoxel[0] - 0.5) * pixdimX
    oform[13] = (-originVoxel[1] - 0.5) * pixdimY
    oform[14] = (-originVoxel[2] - 0.5) * pixdimZ
    nvImage.frac2mmOrtho = mat4.clone(oform)
    nvImage.extentsMinOrtho = [oform[12], oform[13], oform[14]]
    nvImage.extentsMaxOrtho = [oform[0] + oform[12], oform[5] + oform[13], oform[10] + oform[14]]
    nvImage.mm2ortho = mat4.create()
    mat4.invert(nvImage.mm2ortho, oblique)
}

/**
 * Transform to orient NIfTI image to Left->Right, Posterior->Anterior, Inferior->Superior (48 possible permutations).
 * Port of Matlab reorient() https://github.com/xiangruili/dicm2nii/blob/master/nii_viewer.m
 *
 * @param nvImage - The NVImage instance
 */
export function calculateRAS(nvImage: NVImage): void {
    if (!nvImage.hdr) {
        throw new Error('hdr not set')
    }
    // not elegant, as JavaScript arrays are always 1D
    const a = nvImage.hdr.affine
    const header = nvImage.hdr
    const absR = mat3.fromValues(
        Math.abs(a[0][0]),
        Math.abs(a[0][1]),
        Math.abs(a[0][2]),
        Math.abs(a[1][0]),
        Math.abs(a[1][1]),
        Math.abs(a[1][2]),
        Math.abs(a[2][0]),
        Math.abs(a[2][1]),
        Math.abs(a[2][2])
    )
    // 1st column = x
    const ixyz = [1, 1, 1]
    if (absR[3] > absR[0]) {
        ixyz[0] = 2 // (absR[1][0] > absR[0][0]) ixyz[0] = 2;
    }
    if (absR[6] > absR[0] && absR[6] > absR[3]) {
        ixyz[0] = 3 // ((absR[2][0] > absR[0][0]) && (absR[2][0]> absR[1][0])) ixyz[0] = 3;
    } // 2nd column = y
    ixyz[1] = 1
    if (ixyz[0] === 1) {
        if (absR[4] > absR[7]) {
            // (absR[1][1] > absR[2][1])
            ixyz[1] = 2
        } else {
            ixyz[1] = 3
        }
    } else if (ixyz[0] === 2) {
        if (absR[1] > absR[7]) {
            // (absR[0][1] > absR[2][1])
            ixyz[1] = 1
        } else {
            ixyz[1] = 3
        }
    } else {
        if (absR[1] > absR[4]) {
            // (absR[0][1] > absR[1][1])
            ixyz[1] = 1
        } else {
            ixyz[1] = 2
        }
    }
    // 3rd column = z: constrained as x+y+z = 1+2+3 = 6
    ixyz[2] = 6 - ixyz[1] - ixyz[0]
    let perm = [1, 2, 3]
    perm[ixyz[0] - 1] = 1
    perm[ixyz[1] - 1] = 2
    perm[ixyz[2] - 1] = 3
    let rotM = mat4.fromValues(a[0][0], a[0][1], a[0][2], a[0][3], a[1][0], a[1][1], a[1][2], a[1][3], a[2][0], a[2][1], a[2][2], a[2][3], 0, 0, 0, 1)
    // n.b. 0.5 in these values to account for voxel centers, e.g. a 3-pixel wide bitmap in unit space has voxel centers at 0.25, 0.5 and 0.75
    nvImage.mm000 = CoordinateTransform.vox2mm(nvImage, [-0.5, -0.5, -0.5], rotM)
    nvImage.mm100 = CoordinateTransform.vox2mm(nvImage, [header.dims[1] - 0.5, -0.5, -0.5], rotM)
    nvImage.mm010 = CoordinateTransform.vox2mm(nvImage, [-0.5, header.dims[2] - 0.5, -0.5], rotM)
    nvImage.mm001 = CoordinateTransform.vox2mm(nvImage, [-0.5, -0.5, header.dims[3] - 0.5], rotM)
    const R = mat4.create()
    mat4.copy(R, rotM)
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            R[i * 4 + j] = rotM[i * 4 + perm[j] - 1] // rotM[i+(4*(perm[j]-1))];//rotM[i],[perm[j]-1];
        }
    }
    const flip = [0, 0, 0]
    if (R[0] < 0) {
        flip[0] = 1
    } // R[0][0]
    if (R[5] < 0) {
        flip[1] = 1
    } // R[1][1]
    if (R[10] < 0) {
        flip[2] = 1
    } // R[2][2]
    nvImage.dimsRAS = [header.dims[0], header.dims[perm[0]], header.dims[perm[1]], header.dims[perm[2]]]
    nvImage.pixDimsRAS = [header.pixDims[0], header.pixDims[perm[0]], header.pixDims[perm[1]], header.pixDims[perm[2]]]
    nvImage.permRAS = perm.slice()
    for (let i = 0; i < 3; i++) {
        if (flip[i] === 1) {
            nvImage.permRAS[i] = -nvImage.permRAS[i]
        }
    }
    if (CoordinateTransform.arrayEquals(perm, [1, 2, 3]) && CoordinateTransform.arrayEquals(flip, [0, 0, 0])) {
        nvImage.toRAS = mat4.create() // aka fromValues(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
        nvImage.matRAS = mat4.clone(rotM)
        calculateOblique(nvImage)
        nvImage.img2RASstep = [1, nvImage.dimsRAS[1], nvImage.dimsRAS[1] * nvImage.dimsRAS[2]]
        nvImage.img2RASstart = [0, 0, 0]
        return // no rotation required!
    }
    mat4.identity(rotM)
    rotM[0 + 0 * 4] = 1 - flip[0] * 2
    rotM[1 + 1 * 4] = 1 - flip[1] * 2
    rotM[2 + 2 * 4] = 1 - flip[2] * 2
    rotM[3 + 0 * 4] = (header.dims[perm[0]] - 1) * flip[0]
    rotM[3 + 1 * 4] = (header.dims[perm[1]] - 1) * flip[1]
    rotM[3 + 2 * 4] = (header.dims[perm[2]] - 1) * flip[2]
    const residualR = mat4.create()
    mat4.invert(residualR, rotM)
    mat4.multiply(residualR, residualR, R)
    nvImage.matRAS = mat4.clone(residualR)
    rotM = mat4.fromValues(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)
    rotM[perm[0] - 1 + 0 * 4] = -flip[0] * 2 + 1
    rotM[perm[1] - 1 + 1 * 4] = -flip[1] * 2 + 1
    rotM[perm[2] - 1 + 2 * 4] = -flip[2] * 2 + 1
    rotM[3 + 0 * 4] = flip[0]
    rotM[3 + 1 * 4] = flip[1]
    rotM[3 + 2 * 4] = flip[2]
    nvImage.toRAS = mat4.clone(rotM) // webGL unit textures
    // voxel based column-major,
    rotM[3] = 0
    rotM[7] = 0
    rotM[11] = 0
    rotM[12] = 0
    if (nvImage.permRAS[0] === -1 || nvImage.permRAS[1] === -1 || nvImage.permRAS[2] === -1) {
        rotM[12] = header.dims[1] - 1
    }
    rotM[13] = 0
    if (nvImage.permRAS[0] === -2 || nvImage.permRAS[1] === -2 || nvImage.permRAS[2] === -2) {
        rotM[13] = header.dims[2] - 1
    }
    rotM[14] = 0
    if (nvImage.permRAS[0] === -3 || nvImage.permRAS[1] === -3 || nvImage.permRAS[2] === -3) {
        rotM[14] = header.dims[3] - 1
    }
    nvImage.toRASvox = mat4.clone(rotM)
    log.debug(nvImage.hdr.dims)
    log.debug(nvImage.dimsRAS)

    // compute img2RASstep[] and img2RASstart[] for rapid native<->RAS conversion
    // TODO: replace all other outStep/outStart calculations with img2RASstep/img2RASstart
    const hdr = nvImage.hdr
    perm = nvImage.permRAS
    const aperm = [Math.abs(perm[0]), Math.abs(perm[1]), Math.abs(perm[2])]
    const outdim = [hdr.dims[aperm[0]], hdr.dims[aperm[1]], hdr.dims[aperm[2]]]
    const inStep = [1, hdr.dims[1], hdr.dims[1] * hdr.dims[2]] // increment i,j,k
    const outStep = [inStep[aperm[0] - 1], inStep[aperm[1] - 1], inStep[aperm[2] - 1]]
    const outStart = [0, 0, 0]
    for (let p = 0; p < 3; p++) {
        // flip dimensions
        if (perm[p] < 0) {
            outStart[p] = outStep[p] * (outdim[p] - 1)
            outStep[p] = -outStep[p]
        }
    }
    nvImage.img2RASstep = outStep
    nvImage.img2RASstart = outStart

    calculateOblique(nvImage)
}

/**
 * Reorient raw header data to RAS.
 * Assume single volume, use nVolumes to specify, set nVolumes = 0 for same as input.
 *
 * @param nvImage - The NVImage instance
 * @param nVolumes - Number of volumes (default: 1)
 * @returns Promise<NIFTI1 | NIFTI2> - Reoriented header
 */
export async function hdr2RAS(nvImage: NVImage, nVolumes: number = 1): Promise<NIFTI1 | NIFTI2> {
    if (!nvImage.permRAS) {
        throw new Error('permRAS undefined')
    }
    if (!nvImage.hdr) {
        throw new Error('hdr undefined')
    }
    // make a deep clone
    const hdrBytes = hdrToArrayBuffer({ ...nvImage.hdr!, vox_offset: 352 }, false)
    const hdr = await readHeaderAsync(hdrBytes.buffer as ArrayBuffer, true)
    // n.b. if nVolumes < 1, input volumes = output volumess
    if (nVolumes === 1) {
        // 3D
        hdr.dims[0] = 3
        hdr.dims[4] = 1
    } else if (nVolumes > 1) {
        // 4D
        hdr.dims[0] = 4
        hdr.dims[4] = nVolumes
    }
    const perm = nvImage.permRAS.slice()
    if (perm[0] === 1 && perm[1] === 2 && perm[2] === 3) {
        return hdr
    } // header is already in RAS
    hdr.qform_code = 0
    for (let i = 1; i < 4; i++) {
        hdr.dims[i] = nvImage.dimsRAS[i]
    }

    for (let i = 0; i < nvImage.pixDimsRAS.length; i++) {
        hdr.pixDims[i] = nvImage.pixDimsRAS[i]
    }
    let k = 0
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            hdr.affine[i][j] = nvImage.matRAS[k]
            k++
        }
    }
    return hdr
}

/**
 * Reorient raw image data to RAS.
 * Note that GPU-based orient shader is much faster.
 * Returns single 3D volume even for 4D input. Use nVolume to select volume (0 indexed).
 *
 * @param nvImage - The NVImage instance
 * @param nVolume - Volume index (default: 0)
 * @returns TypedVoxelArray - Reoriented image data
 */
export function img2RAS(nvImage: NVImage, nVolume: number = 0): TypedVoxelArray {
    if (!nvImage.permRAS) {
        throw new Error('permRAS undefined')
    }
    if (!nvImage.img) {
        throw new Error('img undefined')
    }
    if (!nvImage.hdr) {
        throw new Error('hdr undefined')
    }

    const perm = nvImage.permRAS.slice()
    if (perm[0] === 1 && perm[1] === 2 && perm[2] === 3) {
        return nvImage.img
    } // image is already in RAS
    const hdr = nvImage.hdr
    const nVox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
    let volSkip = nVolume * nVox
    if (volSkip + nVox > nvImage.img.length || volSkip < 0) {
        volSkip = 0
        log.warn(`img2RAS nVolume (${nVolume}) out of bounds (${nVolume}+1)×${nVox} > ${nvImage.img.length}`)
    }
    // preallocate/clone image (only 3D for 4D datasets!)
    const imgRAS = nvImage.img.slice(0, nVox)
    const aperm = [Math.abs(perm[0]), Math.abs(perm[1]), Math.abs(perm[2])]
    const outdim = [hdr.dims[aperm[0]], hdr.dims[aperm[1]], hdr.dims[aperm[2]]]
    const inStep = [1, hdr.dims[1], hdr.dims[1] * hdr.dims[2]] // increment i,j,k
    const outStep = [inStep[aperm[0] - 1], inStep[aperm[1] - 1], inStep[aperm[2] - 1]]
    const outStart = [0, 0, 0]
    for (let p = 0; p < 3; p++) {
        // flip dimensions
        if (perm[p] < 0) {
            outStart[p] = outStep[p] * (outdim[p] - 1)
            outStep[p] = -outStep[p]
        }
    }
    let j = 0
    for (let z = 0; z < outdim[2]; z++) {
        const zi = outStart[2] + z * outStep[2]
        for (let y = 0; y < outdim[1]; y++) {
            const yi = outStart[1] + y * outStep[1]
            for (let x = 0; x < outdim[0]; x++) {
                const xi = outStart[0] + x * outStep[0]
                imgRAS[j] = nvImage.img[xi + yi + zi + volSkip]
                j++
            } // for x
        } // for y
    } // for z
    return imgRAS
}
