import { SLICE_TYPE } from '@/nvdocument'
import { TypedVoxelArray } from '@/nvimage'

interface DrawingDimensions {
  dimX: number
  dimY: number
  dimZ: number
}

interface InterpolationOptions {
  intensityWeight?: number
  binaryThreshold?: number
  intensitySigma?: number
  applySmoothingToSlices?: boolean
  useIntensityGuided?: boolean
  sliceType?: SLICE_TYPE
}

/**
 * Find the first and last slices containing drawing data along a given axis
 * @param sliceType - The slice orientation (AXIAL, CORONAL, or SAGITTAL)
 * @param drawBitmap - The drawing bitmap data
 * @param dims - The volume dimensions
 * @returns Object containing first and last slice indices, or null if no data found
 */
export function findBoundarySlices(
  sliceType: SLICE_TYPE,
  drawBitmap: Uint8Array,
  dims: DrawingDimensions
): { first: number; last: number } | null {
  const { dimX, dimY, dimZ } = dims

  let axisSize: number
  if (sliceType === SLICE_TYPE.AXIAL) {
    axisSize = dimZ
  } else if (sliceType === SLICE_TYPE.CORONAL) {
    axisSize = dimY
  } else if (sliceType === SLICE_TYPE.SAGITTAL) {
    axisSize = dimX
  } else {
    return null
  }

  let firstSliceWithData = -1
  let lastSliceWithData = -1

  for (let slice = 0; slice < axisSize; slice++) {
    let hasData = false

    if (sliceType === SLICE_TYPE.AXIAL) {
      // Check axial slice (XY plane at Z=slice)
      const offset = slice * dimX * dimY
      for (let i = 0; i < dimX * dimY; i++) {
        if (drawBitmap[offset + i] > 0) {
          hasData = true
          break
        }
      }
    } else if (sliceType === SLICE_TYPE.CORONAL) {
      // Check coronal slice (XZ plane at Y=slice)
      for (let z = 0; z < dimZ; z++) {
        for (let x = 0; x < dimX; x++) {
          const idx = x + slice * dimX + z * dimX * dimY
          if (drawBitmap[idx] > 0) {
            hasData = true
            break
          }
        }
        if (hasData) {
          break
        }
      }
    } else if (sliceType === SLICE_TYPE.SAGITTAL) {
      // Check sagittal slice (YZ plane at X=slice)
      for (let z = 0; z < dimZ; z++) {
        for (let y = 0; y < dimY; y++) {
          const idx = slice + y * dimX + z * dimX * dimY
          if (drawBitmap[idx] > 0) {
            hasData = true
            break
          }
        }
        if (hasData) {
          break
        }
      }
    }

    if (hasData) {
      if (firstSliceWithData === -1) {
        firstSliceWithData = slice
      }
      lastSliceWithData = slice
    }
  }

  if (firstSliceWithData === -1 || lastSliceWithData === -1) {
    return null
  }

  return { first: firstSliceWithData, last: lastSliceWithData }
}

/**
 * Extract a single slice from 3D volume data
 * @param sliceIndex - Index of the slice to extract
 * @param sliceType - The slice orientation (AXIAL, CORONAL, or SAGITTAL)
 * @param drawBitmap - The drawing bitmap data
 * @param dims - The volume dimensions
 * @returns Float32Array containing the slice data
 */
export function extractSlice(
  sliceIndex: number,
  sliceType: SLICE_TYPE,
  drawBitmap: Uint8Array,
  dims: DrawingDimensions
): Float32Array {
  const { dimX, dimY, dimZ } = dims

  let sliceData: Float32Array
  if (sliceType === SLICE_TYPE.AXIAL) {
    // Extract axial slice (XY plane at Z=sliceIndex)
    sliceData = new Float32Array(dimX * dimY)
    const offset = sliceIndex * dimX * dimY
    for (let i = 0; i < dimX * dimY; i++) {
      sliceData[i] = drawBitmap[offset + i]
    }
  } else if (sliceType === SLICE_TYPE.CORONAL) {
    // Extract coronal slice (XZ plane at Y=sliceIndex)
    sliceData = new Float32Array(dimX * dimZ)
    for (let z = 0; z < dimZ; z++) {
      for (let x = 0; x < dimX; x++) {
        const srcIdx = x + sliceIndex * dimX + z * dimX * dimY
        const dstIdx = x + z * dimX
        sliceData[dstIdx] = drawBitmap[srcIdx]
      }
    }
  } else if (sliceType === SLICE_TYPE.SAGITTAL) {
    // Extract sagittal slice (YZ plane at X=sliceIndex)
    sliceData = new Float32Array(dimY * dimZ)
    for (let z = 0; z < dimZ; z++) {
      for (let y = 0; y < dimY; y++) {
        const srcIdx = sliceIndex + y * dimX + z * dimX * dimY
        const dstIdx = y + z * dimY
        sliceData[dstIdx] = drawBitmap[srcIdx]
      }
    }
  } else {
    throw new Error('Invalid slice type')
  }

  return sliceData
}

/**
 * Extract intensity slice from image data
 * @param sliceIndex - Index of the slice to extract
 * @param sliceType - The slice orientation
 * @param imageData - The image intensity data
 * @param dims - The volume dimensions
 * @param maxVal - Maximum value for normalization
 * @returns Float32Array containing normalized intensity values
 */
export function extractIntensitySlice(
  sliceIndex: number,
  sliceType: SLICE_TYPE,
  imageData: TypedVoxelArray,
  dims: DrawingDimensions,
  maxVal: number
): Float32Array {
  const { dimX, dimY, dimZ } = dims

  let sliceData: TypedVoxelArray
  if (sliceType === SLICE_TYPE.AXIAL) {
    // Extract axial slice (XY plane at Z=sliceIndex)
    sliceData = new Float32Array(dimX * dimY)
    const offset = sliceIndex * dimX * dimY
    for (let i = 0; i < dimX * dimY; i++) {
      sliceData[i] = imageData[offset + i] / maxVal
    }
  } else if (sliceType === SLICE_TYPE.CORONAL) {
    // Extract coronal slice (XZ plane at Y=sliceIndex)
    sliceData = new Float32Array(dimX * dimZ)
    for (let z = 0; z < dimZ; z++) {
      for (let x = 0; x < dimX; x++) {
        const srcIdx = x + sliceIndex * dimX + z * dimX * dimY
        const dstIdx = x + z * dimX
        sliceData[dstIdx] = imageData[srcIdx] / maxVal
      }
    }
  } else if (sliceType === SLICE_TYPE.SAGITTAL) {
    // Extract sagittal slice (YZ plane at X=sliceIndex)
    sliceData = new Float32Array(dimY * dimZ)
    for (let z = 0; z < dimZ; z++) {
      for (let y = 0; y < dimY; y++) {
        const srcIdx = sliceIndex + y * dimX + z * dimX * dimY
        const dstIdx = y + z * dimY
        sliceData[dstIdx] = imageData[srcIdx] / maxVal
      }
    }
  } else {
    throw new Error('Invalid slice type')
  }

  return sliceData
}

/**
 * Insert a color mask into the drawing bitmap at a specific slice
 * @param mask - The mask data to insert
 * @param sliceIndex - Index of the slice
 * @param sliceType - The slice orientation
 * @param drawBitmap - The drawing bitmap to modify
 * @param dims - The volume dimensions
 * @param binaryThreshold - Threshold for binary conversion
 * @param color - Color value to use
 */
export function insertColorMask(
  mask: TypedVoxelArray,
  sliceIndex: number,
  sliceType: SLICE_TYPE,
  drawBitmap: Uint8Array,
  dims: DrawingDimensions,
  binaryThreshold: number,
  color: number
): void {
  const { dimX, dimY, dimZ } = dims

  if (sliceType === SLICE_TYPE.AXIAL) {
    // Insert axial slice (XY plane at Z=sliceIndex)
    const offset = sliceIndex * dimX * dimY
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] >= binaryThreshold) {
        drawBitmap[offset + i] = color
      }
    }
  } else if (sliceType === SLICE_TYPE.CORONAL) {
    // Insert coronal slice (XZ plane at Y=sliceIndex)
    for (let z = 0; z < dimZ; z++) {
      for (let x = 0; x < dimX; x++) {
        const srcIdx = x + z * dimX
        const dstIdx = x + sliceIndex * dimX + z * dimX * dimY
        if (mask[srcIdx] >= binaryThreshold) {
          drawBitmap[dstIdx] = color
        }
      }
    }
  } else if (sliceType === SLICE_TYPE.SAGITTAL) {
    // Insert sagittal slice (YZ plane at X=sliceIndex)
    for (let z = 0; z < dimZ; z++) {
      for (let y = 0; y < dimY; y++) {
        const srcIdx = y + z * dimY
        const dstIdx = sliceIndex + y * dimX + z * dimX * dimY
        if (mask[srcIdx] >= binaryThreshold) {
          drawBitmap[dstIdx] = color
        }
      }
    }
  } else {
    throw new Error('Invalid slice type')
  }
}

/**
 * Smooth a 2D slice using a simple 3x3 kernel
 * @param slice - The slice data to smooth
 * @param width - Width of the slice
 * @param height - Height of the slice
 */
export function smoothSlice(slice: Float32Array, width: number, height: number): void {
  if (width < 3 || height < 3) {
    return
  }

  const temp = new Float32Array(slice.length)

  // Smooth in X direction
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = x + y * width
      if (x === 0 || x === width - 1) {
        temp[idx] = slice[idx]
      } else {
        temp[idx] = (slice[idx - 1] + 2 * slice[idx] + slice[idx + 1]) * 0.25
      }
    }
  }

  // Smooth in Y direction
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = x + y * width
      if (y === 0 || y === height - 1) {
        slice[idx] = temp[idx]
      } else {
        slice[idx] = (temp[idx - width] + 2 * temp[idx] + temp[idx + width]) * 0.25
      }
    }
  }
}

/**
 * Calculate intensity-based weight for interpolation
 * @param intensity1 - Intensity from first slice
 * @param intensity2 - Intensity from second slice
 * @param targetIntensity - Target intensity to compare against
 * @param intensitySigma - Sigma parameter for weight calculation
 * @returns Weight value between 0 and 1
 */
export function calculateIntensityWeight(
  intensity1: number,
  intensity2: number,
  targetIntensity: number,
  intensitySigma: number
): number {
  const diff1 = Math.abs(targetIntensity - intensity1)
  const diff2 = Math.abs(targetIntensity - intensity2)

  const weight1 = Math.exp((-diff1 * diff1) / (2 * intensitySigma * intensitySigma))
  const weight2 = Math.exp((-diff2 * diff2) / (2 * intensitySigma * intensitySigma))

  const totalWeight = weight1 + weight2
  if (totalWeight < 1e-6) {
    return 0.5
  }

  return weight1 / totalWeight
}

/**
 * Perform geometric interpolation between two slices
 * @param sliceLow - Lower slice data
 * @param sliceHigh - Higher slice data
 * @param z - Current slice index
 * @param sliceIndexLow - Lower slice index
 * @param sliceIndexHigh - Higher slice index
 * @param interpolatedSlice - Output array for interpolated values
 */
export function doGeometricInterpolation(
  sliceLow: Float32Array,
  sliceHigh: Float32Array,
  z: number,
  sliceIndexLow: number,
  sliceIndexHigh: number,
  interpolatedSlice: Float32Array
): void {
  const fracHigh = (z - sliceIndexLow) / (sliceIndexHigh - sliceIndexLow)
  const fracLow = 1 - fracHigh

  for (let i = 0; i < sliceLow.length; i++) {
    interpolatedSlice[i] = sliceLow[i] * fracLow + sliceHigh[i] * fracHigh
  }
}

/**
 * Perform intensity-guided interpolation between two slices
 * @param sliceLow - Lower slice data
 * @param sliceHigh - Higher slice data
 * @param z - Current slice index
 * @param sliceIndexLow - Lower slice index
 * @param sliceIndexHigh - Higher slice index
 * @param interpolatedSlice - Output array for interpolated values
 * @param opts - Interpolation options
 * @param intensityLow - Intensity data for lower slice
 * @param intensityHigh - Intensity data for higher slice
 * @param targetIntensity - Target intensity data
 */
export function doIntensityGuidedInterpolation(
  sliceLow: Float32Array,
  sliceHigh: Float32Array,
  z: number,
  sliceIndexLow: number,
  sliceIndexHigh: number,
  interpolatedSlice: Float32Array,
  opts: { intensityWeight: number; intensitySigma: number },
  intensityLow: Float32Array,
  intensityHigh: Float32Array,
  targetIntensity: Float32Array
): void {
  const baseFracHigh = (z - sliceIndexLow) / (sliceIndexHigh - sliceIndexLow)
  const baseFracLow = 1 - baseFracHigh

  for (let i = 0; i < sliceLow.length; i++) {
    if (sliceLow[i] > 0 || sliceHigh[i] > 0) {
      const intensityWeight = calculateIntensityWeight(
        intensityLow[i],
        intensityHigh[i],
        targetIntensity[i],
        opts.intensitySigma
      )

      const alpha = opts.intensityWeight
      const combinedWeightLow = alpha * intensityWeight + (1 - alpha) * baseFracLow
      const combinedWeightHigh = 1 - combinedWeightLow

      interpolatedSlice[i] = sliceLow[i] * combinedWeightLow + sliceHigh[i] * combinedWeightHigh
    } else {
      interpolatedSlice[i] = sliceLow[i] * baseFracLow + sliceHigh[i] * baseFracHigh
    }
  }
}

/**
 * Main interpolation function for mask slices
 * @param drawBitmap - The drawing bitmap to modify
 * @param dims - The volume dimensions
 * @param imageData - Optional image intensity data for guided interpolation
 * @param maxVal - Maximum value for intensity normalization
 * @param sliceIndexLow - Lower slice index (optional)
 * @param sliceIndexHigh - Higher slice index (optional)
 * @param options - Interpolation options
 * @param refreshDrawingCallback - Callback to refresh the drawing
 */
export function interpolateMaskSlices(
  drawBitmap: Uint8Array,
  dims: DrawingDimensions,
  imageData: TypedVoxelArray,
  maxVal: number,
  sliceIndexLow: number | undefined,
  sliceIndexHigh: number | undefined,
  options: InterpolationOptions,
  refreshDrawingCallback: () => void
): void {
  const { dimX, dimY, dimZ } = dims

  // Determine slice type (default to axial)
  const sliceType = options.sliceType ?? SLICE_TYPE.AXIAL

  // Get dimensions based on slice type
  let sliceWidth: number, sliceHeight: number, maxSliceIndex: number
  if (sliceType === SLICE_TYPE.AXIAL) {
    sliceWidth = dimX
    sliceHeight = dimY
    maxSliceIndex = dimZ - 1
  } else if (sliceType === SLICE_TYPE.CORONAL) {
    sliceWidth = dimX
    sliceHeight = dimZ
    maxSliceIndex = dimY - 1
  } else if (sliceType === SLICE_TYPE.SAGITTAL) {
    sliceWidth = dimY
    sliceHeight = dimZ
    maxSliceIndex = dimX - 1
  } else {
    throw new Error('Invalid slice type. Must be AXIAL, CORONAL, or SAGITTAL')
  }

  // Set default options
  const opts = {
    intensityWeight: options.intensityWeight ?? 0.7,
    binaryThreshold: options.binaryThreshold ?? 0.375,
    intensitySigma: options.intensitySigma ?? 0.1,
    applySmoothingToSlices: options.applySmoothingToSlices ?? true,
    useIntensityGuided: options.useIntensityGuided ?? true
  }

  // If slice indices are provided, validate them
  if (sliceIndexLow !== undefined && sliceIndexHigh !== undefined) {
    if (sliceIndexLow >= sliceIndexHigh) {
      throw new Error('Low slice index must be less than high slice index')
    }
    if (sliceIndexLow < 0 || sliceIndexHigh > maxSliceIndex) {
      throw new Error(`Slice indices out of bounds [0, ${maxSliceIndex}]`)
    }
  }

  // Find all unique colors across all slices
  const colorRanges = new Map<number, { min: number; max: number }>()

  // Scan through all slices to find color ranges
  for (let sliceIdx = 0; sliceIdx <= maxSliceIndex; sliceIdx++) {
    const slice = extractSlice(sliceIdx, sliceType, drawBitmap, dims)

    for (let i = 0; i < slice.length; i++) {
      const color = slice[i]
      if (color > 0) {
        if (!colorRanges.has(color)) {
          colorRanges.set(color, { min: sliceIdx, max: sliceIdx })
        } else {
          const range = colorRanges.get(color)!
          range.min = Math.min(range.min, sliceIdx)
          range.max = Math.max(range.max, sliceIdx)
        }
      }
    }
  }

  // Process each color independently with its own slice range
  for (const [color, range] of colorRanges) {
    // Use provided indices or color-specific range
    const colorSliceLow = sliceIndexLow !== undefined ? Math.max(sliceIndexLow, range.min) : range.min
    const colorSliceHigh = sliceIndexHigh !== undefined ? Math.min(sliceIndexHigh, range.max) : range.max

    // Skip if range is invalid or too small
    if (colorSliceLow >= colorSliceHigh || colorSliceHigh - colorSliceLow < 2) {
      continue
    }

    // Extract boundary slices for this color
    const sliceLow = extractSlice(colorSliceLow, sliceType, drawBitmap, dims)
    const sliceHigh = extractSlice(colorSliceHigh, sliceType, drawBitmap, dims)

    // Create binary masks for this color
    const colorMaskLow = new Float32Array(sliceLow.length)
    const colorMaskHigh = new Float32Array(sliceHigh.length)

    for (let i = 0; i < sliceLow.length; i++) {
      colorMaskLow[i] = sliceLow[i] === color ? 1 : 0
      colorMaskHigh[i] = sliceHigh[i] === color ? 1 : 0
    }

    // Apply smoothing if enabled
    if (opts.applySmoothingToSlices) {
      smoothSlice(colorMaskLow, sliceWidth, sliceHeight)
      smoothSlice(colorMaskHigh, sliceWidth, sliceHeight)
    }

    // Interpolate between boundary slices for this color
    for (let z = colorSliceLow + 1; z < colorSliceHigh; z++) {
      const colorInterpolated = new Float32Array(sliceWidth * sliceHeight)

      if (opts.useIntensityGuided && imageData) {
        // Intensity-guided interpolation
        const intensityLow = extractIntensitySlice(colorSliceLow, sliceType, imageData, dims, maxVal)
        const intensityHigh = extractIntensitySlice(colorSliceHigh, sliceType, imageData, dims, maxVal)
        const targetIntensity = extractIntensitySlice(z, sliceType, imageData, dims, maxVal)

        doIntensityGuidedInterpolation(
          colorMaskLow,
          colorMaskHigh,
          z,
          colorSliceLow,
          colorSliceHigh,
          colorInterpolated,
          opts,
          intensityLow,
          intensityHigh,
          targetIntensity
        )
      } else {
        // Geometric interpolation
        doGeometricInterpolation(colorMaskLow, colorMaskHigh, z, colorSliceLow, colorSliceHigh, colorInterpolated)
      }

      // Insert interpolated values for this color
      insertColorMask(colorInterpolated, z, sliceType, drawBitmap, dims, opts.binaryThreshold, color)
    }
  }

  // Update the drawing texture
  refreshDrawingCallback()
}
