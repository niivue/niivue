// NIfTI-1 affine derivation. Ports `_qform_to_affine` + `_imaging_volume`
// from reproinx.py (via bidsui). Resolves the "best" affine the same way
// nibabel does: sform when sform_code > 0, fall back to qform when
// qform_code > 0, otherwise return null.

import type { NiftiHeader } from './niftiHeader.js'

export type Vec4 = readonly [number, number, number, number]
export type Affine = readonly [Vec4, Vec4, Vec4, Vec4]
export type Shape3 = readonly [number, number, number]

/**
 * NIfTI-1 quaternion (qform) → 4x4 affine matrix. Mirrors the C reference
 * implementation in nifti1.h's `nifti_quatern_to_mat44`.
 */
export function qformToAffine(header: NiftiHeader): Affine {
  const qfacRaw = header.pixdim[0] ?? 1
  const qfac = qfacRaw === -1 ? -1 : 1
  const [b, c, d] = header.quaternBCD
  const a = Math.sqrt(Math.max(1 - b * b - c * c - d * d, 0))

  const r00 = a * a + b * b - c * c - d * d
  const r01 = 2 * b * c - 2 * a * d
  const r02 = 2 * b * d + 2 * a * c
  const r10 = 2 * b * c + 2 * a * d
  const r11 = a * a + c * c - b * b - d * d
  const r12 = 2 * c * d - 2 * a * b
  const r20 = 2 * b * d - 2 * a * c
  const r21 = 2 * c * d + 2 * a * b
  const r22 = a * a + d * d - b * b - c * c

  const sx = header.pixdim[1] ?? 1
  const sy = header.pixdim[2] ?? 1
  const sz = qfac * (header.pixdim[3] ?? 1)
  const [ox, oy, oz] = header.qoffsetXYZ

  return [
    [r00 * sx, r01 * sy, r02 * sz, ox],
    [r10 * sx, r11 * sy, r12 * sz, oy],
    [r20 * sx, r21 * sy, r22 * sz, oz],
    [0, 0, 0, 1]
  ]
}

/**
 * Return the best-available affine + 3D shape, mirroring nibabel's
 * `get_best_affine`. Returns null when neither sform nor qform is usable.
 */
export function getBestAffine(header: NiftiHeader): { affine: Affine; shape3: Shape3 } | null {
  const shape3: Shape3 = [header.dim[1] ?? 0, header.dim[2] ?? 0, header.dim[3] ?? 0]
  if (header.sformCode > 0) {
    return {
      affine: [header.srowX, header.srowY, header.srowZ, [0, 0, 0, 1]],
      shape3
    }
  }
  if (header.qformCode > 0) {
    return { affine: qformToAffine(header), shape3 }
  }
  return null
}
