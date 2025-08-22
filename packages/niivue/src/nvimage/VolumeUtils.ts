import { vec4 } from 'gl-matrix'
import { log } from '@/logger'
import { NiiDataType } from '@/nvimage/utils'
import type { NVImage, TypedVoxelArray } from '@/nvimage'

/**
 * Returns all voxel channel values at the specified coordinates.
 * For scalar images, this will return a single-value array [value].
 * For multi-channel images (e.g., RGBA), this will return an array with multiple values.
 *
 * @param nvImage - The NVImage instance.
 * @param x - X coordinate (0-indexed).
 * @param y - Y coordinate (0-indexed).
 * @param z - Z coordinate (0-indexed).
 * @param frame4D - Optional 4D frame index (default is 0).
 * @param isReadImaginary - If true, returns data from the imaginary component (if present).
 * @returns An array of one or more voxel values at the specified location.
 *
 * @see https://niivue.com/demos/features/voxel.html
 */
export function getValues(
  nvImage: NVImage,
  x: number,
  y: number,
  z: number,
  frame4D = 0,
  isReadImaginary = false
): number[] {
  if (!nvImage.hdr) {
    throw new Error('getValue: NVImage header is not defined.')
  }
  if (!isReadImaginary && !nvImage.img) {
    throw new Error('getValue: NVImage image data is not defined.')
  }
  if (isReadImaginary && !nvImage.imaginary) {
    log.warn('getValue: Attempted to read imaginary data, but none exists.')
    return [0]
  }

  const nx = nvImage.hdr.dims[1]
  const ny = nvImage.hdr.dims[2]
  const nz = nvImage.hdr.dims[3]

  const perm = nvImage.permRAS!.slice()
  if (perm[0] !== 1 || perm[1] !== 2 || perm[2] !== 3) {
    const pos = vec4.fromValues(x, y, z, 1)
    vec4.transformMat4(pos, pos, nvImage.toRASvox!)
    x = pos[0]
    y = pos[1]
    z = pos[2]
  }

  // Clamp coordinates to valid range
  x = Math.max(0, Math.min(Math.round(x), nx - 1))
  y = Math.max(0, Math.min(Math.round(y), ny - 1))
  z = Math.max(0, Math.min(Math.round(z), nz - 1))
  frame4D = Math.max(0, frame4D)

  let vx = x + y * nx + z * nx * ny // voxel index within a 3D volume

  // Handle RGB(A) data - calculate luminance
  if (nvImage.hdr.datatypeCode === NiiDataType.DT_RGBA32) {
    if (!nvImage.img) {
      return [0]
    }
    vx *= 4 // 4 bytes per voxel
    // Check bounds for RGBA index access
    if (vx + 3 >= nvImage.img.length) {
      log.warn(`getValue: Calculated index ${vx} out of bounds for RGBA data.`)
      return [0] // Or throw? Return 0 for safety.
    }
    return [nvImage.img[vx], nvImage.img[vx + 1], nvImage.img[vx + 2], nvImage.img[vx + 3]]
  }
  if (nvImage.hdr.datatypeCode === NiiDataType.DT_RGB24) {
    if (!nvImage.img) {
      return [0]
    }
    vx *= 3 // 3 bytes per voxel
    if (vx + 2 >= nvImage.img.length) {
      log.warn(`getValue: Calculated index ${vx} out of bounds for RGB data.`)
      return [0]
    }
    return [nvImage.img[vx], nvImage.img[vx + 1], nvImage.img[vx + 2]]
  }

  // Calculate offset for 4D frame
  const nVox3D = nx * ny * nz
  const volOffset = frame4D * nVox3D
  const finalVxIndex = vx + volOffset

  // Select the correct data array
  const dataArray = isReadImaginary ? nvImage.imaginary! : nvImage.img!

  // Check final index bounds
  if (finalVxIndex < 0 || finalVxIndex >= dataArray.length) {
    return [0]
  }

  const rawValue = dataArray[finalVxIndex]

  // Apply scaling slope and intercept
  // Use default 1.0 slope if hdr value is 0 or NaN, default 0.0 intercept if NaN
  const slope = isNaN(nvImage.hdr.scl_slope) || nvImage.hdr.scl_slope === 0 ? 1.0 : nvImage.hdr.scl_slope
  const inter = isNaN(nvImage.hdr.scl_inter) ? 0.0 : nvImage.hdr.scl_inter

  return [slope * rawValue + inter]
}

/**
 * Returns voxel intensity at specified coordinates.
 * @param nvImage - The NVImage instance
 * @param x - X coordinate (0-indexed)
 * @param y - Y coordinate (0-indexed)
 * @param z - Z coordinate (0-indexed)
 * @param frame4D - 4D frame index (0-indexed)
 * @param isReadImaginary - Flag to read from imaginary data array if complex
 * @returns Scaled voxel intensity
 */
export function getValue(
  nvImage: NVImage,
  x: number,
  y: number,
  z: number,
  frame4D = 0,
  isReadImaginary = false
): number {
  const vals = getValues(nvImage, x, y, z, frame4D, isReadImaginary)
  if (vals.length < 3) {
    return vals[0]
  }
  // convert RGB to luminance Y = 0.2126 R + 0.7152 G + 0.0722 B (Rec. 709)
  const lum = vals[0] * 0.2126 + vals[1] * 0.7152 + vals[2] * 0.0722
  return lum
}

/**
 * Reads a 3D slab of voxels from a volume, specified in RAS coordinates.
 * @param nvImage - The NVImage instance
 * @param voxStartRAS - First row, column, slice (RAS order, 0-indexed) for selection
 * @param voxEndRAS - Final row, column, slice (RAS order, 0-indexed) for selection
 * @param dataType - Output array type: 'same', 'uint8', 'float32', 'scaled', 'normalized', 'windowed'
 * @returns Tuple: [TypedVoxelArray, slabDimensions]
 */
export function getVolumeData(
  nvImage: NVImage,
  voxStartRAS: number[] = [-1, 0, 0],
  voxEndRAS: number[] = [0, 0, 0],
  dataType = 'same'
): [TypedVoxelArray, number[]] {
  const defaultResult: [TypedVoxelArray, number[]] = [new Uint8Array(), [0, 0, 0]]

  if (!nvImage.hdr || !nvImage.img || !nvImage.dimsRAS || !nvImage.img2RASstep || !nvImage.img2RASstart) {
    log.error('getVolumeData: Missing required NVImage properties (hdr, img, dimsRAS, img2RASstep/start).')
    return defaultResult
  }
  // Ensure input arrays have 3 elements
  voxStartRAS = voxStartRAS.slice(0, 3)
  voxEndRAS = voxEndRAS.slice(0, 3)

  if (Math.min(...voxStartRAS) < 0 || Math.min(...voxEndRAS) < 0) {
    log.warn('getVolumeData: Invalid start or end coordinates provided.')
    return defaultResult
  }

  const dimsRAS = nvImage.dimsRAS.slice(1, 4) // Get RAS dimensions [nx, ny, nz]

  // Clamp coordinates to valid RAS range and ensure start <= end
  for (let i = 0; i < 3; i++) {
    voxStartRAS[i] = Math.max(0, Math.min(Math.round(voxStartRAS[i]), dimsRAS[i] - 1))
    voxEndRAS[i] = Math.max(0, Math.min(Math.round(voxEndRAS[i]), dimsRAS[i] - 1))
    if (voxEndRAS[i] < voxStartRAS[i]) {
      const tmp = voxEndRAS[i]
      voxEndRAS[i] = voxStartRAS[i]
      voxStartRAS[i] = tmp
    }
  }

  const slabDims = [
    voxEndRAS[0] - voxStartRAS[0] + 1,
    voxEndRAS[1] - voxStartRAS[1] + 1,
    voxEndRAS[2] - voxStartRAS[2] + 1
  ]
  const slabNVox = slabDims[0] * slabDims[1] * slabDims[2]

  if (slabNVox <= 0) {
    log.warn('getVolumeData: Calculated slab size is zero or negative.')
    return defaultResult
  }

  let OutputArrayConstructor: new (length: number) => TypedVoxelArray = nvImage.img.constructor as new (
    length: number
  ) => TypedVoxelArray // Default to same as input

  if (dataType === 'uint8') {
    OutputArrayConstructor = Uint8Array
  } else if (dataType === 'int16') {
    OutputArrayConstructor = Int16Array
  } else if (dataType === 'uint16') {
    OutputArrayConstructor = Uint16Array
  } else if (dataType === 'float32' || dataType === 'scaled' || dataType === 'normalized' || dataType === 'windowed') {
    OutputArrayConstructor = Float32Array
  } else if (dataType === 'float64') {
    OutputArrayConstructor = Float64Array
  } else if (dataType !== 'same') {
    log.warn(`getVolumeData: Unsupported dataType '${dataType}'. Using 'same'.`)
  }

  // Create the output array
  let outputImg: TypedVoxelArray
  try {
    outputImg = new OutputArrayConstructor(slabNVox)
  } catch (e) {
    log.error(`getVolumeData: Failed to create output array for dataType '${dataType}'.`, e)
    return defaultResult
  }

  // Get transformation parameters
  const step = nvImage.img2RASstep
  const start = nvImage.img2RASstart
  const sourceImg = nvImage.img // Source data in native orientation

  let outputIndex = 0
  // Iterate through the requested RAS slab dimensions
  for (let rz = voxStartRAS[2]; rz <= voxEndRAS[2]; rz++) {
    const zi = start[2] + rz * step[2] // Native offset component for RAS Z
    for (let ry = voxStartRAS[1]; ry <= voxEndRAS[1]; ry++) {
      const yi = start[1] + ry * step[1] // Native offset component for RAS Y
      for (let rx = voxStartRAS[0]; rx <= voxEndRAS[0]; rx++) {
        const xi = start[0] + rx * step[0] // Native offset component for RAS X
        const nativeIndex = xi + yi + zi // Final index in the native source buffer

        let value = 0
        // Safely read from source image
        if (nativeIndex >= 0 && nativeIndex < sourceImg.length) {
          value = sourceImg[nativeIndex]
        }

        // Store the raw value in the output array
        outputImg[outputIndex++] = value
      }
    }
  }

  // Apply post-processing based on dataType AFTER extracting raw values
  const slope = isNaN(nvImage.hdr.scl_slope) || nvImage.hdr.scl_slope === 0 ? 1.0 : nvImage.hdr.scl_slope
  const inter = isNaN(nvImage.hdr.scl_inter) ? 0.0 : nvImage.hdr.scl_inter

  if (dataType === 'scaled' || dataType === 'normalized' || dataType === 'windowed') {
    // Ensure output is Float32 if scaling is requested but wasn't the original type
    if (!(outputImg instanceof Float32Array)) {
      log.warn(`getVolumeData: Converting output to Float32 for scaling type '${dataType}'.`)
      outputImg = Float32Array.from(outputImg)
    }
    for (let i = 0; i < outputImg.length; i++) {
      outputImg[i] = outputImg[i] * slope + inter
    }
  }

  if (dataType === 'normalized' || dataType === 'windowed') {
    let minVal = nvImage.cal_min
    let maxVal = nvImage.cal_max

    if (dataType === 'normalized') {
      minVal = nvImage.global_min
      maxVal = nvImage.global_max
    }

    const range = maxVal - minVal
    const scale = range === 0 ? 0 : 1 / range

    for (let i = 0; i < outputImg.length; i++) {
      outputImg[i] = (outputImg[i] - minVal) * scale
      outputImg[i] = Math.max(0, Math.min(outputImg[i], 1))
    }
  }

  return [outputImg, slabDims]
}

/**
 * Writes a 3D slab of voxels into a volume, specified in RAS coordinates.
 * @param nvImage - The NVImage instance to modify
 * @param voxStartRAS - First row, column, slice (RAS order, 0-indexed) for selection
 * @param voxEndRAS - Final row, column, slice (RAS order, 0-indexed) for selection
 * @param slabData - Array of voxel values (TypedVoxelArray) matching slab dimensions
 */
export function setVolumeData(
  nvImage: NVImage,
  voxStartRAS: number[] = [-1, 0, 0],
  voxEndRAS: number[] = [0, 0, 0],
  slabData: TypedVoxelArray = new Uint8Array()
): void {
  if (!nvImage.hdr || !nvImage.img || !nvImage.dimsRAS || !nvImage.img2RASstep || !nvImage.img2RASstart) {
    log.error('setVolumeData: Missing required NVImage properties (hdr, img, dimsRAS, img2RASstep/start).')
    return
  }

  if (slabData.length < 1) {
    log.warn('setVolumeData: Input slabData is empty.')
    return
  }
  // Ensure input arrays have 3 elements
  voxStartRAS = voxStartRAS.slice(0, 3)
  voxEndRAS = voxEndRAS.slice(0, 3)

  if (Math.min(...voxStartRAS) < 0 || Math.min(...voxEndRAS) < 0) {
    log.warn('setVolumeData: Invalid start or end coordinates provided.')
    return
  }

  const dimsRAS = nvImage.dimsRAS.slice(1, 4) // Get RAS dimensions [nx, ny, nz]

  // Clamp coordinates to valid RAS range and ensure start <= end
  for (let i = 0; i < 3; i++) {
    voxStartRAS[i] = Math.max(0, Math.min(Math.round(voxStartRAS[i]), dimsRAS[i] - 1))
    voxEndRAS[i] = Math.max(0, Math.min(Math.round(voxEndRAS[i]), dimsRAS[i] - 1))
    if (voxEndRAS[i] < voxStartRAS[i]) {
      const tmp = voxEndRAS[i]
      voxEndRAS[i] = voxStartRAS[i]
      voxStartRAS[i] = tmp
    }
  }

  const slabDims = [
    voxEndRAS[0] - voxStartRAS[0] + 1,
    voxEndRAS[1] - voxStartRAS[1] + 1,
    voxEndRAS[2] - voxStartRAS[2] + 1
  ]
  const slabNVox = slabDims[0] * slabDims[1] * slabDims[2]

  if (slabNVox <= 0) {
    log.warn('setVolumeData: Calculated slab size is zero or negative.')
    return
  }

  if (slabData.length < slabNVox) {
    log.error(
      `setVolumeData: Input slabData length (${slabData.length}) is less than the calculated slab size (${slabNVox}).`
    )
    return
  }

  // Get transformation parameters
  const step = nvImage.img2RASstep
  const start = nvImage.img2RASstart
  const targetImg = nvImage.img // Target data in native orientation

  let sourceIndex = 0
  // Iterate through the requested RAS slab dimensions
  for (let rz = voxStartRAS[2]; rz <= voxEndRAS[2]; rz++) {
    const zi = start[2] + rz * step[2] // Native offset component for RAS Z
    for (let ry = voxStartRAS[1]; ry <= voxEndRAS[1]; ry++) {
      const yi = start[1] + ry * step[1] // Native offset component for RAS Y
      for (let rx = voxStartRAS[0]; rx <= voxEndRAS[0]; rx++) {
        const xi = start[0] + rx * step[0] // Native offset component for RAS X
        const nativeIndex = xi + yi + zi // Final index in the native target buffer

        if (nativeIndex >= 0 && nativeIndex < targetImg.length) {
          targetImg[nativeIndex] = slabData[sourceIndex]
        }
        sourceIndex++
      }
    }
  }
  // Note: This function does NOT handle inverse scaling (converting scaled slabData back to raw).
  // The input slabData is assumed to be in the correct raw data type for the target nvImage.img.
}
