/**
 * Image processing pure functions for thresholding, connected component
 * labeling, and other image operations.
 *
 * This module provides pure functions for image processing operations.
 * State management and WebGL operations remain in the Niivue class.
 *
 * @module ImageProcessing
 */

import { log } from '@/logger'
import { NiiDataType } from '@/nvimage'

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Parameters for binarizing a volume
 */
export interface BinarizeParams {
  img: ArrayLike<number>
  dims: number[]
}

/**
 * Result of binarizing a volume
 */
export interface BinarizeResult {
  img: Uint8Array
  datatypeCode: number
  cal_min: number
  cal_max: number
}

/**
 * Parameters for finding Otsu thresholds
 */
export interface FindOtsuParams {
  img: ArrayLike<number>
  cal_min: number
  cal_max: number
  scl_inter: number
  scl_slope: number
  mlevel?: number
}

/**
 * Parameters for applying Otsu thresholds to a drawing
 */
export interface ApplyOtsuParams {
  img: ArrayLike<number>
  drawBitmap: Uint8Array
  thresholds: number[]
}

/**
 * Parameters for removing haze from a volume
 */
export interface RemoveHazeParams {
  img: TypedArray
  scl_inter: number
  scl_slope: number
  global_min: number
  threshold: number
}

/**
 * Parameters for determining Otsu level based on removal level
 */
export interface GetOtsuLevelParams {
  level: number
}

/**
 * Parameters for determining threshold from Otsu thresholds based on level
 */
export interface GetHazeThresholdParams {
  level: number
  thresholds: number[]
}

/**
 * TypedArray type for image data
 */
export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array

/**
 * Dimensions object for 3D volumes
 */
export interface Dimensions3D {
  dimX: number
  dimY: number
  dimZ: number
}

/**
 * Parameters for connected component labeling
 */
export interface BwLabelParams {
  img: Uint32Array
  dim: Uint32Array
  conn?: number
  binarize?: boolean
  onlyLargestClusterPerClass?: boolean
}

/**
 * Result of connected component labeling
 */
export interface BwLabelResult {
  clusterCount: number
  labels: Uint32Array
}

/**
 * Internal result from initial labeling pass
 */
export interface InitialLabelingResult {
  labelCount: number
  translationTable: Uint32Array
  initialLabels: Uint32Array
}

/**
 * Internal result from label translation
 */
export interface TranslateLabelResult {
  clusterCount: number
  labels: Uint32Array
}

/**
 * Internal result from largest cluster extraction
 */
export interface LargestClusterResult {
  maxValue: number
  voxels: Uint32Array
}

// ============================================================================
// Binarization Functions
// ============================================================================

/**
 * Binarize a volume by converting all non-zero voxels to 1
 * @param params - Binarization parameters
 * @returns Binarized image data and updated header values
 */
export function binarize(params: BinarizeParams): BinarizeResult {
  const { img, dims } = params
  const vx = dims[1] * dims[2] * dims[3]
  const result = new Uint8Array(vx)

  for (let i = 0; i < vx; i++) {
    if (img[i] !== 0) {
      result[i] = 1
    }
  }

  return {
    img: result,
    datatypeCode: NiiDataType.DT_UINT8,
    cal_min: 0,
    cal_max: 1
  }
}

// ============================================================================
// Otsu Thresholding Functions
// ============================================================================

/**
 * Computes one or more Otsu threshold levels for a volume.
 * Returns raw intensity values corresponding to bin-based thresholds.
 *
 * Based on:
 * - C: https://github.com/rordenlab/niimath
 * - Java: https://github.com/stevenjwest/Multi_OTSU_Segmentation
 *
 * @param params - Otsu threshold parameters
 * @returns Array of threshold values (up to 3 values depending on mlevel)
 */
export function findOtsu(params: FindOtsuParams): number[] {
  const { img, cal_min, cal_max, scl_inter, scl_slope, mlevel = 2 } = params

  const nvox = img.length
  if (nvox < 1) {
    return []
  }

  const nBin = 256
  const maxBin = nBin - 1 // bins indexed from 0: if 256 bins then 0..255
  const h = new Array(nBin).fill(0)

  // Build 1D histogram
  const mn = cal_min
  const mx = cal_max
  if (mx <= mn) {
    return []
  }

  const scale2raw = (mx - mn) / nBin
  function bin2raw(bin: number): number {
    return bin * scale2raw + mn
  }

  const scale2bin = (nBin - 1) / Math.abs(mx - mn)

  for (let v = 0; v < nvox; v++) {
    let val = img[v] * scl_slope + scl_inter
    val = Math.min(Math.max(val, mn), mx)
    val = Math.round((val - mn) * scale2bin)
    h[val]++
  }

  // Build lookup tables P and S
  const P = Array(nBin)
    .fill(0)
    .map(() => Array(nBin).fill(0))
  const S = Array(nBin)
    .fill(0)
    .map(() => Array(nBin).fill(0))

  // Diagonal
  for (let i = 1; i < nBin; ++i) {
    P[i][i] = h[i]
    S[i][i] = i * h[i]
  }

  // Calculate first row (row 0 is all zero)
  for (let i = 1; i < nBin - 1; ++i) {
    P[1][i + 1] = P[1][i] + h[i + 1]
    S[1][i + 1] = S[1][i] + (i + 1) * h[i + 1]
  }

  // Using row 1 to calculate others
  for (let i = 2; i < nBin; i++) {
    for (let j = i + 1; j < nBin; j++) {
      P[i][j] = P[1][j] - P[1][i - 1]
      S[i][j] = S[1][j] - S[1][i - 1]
    }
  }

  // Now calculate H[i][j]
  for (let i = 1; i < nBin; ++i) {
    for (let j = i + 1; j < nBin; j++) {
      if (P[i][j] !== 0) {
        P[i][j] = (S[i][j] * S[i][j]) / P[i][j]
      }
    }
  }

  let max = 0
  const t = [Infinity, Infinity, Infinity]

  if (mlevel > 3) {
    for (let l = 0; l < nBin - 3; l++) {
      for (let m = l + 1; m < nBin - 2; m++) {
        for (let hIdx = m + 1; hIdx < nBin - 1; hIdx++) {
          const v = P[0][l] + P[l + 1][m] + P[m + 1][hIdx] + P[hIdx + 1][maxBin]
          if (v > max) {
            t[0] = l
            t[1] = m
            t[2] = hIdx
            max = v
          }
        }
      }
    }
  } else if (mlevel === 3) {
    for (let l = 0; l < nBin - 2; l++) {
      for (let hIdx = l + 1; hIdx < nBin - 1; hIdx++) {
        const v = P[0][l] + P[l + 1][hIdx] + P[hIdx + 1][maxBin]
        if (v > max) {
          t[0] = l
          t[1] = hIdx
          max = v
        }
      }
    }
  } else {
    for (let i = 0; i < nBin - 1; i++) {
      const v = P[0][i] + P[i + 1][maxBin]
      if (v > max) {
        t[0] = i
        max = v
      }
    }
  }

  return [bin2raw(t[0]), bin2raw(t[1]), bin2raw(t[2])]
}

/**
 * Apply Otsu thresholds to a drawing bitmap.
 * Voxels that are already marked in the drawing are preserved.
 *
 * @param params - Apply Otsu parameters
 * @returns Modified drawing bitmap
 */
export function applyOtsuToDrawing(params: ApplyOtsuParams): Uint8Array {
  const { img, drawBitmap, thresholds } = params
  const nvox = img.length
  const result = new Uint8Array(drawBitmap)

  for (let i = 0; i < nvox; i++) {
    if (result[i] !== 0) {
      continue
    }
    const v = img[i]
    if (v > thresholds[0]) {
      result[i] = 1
    }
    if (v > thresholds[1]) {
      result[i] = 2
    }
    if (v > thresholds[2]) {
      result[i] = 3
    }
  }

  return result
}

// ============================================================================
// Haze Removal Functions
// ============================================================================

/**
 * Determine the Otsu level based on the removal level
 * @param params - Parameters containing the level
 * @returns The Otsu level to use (2, 3, or 4)
 */
export function getOtsuLevelForHaze(params: GetOtsuLevelParams): number {
  const { level } = params
  if (level === 5 || level === 1) {
    return 4
  }
  if (level === 4 || level === 2) {
    return 3
  }
  return 2
}

/**
 * Determine the threshold value from Otsu thresholds based on level
 * @param params - Parameters containing level and thresholds
 * @returns The threshold value to use
 */
export function getHazeThreshold(params: GetHazeThresholdParams): number {
  const { level, thresholds } = params
  if (level === 1) {
    return thresholds[2]
  }
  if (level === 2) {
    return thresholds[1]
  }
  return thresholds[0]
}

/**
 * Apply haze removal to image data.
 * Voxels below the threshold are set to the global minimum value.
 *
 * @param params - Haze removal parameters
 */
export function applyHazeRemoval(params: RemoveHazeParams): void {
  const { img, scl_inter, scl_slope, global_min, threshold } = params
  const nvox = img.length

  for (let v = 0; v < nvox; v++) {
    const val = img[v] * scl_slope + scl_inter
    if (val < threshold) {
      img[v] = global_min
    }
  }
}

// ============================================================================
// Connected Component Labeling Functions
// ============================================================================

/**
 * Computes the linear voxel index from 3D coordinates using image dimensions.
 * @param a - X coordinate
 * @param b - Y coordinate
 * @param c - Z coordinate (slice)
 * @param dim - Dimensions array [dimX, dimY, dimZ]
 * @returns Linear index
 */
export function idx(a: number, b: number, c: number, dim: Uint32Array): number {
  return c * dim[0] * dim[1] + b * dim[0] + a
}

/**
 * Merges multiple provisional labels into a unified class using a translation table.
 * @param tt - Translation table
 * @param nabo - Neighbor labels array
 * @param nr_set - Number of neighbor labels
 */
export function fillTranslationTable(tt: Uint32Array, nabo: Uint32Array, nr_set: number): void {
  let cntr = 0
  const tn = new Uint32Array(nr_set + 5).fill(0)
  const INT_MAX = 2147483647
  let ltn = INT_MAX

  for (let i = 0; i < nr_set; i++) {
    let j = nabo[i]
    cntr = 0
    while (tt[j - 1] !== j) {
      j = tt[j - 1]
      cntr++
      if (cntr > 100) {
        log.info('\nOoh no!!')
        break
      }
    }
    tn[i] = j
    ltn = Math.min(ltn, j)
  }

  for (let i = 0; i < nr_set; i++) {
    tt[tn[i] - 1] = ltn
  }
}

/**
 * Checks if voxels below the given voxel have labels matching its value.
 * Returns the first matching label or 0.
 *
 * @param bw - Binary/label image
 * @param il - Initial labels image
 * @param r - Row (X coordinate)
 * @param c - Column (Y coordinate)
 * @param sl - Slice (Z coordinate)
 * @param dim - Dimensions array
 * @param conn - Connectivity (6, 18, or 26)
 * @param tt - Translation table
 * @returns First matching label or 0
 */
export function checkPreviousSlice(
  bw: Uint32Array,
  il: Uint32Array,
  r: number,
  c: number,
  sl: number,
  dim: Uint32Array,
  conn: number,
  tt: Uint32Array
): number {
  const nabo = new Uint32Array(27)
  let nr_set = 0

  if (!sl) {
    return 0
  }

  const val = bw[idx(r, c, sl, dim)]

  if (conn >= 6) {
    const i = idx(r, c, sl - 1, dim)
    if (val === bw[i]) {
      nabo[nr_set++] = il[i]
    }
  }

  if (conn >= 18) {
    if (r) {
      const i = idx(r - 1, c, sl - 1, dim)
      if (val === bw[i]) {
        nabo[nr_set++] = il[i]
      }
    }
    if (c) {
      const i = idx(r, c - 1, sl - 1, dim)
      if (val === bw[i]) {
        nabo[nr_set++] = il[i]
      }
    }
    if (r < dim[0] - 1) {
      const i = idx(r + 1, c, sl - 1, dim)
      if (val === bw[i]) {
        nabo[nr_set++] = il[i]
      }
    }
    if (c < dim[1] - 1) {
      const i = idx(r, c + 1, sl - 1, dim)
      if (val === bw[i]) {
        nabo[nr_set++] = il[i]
      }
    }
  }

  if (conn === 26) {
    if (r && c) {
      const i = idx(r - 1, c - 1, sl - 1, dim)
      if (val === bw[i]) {
        nabo[nr_set++] = il[i]
      }
    }
    if (r < dim[0] - 1 && c) {
      const i = idx(r + 1, c - 1, sl - 1, dim)
      if (val === bw[i]) {
        nabo[nr_set++] = il[i]
      }
    }
    if (r && c < dim[1] - 1) {
      const i = idx(r - 1, c + 1, sl - 1, dim)
      if (val === bw[i]) {
        nabo[nr_set++] = il[i]
      }
    }
    if (r < dim[0] - 1 && c < dim[1] - 1) {
      const i = idx(r + 1, c + 1, sl - 1, dim)
      if (val === bw[i]) {
        nabo[nr_set++] = il[i]
      }
    }
  }

  if (nr_set) {
    fillTranslationTable(tt, nabo, nr_set)
    return nabo[0]
  } else {
    return 0
  }
}

/**
 * Performs provisional labeling of connected voxels in a volume using specified connectivity.
 *
 * @param bw - Binary/label image
 * @param dim - Dimensions array [dimX, dimY, dimZ]
 * @param conn - Connectivity (6, 18, or 26)
 * @returns Initial labeling result
 */
export function doInitialLabeling(bw: Uint32Array, dim: Uint32Array, conn: number): InitialLabelingResult {
  let label = 1
  const kGrowArrayBy = 8192
  let ttn = kGrowArrayBy
  let tt = new Uint32Array(ttn).fill(0)
  const il = new Uint32Array(dim[0] * dim[1] * dim[2]).fill(0)
  const nabo = new Uint32Array(27)

  for (let sl = 0; sl < dim[2]; sl++) {
    for (let c = 0; c < dim[1]; c++) {
      for (let r = 0; r < dim[0]; r++) {
        let nr_set = 0
        const val = bw[idx(r, c, sl, dim)]
        if (val === 0) {
          continue
        }

        nabo[0] = checkPreviousSlice(bw, il, r, c, sl, dim, conn, tt)
        if (nabo[0]) {
          nr_set += 1
        }

        if (conn >= 6) {
          if (r) {
            const i = idx(r - 1, c, sl, dim)
            if (val === bw[i]) {
              nabo[nr_set++] = il[i]
            }
          }
          if (c) {
            const i = idx(r, c - 1, sl, dim)
            if (val === bw[i]) {
              nabo[nr_set++] = il[i]
            }
          }
        }

        if (conn >= 18) {
          if (c && r) {
            const i = idx(r - 1, c - 1, sl, dim)
            if (val === bw[i]) {
              nabo[nr_set++] = il[i]
            }
          }
          if (c && r < dim[0] - 1) {
            const i = idx(r + 1, c - 1, sl, dim)
            if (val === bw[i]) {
              nabo[nr_set++] = il[i]
            }
          }
        }

        if (nr_set) {
          il[idx(r, c, sl, dim)] = nabo[0]
          fillTranslationTable(tt, nabo, nr_set)
        } else {
          il[idx(r, c, sl, dim)] = label
          if (label >= ttn) {
            ttn += kGrowArrayBy
            const ext = new Uint32Array(ttn)
            ext.set(tt)
            tt = ext
          }
          tt[label - 1] = label
          label++
        }
      }
    }
  }

  // Flatten the translation table
  for (let i = 0; i < label - 1; i++) {
    let j = i
    while (tt[j] !== j + 1) {
      j = tt[j] - 1
    }
    tt[i] = j + 1
  }

  return {
    labelCount: label - 1,
    translationTable: tt,
    initialLabels: il
  }
}

/**
 * Removes gaps in label indices to produce a dense labeling.
 *
 * @param il - Initial labels image
 * @param dim - Dimensions array
 * @param tt - Translation table
 * @param ttn - Number of labels in translation table
 * @returns Translated labels result
 */
export function translateLabels(il: Uint32Array, dim: Uint32Array, tt: Uint32Array, ttn: number): TranslateLabelResult {
  const nvox = dim[0] * dim[1] * dim[2]
  let ml = 0
  const l = new Uint32Array(nvox).fill(0)

  for (let i = 0; i < ttn; i++) {
    ml = Math.max(ml, tt[i])
  }

  const fl = new Uint32Array(ml).fill(0)
  let cl = 0

  for (let i = 0; i < nvox; i++) {
    if (il[i]) {
      if (!fl[tt[il[i] - 1] - 1]) {
        cl += 1
        fl[tt[il[i] - 1] - 1] = cl
      }
      l[i] = fl[tt[il[i] - 1] - 1]
    }
  }

  return {
    clusterCount: cl,
    labels: l
  }
}

/**
 * Retains only the largest cluster for each region in a labeled volume.
 *
 * @param bw - Binary/label image
 * @param cl - Number of clusters
 * @param ls - Labels image
 * @returns Largest cluster result
 */
export function largestOriginalClusterLabels(bw: Uint32Array, cl: number, ls: Uint32Array): LargestClusterResult {
  const nvox = bw.length
  const ls2bw = new Uint32Array(cl + 1).fill(0)
  const sumls = new Uint32Array(cl + 1).fill(0)

  for (let i = 0; i < nvox; i++) {
    const bwVal = bw[i]
    const lsVal = ls[i]
    ls2bw[lsVal] = bwVal
    sumls[lsVal]++
  }

  let mxbw = 0
  for (let i = 0; i < cl + 1; i++) {
    const bwVal = ls2bw[i]
    mxbw = Math.max(mxbw, bwVal)
    // See if this is largest cluster of this bw-value
    for (let j = 0; j < cl + 1; j++) {
      if (j === i) {
        continue
      }
      if (bwVal !== ls2bw[j]) {
        continue
      }
      if (sumls[i] < sumls[j]) {
        ls2bw[i] = 0
      } else if (sumls[i] === sumls[j] && i < j) {
        ls2bw[i] = 0
      } // ties: arbitrary winner
    }
  }

  const vxs = new Uint32Array(nvox).fill(0)
  for (let i = 0; i < nvox; i++) {
    vxs[i] = ls2bw[ls[i]]
  }

  return {
    maxValue: mxbw,
    voxels: vxs
  }
}

/**
 * Computes connected components labeling on a 3D image.
 *
 * Port of https://github.com/rordenlab/niimath/blob/master/src/bwlabel.c
 *
 * @param params - Connected component labeling parameters
 * @returns Labeling result with cluster count and labels
 */
export function bwlabel(params: BwLabelParams): BwLabelResult {
  const { img, dim, conn = 26, binarize: shouldBinarize = false, onlyLargestClusterPerClass = false } = params

  const start = Date.now()
  const nvox = dim[0] * dim[1] * dim[2]
  const bw = new Uint32Array(nvox).fill(0)

  if (![6, 18, 26].includes(conn)) {
    log.info('bwlabel: conn must be 6, 18 or 26.')
    return { clusterCount: 0, labels: bw }
  }

  if (dim[0] < 2 || dim[1] < 2 || dim[2] < 1) {
    log.info('bwlabel: img must be 2 or 3-dimensional')
    return { clusterCount: 0, labels: bw }
  }

  if (shouldBinarize) {
    for (let i = 0; i < nvox; i++) {
      if (img[i] !== 0.0) {
        bw[i] = 1
      }
    }
  } else {
    bw.set(img)
  }

  let { labelCount: ttn, translationTable: tt, initialLabels: il } = doInitialLabeling(bw, dim, conn)
  if (tt === undefined) {
    tt = new Uint32Array()
  }

  const { clusterCount: cl, labels: ls } = translateLabels(il, dim, tt, ttn)
  log.info(conn + ' neighbor clustering into ' + cl + ' regions in ' + (Date.now() - start) + 'ms')

  if (onlyLargestClusterPerClass) {
    const { maxValue: nbw, voxels: bwMx } = largestOriginalClusterLabels(bw, cl, ls)
    return { clusterCount: nbw, labels: bwMx }
  }

  return { clusterCount: cl, labels: ls }
}

/**
 * Check if connectivity value is valid
 * @param conn - Connectivity value
 * @returns True if valid (6, 18, or 26)
 */
export function isValidConnectivity(conn: number): boolean {
  return [6, 18, 26].includes(conn)
}

/**
 * Check if dimensions are valid for bwlabel
 * @param dim - Dimensions array
 * @returns True if valid
 */
export function isValidDimensions(dim: Uint32Array): boolean {
  return dim[0] >= 2 && dim[1] >= 2 && dim[2] >= 1
}
