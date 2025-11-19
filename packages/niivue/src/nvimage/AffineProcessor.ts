/**
 * AffineProcessor module
 *
 * Handles affine matrix processing for NIfTI images:
 * - Validates pixel dimensions
 * - Calculates affine matrix from QForm quaternion parameters
 * - Repairs defective affine matrices
 * - Validates scale/intercept values
 *
 * The affine matrix defines the spatial transformation from voxel coordinates
 * to world (scanner) coordinates.
 */

import { NIFTI1, NIFTI2 } from 'nifti-reader-js'
import { log } from '@/logger'
import { isAffineOK } from '@/nvimage/utils'

/**
 * Validate and fix pixel dimensions in NIfTI header.
 * Ensures all spatial pixel dimensions are non-zero.
 *
 * @param hdr - NIfTI header to validate
 */
export function validatePixelDimensions(hdr: NIFTI1 | NIFTI2): void {
  if (hdr.pixDims[1] === 0.0 || hdr.pixDims[2] === 0.0 || hdr.pixDims[3] === 0.0) {
    log.error('pixDims not plausible', hdr)
  }
}

/**
 * Validate and fix scale/intercept values in NIfTI header.
 * Ensures scl_slope is non-zero and scl_inter is defined.
 *
 * @param hdr - NIfTI header to validate
 */
export function validateScaleIntercept(hdr: NIFTI1 | NIFTI2): void {
  // https://github.com/nipreps/fmriprep/issues/2507
  if (isNaN(hdr.scl_slope) || hdr.scl_slope === 0.0) {
    hdr.scl_slope = 1.0
  }
  if (isNaN(hdr.scl_inter)) {
    hdr.scl_inter = 0.0
  }
}

/**
 * Calculate affine matrix from QForm quaternion parameters.
 * The QForm method uses quaternion rotation parameters to define the spatial transform.
 * This is used when useQFormNotSForm is true, or when the affine is invalid,
 * or when qform_code > sform_code.
 *
 * @param hdr - NIfTI header containing quaternion parameters
 * @param useQFormNotSForm - Force use of QForm even if SForm is valid
 */
export function calculateAffineFromQForm(hdr: NIFTI1 | NIFTI2, useQFormNotSForm: boolean): void {
  const affineOK = isAffineOK(hdr.affine)

  if (!useQFormNotSForm && affineOK && hdr.qform_code <= hdr.sform_code) {
    // SForm is valid and preferred, no need to calculate from QForm
    return
  }

  log.debug('spatial transform based on QForm')

  // https://github.com/rii-mango/NIFTI-Reader-JS/blob/6908287bf99eb3bc4795c1591d3e80129da1e2f6/src/nifti1.js#L238
  // Define a, b, c, d for coding convenience
  const b = hdr.quatern_b
  const c = hdr.quatern_c
  const d = hdr.quatern_d

  // quatern_a is a parameter in quaternion [a, b, c, d], which is required in affine calculation (METHOD 2)
  // mentioned in the nifti1.h file
  // It can be calculated by a = sqrt(1.0-(b*b+c*c+d*d))
  const a = Math.sqrt(1.0 - (Math.pow(b, 2) + Math.pow(c, 2) + Math.pow(d, 2)))
  const qfac = hdr.pixDims[0] === 0 ? 1 : hdr.pixDims[0]

  const quatern_R = [
    [a * a + b * b - c * c - d * d, 2 * b * c - 2 * a * d, 2 * b * d + 2 * a * c],
    [2 * b * c + 2 * a * d, a * a + c * c - b * b - d * d, 2 * c * d - 2 * a * b],
    [2 * b * d - 2 * a * c, 2 * c * d + 2 * a * b, a * a + d * d - c * c - b * b]
  ]

  const affine = hdr.affine
  for (let ctrOut = 0; ctrOut < 3; ctrOut += 1) {
    for (let ctrIn = 0; ctrIn < 3; ctrIn += 1) {
      affine[ctrOut][ctrIn] = quatern_R[ctrOut][ctrIn] * hdr.pixDims[ctrIn + 1]
      if (ctrIn === 2) {
        affine[ctrOut][ctrIn] *= qfac
      }
    }
  }

  // The last row of affine matrix is the offset vector
  affine[0][3] = hdr.qoffset_x
  affine[1][3] = hdr.qoffset_y
  affine[2][3] = hdr.qoffset_z

  hdr.affine = affine
}

/**
 * Repair defective affine matrix by creating a simple diagonal matrix
 * from pixel dimensions. This is a fallback when both QForm and SForm
 * produce invalid affine matrices.
 *
 * @param hdr - NIfTI header with defective affine matrix
 */
export function repairDefectiveAffine(hdr: NIFTI1 | NIFTI2): void {
  if (isAffineOK(hdr.affine)) {
    // Affine is already valid, no repair needed
    return
  }

  log.debug('Defective NIfTI: spatial transform does not make sense')

  let x = hdr.pixDims[1]
  let y = hdr.pixDims[2]
  let z = hdr.pixDims[3]

  if (isNaN(x) || x === 0.0) {
    x = 1.0
  }
  if (isNaN(y) || y === 0.0) {
    y = 1.0
  }
  if (isNaN(z) || z === 0.0) {
    z = 1.0
  }

  hdr.pixDims[1] = x
  hdr.pixDims[2] = y
  hdr.pixDims[3] = z

  const affine = [
    [x, 0, 0, 0],
    [0, y, 0, 0],
    [0, 0, z, 0],
    [0, 0, 0, 1]
  ]

  hdr.affine = affine
}

/**
 * Process NIfTI affine matrix: validate, calculate from QForm if needed, and repair if defective.
 * This is the main entry point that coordinates all affine processing steps.
 *
 * @param hdr - NIfTI header to process
 * @param useQFormNotSForm - Prefer QForm over SForm for spatial transform
 */
export function processAffine(hdr: NIFTI1 | NIFTI2, useQFormNotSForm: boolean): void {
  // Step 1: Validate pixel dimensions
  validatePixelDimensions(hdr)

  // Step 2: Validate scale/intercept
  validateScaleIntercept(hdr)

  // Step 3: Calculate affine from QForm if needed
  calculateAffineFromQForm(hdr, useQFormNotSForm)

  // Step 4: Repair affine if still defective
  repairDefectiveAffine(hdr)
}
