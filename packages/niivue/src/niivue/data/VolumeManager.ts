/**
 * Volume management functions for handling volume arrays, GPU textures, and volume operations.
 * This module provides pure functions for volume array manipulation and WebGL-based texture management.
 */

import { NVImage, NiiDataType, NiiIntentCode } from '@/nvimage'
import { Shader } from '@/shader'
import { log } from '@/logger'

// Texture unit constants
const TEXTURE9_ORIENT = 33993

/**
 * Result of adding a volume
 */
export interface AddVolumeResult {
  volumes: NVImage[]
  index: number
}

/**
 * Result of removing a volume
 */
export interface RemoveVolumeResult {
  volumes: NVImage[]
  removed: NVImage | null
}

/**
 * Result of setting/reordering a volume
 */
export interface SetVolumeResult {
  volumes: NVImage[]
  back: NVImage | null
  overlays: NVImage[]
}

/**
 * Add a volume to the volumes array
 * @param volumes - Current volumes array
 * @param volume - Volume to add
 * @returns New volumes array and index where volume was added
 */
export function addVolume(volumes: NVImage[], volume: NVImage): AddVolumeResult {
  const newVolumes = [...volumes, volume]
  const index = newVolumes.length === 1 ? 0 : newVolumes.length - 1
  return { volumes: newVolumes, index }
}

/**
 * Get the index of a volume by its unique ID
 * @param volumes - Volumes array to search
 * @param id - Volume ID to find
 * @returns Index of volume, or -1 if not found
 */
export function getVolumeIndexByID(volumes: NVImage[], id: string): number {
  for (let i = 0; i < volumes.length; i++) {
    if (volumes[i].id === id) {
      return i
    }
  }
  return -1
}

/**
 * Get the index of an overlay (non-background volume) by its ID
 * @param volumes - Volumes array to search
 * @param id - Volume ID to find
 * @returns Index in overlays array (volumes[1+]), or -1 if not found
 */
export function getOverlayIndexByID(volumes: NVImage[], id: string): number {
  const overlays = volumes.slice(1)
  for (let i = 0; i < overlays.length; i++) {
    if (overlays[i].id === id) {
      return i
    }
  }
  return -1
}

/**
 * Reorder a volume to a new index position
 * @param volumes - Current volumes array
 * @param volume - Volume to reorder
 * @param toIndex - Target index (0 for background, -1 to remove, or valid index)
 * @returns New volumes array with updated back and overlays
 */
export function setVolume(volumes: NVImage[], volume: NVImage, toIndex = 0): SetVolumeResult {
  const numberOfLoadedImages = volumes.length
  if (toIndex > numberOfLoadedImages) {
    return {
      volumes,
      back: volumes.length > 0 ? volumes[0] : null,
      overlays: volumes.slice(1)
    }
  }

  const volIndex = getVolumeIndexByID(volumes, volume.id)
  const newVolumes = [...volumes]

  if (toIndex === 0) {
    // Move to background
    newVolumes.splice(volIndex, 1)
    newVolumes.unshift(volume)
  } else if (toIndex < 0) {
    // Remove volume
    newVolumes.splice(volIndex, 1)
  } else {
    // Move to specific index
    newVolumes.splice(volIndex, 1)
    newVolumes.splice(toIndex, 0, volume)
  }

  return {
    volumes: newVolumes,
    back: newVolumes.length > 0 ? newVolumes[0] : null,
    overlays: newVolumes.slice(1)
  }
}

/**
 * Remove a volume from the volumes array
 * @param volumes - Current volumes array
 * @param volume - Volume to remove
 * @returns New volumes array and the removed volume
 */
export function removeVolume(volumes: NVImage[], volume: NVImage): RemoveVolumeResult {
  const result = setVolume(volumes, volume, -1)
  return {
    volumes: result.volumes,
    removed: volume
  }
}

/**
 * Remove a volume by its index
 * @param volumes - Current volumes array
 * @param index - Index of volume to remove
 * @returns New volumes array and the removed volume
 */
export function removeVolumeByIndex(volumes: NVImage[], index: number): RemoveVolumeResult {
  if (index >= volumes.length) {
    throw new Error('Index of volume out of bounds')
  }
  return removeVolume(volumes, volumes[index])
}

/**
 * Move a volume to the bottom (background) of the stack
 * @param volumes - Current volumes array
 * @param volume - Volume to move
 * @returns New volumes array with updated order
 */
export function moveVolumeToBottom(volumes: NVImage[], volume: NVImage): SetVolumeResult {
  return setVolume(volumes, volume, 0)
}

/**
 * Move a volume up one position in the stack
 * @param volumes - Current volumes array
 * @param volume - Volume to move
 * @returns New volumes array with updated order
 */
export function moveVolumeUp(volumes: NVImage[], volume: NVImage): SetVolumeResult {
  const volIdx = getVolumeIndexByID(volumes, volume.id)
  return setVolume(volumes, volume, volIdx + 1)
}

/**
 * Move a volume down one position in the stack
 * @param volumes - Current volumes array
 * @param volume - Volume to move
 * @returns New volumes array with updated order
 */
export function moveVolumeDown(volumes: NVImage[], volume: NVImage): SetVolumeResult {
  const volIdx = getVolumeIndexByID(volumes, volume.id)
  return setVolume(volumes, volume, volIdx - 1)
}

/**
 * Move a volume to the top of the stack
 * @param volumes - Current volumes array
 * @param volume - Volume to move
 * @returns New volumes array with updated order
 */
export function moveVolumeToTop(volumes: NVImage[], volume: NVImage): SetVolumeResult {
  return setVolume(volumes, volume, volumes.length - 1)
}

/**
 * Set the opacity of a volume
 * @param volumes - Current volumes array
 * @param volIdx - Index of volume to modify
 * @param newOpacity - New opacity value (0-1)
 * @returns Same volumes array (volume modified in place)
 */
export function setOpacity(volumes: NVImage[], volIdx: number, newOpacity: number): NVImage[] {
  volumes[volIdx].opacity = newOpacity
  return volumes
}

/**
 * Clone a volume
 * @param volumes - Current volumes array
 * @param index - Index of volume to clone
 * @returns Cloned volume
 */
export function cloneVolume(volumes: NVImage[], index: number): NVImage {
  return volumes[index].clone()
}

/**
 * Set the active frame for a 4D volume
 * @param volumes - Current volumes array
 * @param id - Volume ID
 * @param frame4D - Frame number to set (will be clamped to valid range)
 * @returns Same volumes array (volume modified in place)
 */
export function setFrame4D(volumes: NVImage[], id: string, frame4D: number): NVImage[] {
  const idx = getVolumeIndexByID(volumes, id)
  if (idx < 0) {
    return volumes
  }

  const volume = volumes[idx]

  // Clamp frame to valid range
  let clampedFrame = frame4D
  if (clampedFrame > volume.nFrame4D! - 1) {
    clampedFrame = volume.nFrame4D! - 1
  }
  if (clampedFrame < 0) {
    clampedFrame = 0
  }

  // No change needed
  if (clampedFrame === volume.frame4D) {
    return volumes
  }

  volume.frame4D = clampedFrame
  return volumes
}

/**
 * Get the active frame for a 4D volume
 * @param volumes - Current volumes array
 * @param id - Volume ID
 * @returns Current frame number
 */
export function getFrame4D(volumes: NVImage[], id: string): number {
  const idx = getVolumeIndexByID(volumes, id)
  if (idx < 0) {
    return 0
  }
  return volumes[idx].frame4D!
}

/**
 * Generate RGBA data for a volume overlay (for testing/demo purposes)
 * @param volume - Volume to generate data for
 * @returns RGBA data as Uint8ClampedArray
 */
export function overlayRGBA(volume: NVImage): Uint8ClampedArray {
  const hdr = volume.hdr!
  const vox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
  const imgRGBA = new Uint8ClampedArray(vox * 4)
  const radius = 0.2 * Math.min(Math.min(hdr.dims[1], hdr.dims[2]), hdr.dims[3])
  const halfX = 0.5 * hdr.dims[1]
  const halfY = 0.5 * hdr.dims[2]
  const halfZ = 0.5 * hdr.dims[3]
  let j = 0
  for (let z = 0; z < hdr.dims[3]; z++) {
    for (let y = 0; y < hdr.dims[2]; y++) {
      for (let x = 0; x < hdr.dims[1]; x++) {
        const dx = Math.abs(x - halfX)
        const dy = Math.abs(y - halfY)
        const dz = Math.abs(z - halfZ)
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        let v = 0
        if (dist < radius) {
          v = 255
        }
        imgRGBA[j++] = 0 // Red
        imgRGBA[j++] = v // Green
        imgRGBA[j++] = 0 // Blue
        imgRGBA[j++] = v * 0.5 // Alpha
      }
    }
  }
  return imgRGBA
}

/**
 * Parameters for refreshing colormaps
 */
export interface RefreshColormapsParams {
  gl: WebGL2RenderingContext
  colormapTexture: WebGLTexture | null
  volumes: NVImage[]
  colormap: (lutName: string, isInvert: boolean) => Uint8ClampedArray
  createColormapTexture: (texture: WebGLTexture | null, w: number, h: number) => WebGLTexture | null
}

/**
 * Refresh colormap textures for all volumes
 * @param params - Colormap refresh parameters
 * @returns Updated colormap texture
 */
export function refreshColormaps(params: RefreshColormapsParams): WebGLTexture | null {
  const { gl, colormapTexture, volumes, colormap, createColormapTexture } = params

  if (volumes.length < 1) {
    return colormapTexture
  }

  const newColormapTexture = createColormapTexture(colormapTexture, 256, volumes.length)

  for (let i = 0; i < volumes.length; i++) {
    const lut = colormap(volumes[i].colormap, false)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, i, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, lut)
  }

  return newColormapTexture
}

/**
 * Parameters for texture creation based on datatype
 */
export interface TextureCreationParams {
  gl: WebGL2RenderingContext
  hdr: any // NIfTI header
  img: any // Image data
  overlayItem: NVImage
  layer: number
  colormapTexture: WebGLTexture | null
  volumes: NVImage[]
  orientShaderAtlasU: Shader
  orientShaderAtlasI: Shader
  orientShaderU: Shader
  orientShaderI: Shader
  orientShaderF: Shader
  orientShaderRGBU: Shader
  orientShaderPAQD: Shader
  paqdTexture: WebGLTexture | null
  atlasOutline: number
  atlasActiveIndex: number
  backDims: number[]
}

/**
 * Select appropriate shader based on image datatype and intent
 * @param params - Texture creation parameters
 * @returns Selected shader
 */
export function selectOrientShader(params: TextureCreationParams): Shader {
  const {
    hdr,
    overlayItem,
    layer,
    volumes,
    orientShaderAtlasU,
    orientShaderAtlasI,
    orientShaderU,
    orientShaderI,
    orientShaderF,
    orientShaderRGBU,
    orientShaderPAQD
  } = params

  let orientShader = orientShaderU

  if (hdr.datatypeCode === NiiDataType.DT_UINT8) {
    if (hdr.intent_code === NiiIntentCode.NIFTI_INTENT_LABEL) {
      orientShader = orientShaderAtlasU
    }
  } else if (hdr.datatypeCode === NiiDataType.DT_INT16) {
    orientShader = orientShaderI
    if (hdr.intent_code === NiiIntentCode.NIFTI_INTENT_LABEL) {
      orientShader = orientShaderAtlasI
    }
  } else if (hdr.datatypeCode === NiiDataType.DT_FLOAT32 || hdr.datatypeCode === NiiDataType.DT_FLOAT64) {
    orientShader = orientShaderF
  } else if (hdr.datatypeCode === NiiDataType.DT_RGB24) {
    orientShader = orientShaderRGBU
  } else if (hdr.datatypeCode === NiiDataType.DT_UINT16) {
    if (hdr.intent_code === NiiIntentCode.NIFTI_INTENT_LABEL) {
      orientShader = orientShaderAtlasU
    }
  } else if (hdr.datatypeCode === NiiDataType.DT_RGBA32) {
    orientShader = orientShaderRGBU
    if (overlayItem.colormapLabel) {
      orientShader = orientShaderPAQD
      let firstPAQD = true
      for (let l = 0; l < layer; l++) {
        const isRGBA = volumes[l].hdr.datatypeCode === NiiDataType.DT_RGBA32
        const isLabel = !!volumes[l].colormapLabel
        if (isRGBA && isLabel) {
          firstPAQD = false
        }
      }
      if (!firstPAQD) {
        log.warn(`Current version only one probabilistic atlas (PAQD) at a time`)
      }
    }
  }

  return orientShader
}

/**
 * Create and configure a 3D texture based on datatype
 * @param params - Texture creation parameters
 * @returns Configured WebGL texture
 */
export function create3DTextureByDatatype(params: TextureCreationParams): WebGLTexture | null {
  const { gl, hdr, img } = params

  const tempTex3D = gl.createTexture()
  gl.activeTexture(TEXTURE9_ORIENT)
  gl.bindTexture(gl.TEXTURE_3D, tempTex3D)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

  // Configure texture based on datatype
  if (hdr.datatypeCode === NiiDataType.DT_UINT8) {
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
    gl.texSubImage3D(
      gl.TEXTURE_3D,
      0,
      0,
      0,
      0,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3],
      gl.RED_INTEGER,
      gl.UNSIGNED_BYTE,
      img
    )
  } else if (hdr.datatypeCode === NiiDataType.DT_INT16) {
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R16I, hdr.dims[1], hdr.dims[2], hdr.dims[3])
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED_INTEGER, gl.SHORT, img)
  } else if (hdr.datatypeCode === NiiDataType.DT_FLOAT32) {
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R32F, hdr.dims[1], hdr.dims[2], hdr.dims[3])
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED, gl.FLOAT, img)
  } else if (hdr.datatypeCode === NiiDataType.DT_FLOAT64) {
    const img32f = Float32Array.from(img)
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R32F, hdr.dims[1], hdr.dims[2], hdr.dims[3])
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED, gl.FLOAT, img32f)
  } else if (hdr.datatypeCode === NiiDataType.DT_RGB24) {
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGB8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
    gl.texSubImage3D(
      gl.TEXTURE_3D,
      0,
      0,
      0,
      0,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3],
      gl.RGB_INTEGER,
      gl.UNSIGNED_BYTE,
      img
    )
  } else if (hdr.datatypeCode === NiiDataType.DT_UINT16) {
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R16UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
    gl.texSubImage3D(
      gl.TEXTURE_3D,
      0,
      0,
      0,
      0,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3],
      gl.RED_INTEGER,
      gl.UNSIGNED_SHORT,
      img
    )
  } else if (hdr.datatypeCode === NiiDataType.DT_RGBA32) {
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
    gl.texSubImage3D(
      gl.TEXTURE_3D,
      0,
      0,
      0,
      0,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3],
      gl.RGBA_INTEGER,
      gl.UNSIGNED_BYTE,
      img
    )
  }

  return tempTex3D
}
