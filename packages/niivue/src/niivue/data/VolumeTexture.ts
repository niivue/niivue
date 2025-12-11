/**
 * Volume texture management functions for handling GPU textures and texture operations.
 */

import { NVImage, NiiDataType, NiiIntentCode } from '@/nvimage'
import { Shader } from '@/shader'
import { log } from '@/logger'

// Texture unit constants
const TEXTURE9_ORIENT = 33993

/**
 * Prepare layer data by extracting the appropriate frame for 4D volumes
 * @param overlayItem - Volume to prepare
 * @returns Image data for the current frame
 */
export function prepareLayerData(overlayItem: NVImage): any {
    let img = overlayItem.img
    if (overlayItem.frame4D > 0 && overlayItem.frame4D < overlayItem.nFrame4D!) {
        img = overlayItem.img!.slice(overlayItem.frame4D * overlayItem.nVox3D!, (overlayItem.frame4D + 1) * overlayItem.nVox3D!)
    }
    return img
}

/**
 * Result of checking image size limits
 */
export interface ImageSizeLimits {
    isAboveMax2D: boolean
    isAboveMax3D: boolean
}

/**
 * Check if image dimensions exceed hardware texture size limits
 * @param params - Parameters containing hdr and size limits
 * @returns Object indicating if image exceeds 2D or 3D limits
 */
export function checkImageSizeLimits(params: { hdr: any; max2D: number; max3D: number }): ImageSizeLimits {
    const { hdr, max2D, max3D } = params
    const isAboveMax2D = hdr.dims[1] > max2D || hdr.dims[2] > max2D
    const isAboveMax3D = hdr.dims[1] > max3D || hdr.dims[2] > max3D || hdr.dims[3] > max3D
    return { isAboveMax2D, isAboveMax3D }
}

/**
 * Parameters for creating a 2D RGBA texture from large scalar image
 */
export interface Create2DRGBATextureParams {
    hdr: any
    img: any
    overlayItem: NVImage
    crosshairPos: number[]
    frac2vox: (frac: number[]) => number[]
    colormap: (name: string) => Uint8ClampedArray
}

/**
 * Create 2D RGBA texture data for large scalar images
 * @param params - Texture creation parameters
 * @returns RGBA texture data for current slice
 */
export function create2DRGBATextureData(params: Create2DRGBATextureParams): Uint8Array {
    const { hdr, img, overlayItem, crosshairPos, frac2vox, colormap } = params

    const nPix = hdr.dims[1] * hdr.dims[2]
    const vox = frac2vox(crosshairPos)
    const z = Math.min(Math.max(vox[2], 0), hdr.dims[3] - 1)
    const zOffset = z * nPix
    const img2D = new Uint8Array(nPix * 4)
    const img2D_U32 = new Uint32Array(img2D.buffer)
    const opacity = Math.floor(overlayItem.opacity * 255)
    const scale = (255 * hdr.scl_slope) / (overlayItem.cal_max - overlayItem.cal_min)
    const intercept = (255 * (hdr.scl_inter - overlayItem.cal_min)) / (overlayItem.cal_max - overlayItem.cal_min)
    const cmap = new Uint8Array(colormap(overlayItem.colormap))
    const cmap_U32 = new Uint32Array(cmap.buffer)
    let j = -1
    for (let i = 0; i < nPix; i++) {
        const v = img[i + zOffset] * scale + intercept
        const v255 = Math.round(Math.min(255, Math.max(0, v))) // Clamp to 0..255
        img2D_U32[i] = cmap_U32[v255]
        img2D[(j += 4)] = opacity
    }

    return img2D
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
    const { hdr, overlayItem, layer, volumes, orientShaderAtlasU, orientShaderAtlasI, orientShaderU, orientShaderI, orientShaderF, orientShaderRGBU, orientShaderPAQD } = params

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
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED_INTEGER, gl.UNSIGNED_BYTE, img)
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
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RGB_INTEGER, gl.UNSIGNED_BYTE, img)
    } else if (hdr.datatypeCode === NiiDataType.DT_UINT16) {
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R16UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED_INTEGER, gl.UNSIGNED_SHORT, img)
    } else if (hdr.datatypeCode === NiiDataType.DT_RGBA32) {
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, img)
    }

    return tempTex3D
}
