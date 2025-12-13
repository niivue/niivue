/**
 * Volume layer rendering helper functions for breaking up complex refreshLayers() logic.
 * These pure functions handle specific aspects of volume layer rendering.
 */

import { mat4, vec3 } from 'gl-matrix'
import { NVImage } from '@/nvimage'
import { NiivueObject3D } from '@/niivue-object3D'
import { toNiivueObject3D } from '@/nvimage/RenderingUtils'
import { Shader } from '@/shader'

// Texture unit constants (matching index.ts)
const TEXTURE0_BACK_VOL = 33984
const TEXTURE2_OVERLAY_VOL = 33986
const TEXTURE10_BLEND = 33994

/**
 * Parameters for setting up volume object 3D
 */
export interface SetupVolumeObject3DParams {
    overlayItem: NVImage
    VOLUME_ID: number
    gl: WebGL2RenderingContext
}

/**
 * Create volume object 3D for the background volume.
 * This is only done for layer 0 (background).
 * NOTE: After calling this function, you must:
 * 1. Assign the returned volumeObject3D to this.volumeObject3D
 * 2. Then call this.sliceScale() to get volScale and vox
 * 3. Then set volumeObject3D.scale = Array.from(volScale)
 * @param params - Setup parameters
 * @returns Volume object 3D
 */
export function setupVolumeObject3D(params: SetupVolumeObject3DParams): NiivueObject3D {
    const { overlayItem, VOLUME_ID, gl } = params
    return toNiivueObject3D(overlayItem, VOLUME_ID, gl)
}

/**
 * Parameters for calculating overlay transform matrix
 */
export interface CalculateOverlayTransformParams {
    overlayItem: NVImage
    mm2frac: (mm: vec3, volIdx: number, forceVol0: boolean) => vec3
}

/**
 * Calculate transformation matrix for overlay volumes (layer > 0).
 * Converts mm coordinates to fractional coordinates and builds transform matrix.
 * @param params - Transform calculation parameters
 * @returns Inverted transformation matrix
 */
export function calculateOverlayTransformMatrix(params: CalculateOverlayTransformParams): mat4 {
    const { overlayItem, mm2frac } = params

    const f000 = mm2frac(overlayItem.mm000!, 0, true) // origin in output space
    let f100 = mm2frac(overlayItem.mm100!, 0, true)
    let f010 = mm2frac(overlayItem.mm010!, 0, true)
    let f001 = mm2frac(overlayItem.mm001!, 0, true)

    f100 = vec3.subtract(f100, f100, f000) // direction of i dimension from origin
    f010 = vec3.subtract(f010, f010, f000) // direction of j dimension from origin
    f001 = vec3.subtract(f001, f001, f000) // direction of k dimension from origin

    const mtx = mat4.fromValues(
        f100[0],
        f010[0],
        f001[0],
        f000[0],

        f100[1],
        f010[1],
        f001[1],
        f000[1],

        f100[2],
        f010[2],
        f001[2],
        f000[2],
        0,
        0,
        0,
        1
    )

    mat4.invert(mtx, mtx)

    return mtx
}

/**
 * Parameters for texture allocation
 */
export interface AllocateTexturesParams {
    gl: WebGL2RenderingContext
    layer: number
    backDims: number[]
    rgbaTex: (texID: WebGLTexture | null, activeID: number, dims: number[], isInit?: boolean) => WebGLTexture | null
}

/**
 * Result of texture allocation
 */
export interface AllocateTexturesResult {
    volumeTexture?: WebGLTexture | null
    overlayTexture?: WebGLTexture | null
    overlayTextureID?: WebGLTexture | null
}

/**
 * Allocate WebGL textures for volume or overlay.
 * Layer 0 allocates volumeTexture, layer 1 allocates overlayTexture.
 * @param params - Texture allocation parameters
 * @returns Allocated textures
 */
export function allocateVolumeTextures(params: AllocateTexturesParams): AllocateTexturesResult {
    const { layer, backDims, rgbaTex } = params

    if (layer === 0) {
        const outTexture = rgbaTex(null, TEXTURE0_BACK_VOL, backDims)
        return { volumeTexture: outTexture }
    } else if (layer === 1) {
        const outTexture = rgbaTex(null, TEXTURE2_OVERLAY_VOL, backDims)
        return {
            overlayTexture: outTexture,
            overlayTextureID: outTexture
        }
    }

    return {}
}

/**
 * Setup framebuffer for rendering to texture.
 * @param gl - WebGL context
 * @returns Framebuffer object
 */
export function setupFramebuffer(gl: WebGL2RenderingContext): WebGLFramebuffer | null {
    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.BLEND)
    return fb
}

/**
 * Parameters for blend texture setup
 */
export interface SetupBlendTextureParams {
    gl: WebGL2RenderingContext
    layer: number
    backDims: number[]
    rgbaTex: (texID: WebGLTexture | null, activeID: number, dims: number[], isInit?: boolean) => WebGLTexture | null
    passThroughShader: Shader
}

/**
 * Setup blend texture for multi-layer rendering (layer > 1).
 * Uses pass-through shader to copy previous overlay texture (already bound to texture unit 2).
 * @param params - Blend texture parameters
 * @returns Blend texture
 */
export function setupBlendTexture(params: SetupBlendTextureParams): WebGLTexture | null {
    const { gl, layer, backDims, rgbaTex, passThroughShader } = params

    // Only blend for layer > 1
    if (layer <= 1) {
        return rgbaTex(null, TEXTURE10_BLEND, [2, 2, 2, 2])
    }

    // Use pass-through shader to copy previous color to temporary 2D texture
    const blendTexture = rgbaTex(null, TEXTURE10_BLEND, backDims)
    gl.bindTexture(gl.TEXTURE_3D, blendTexture)

    passThroughShader.use(gl)
    gl.uniform1i(passThroughShader.uniforms.in3D, 2) // overlay volume

    for (let i = 0; i < backDims[3]; i++) {
        // output slices
        const coordZ = (1 / backDims[3]) * (i + 0.5)
        gl.uniform1f(passThroughShader.uniforms.coordZ, coordZ)
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, blendTexture, 0, i)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    return blendTexture
}

/**
 * Parameters for configuring colormap uniforms
 */
export interface ConfigureColormapUniformsParams {
    gl: WebGL2RenderingContext
    overlayItem: NVImage
    orientShader: Shader
    layer: number
    isAdditiveBlend: boolean
}

/**
 * Configure colormap-related shader uniforms.
 * Handles colormap types, negative colormaps, and outline settings.
 * @param params - Colormap configuration parameters
 */
export function configureColormapUniforms(params: ConfigureColormapUniformsParams): void {
    const { gl, overlayItem, orientShader, layer, isAdditiveBlend } = params

    // Handle colormap type
    const isColorbarFromZero = overlayItem.colormapType !== 0 ? 1 : 0 // COLORMAP_TYPE.MIN_TO_MAX = 0
    const isAlphaThreshold = overlayItem.colormapType === 1 ? 1 : 0 // COLORMAP_TYPE.ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN = 1

    gl.uniform1i(orientShader.uniforms.isAlphaThreshold, isAlphaThreshold)
    gl.uniform1i(orientShader.uniforms.isColorbarFromZero, isColorbarFromZero)
    gl.uniform1i(orientShader.uniforms.isAdditiveBlend, isAdditiveBlend ? 1 : 0)

    // Handle negative colormap
    let mnNeg = Number.POSITIVE_INFINITY
    let mxNeg = Number.NEGATIVE_INFINITY

    if (overlayItem.colormapNegative.length > 0) {
        // assume symmetrical
        mnNeg = Math.min(-overlayItem.cal_min!, -overlayItem.cal_max!)
        mxNeg = Math.max(-overlayItem.cal_min!, -overlayItem.cal_max!)

        if (isFinite(overlayItem.cal_minNeg) && isFinite(overlayItem.cal_maxNeg)) {
            // explicit range for negative colormap: allows asymmetric maps
            mnNeg = Math.min(overlayItem.cal_minNeg, overlayItem.cal_maxNeg)
            mxNeg = Math.max(overlayItem.cal_minNeg, overlayItem.cal_maxNeg)
        }
    }

    gl.uniform1f(orientShader.uniforms.layer ?? null, layer)
    gl.uniform1f(orientShader.uniforms.cal_minNeg ?? null, mnNeg)
    gl.uniform1f(orientShader.uniforms.cal_maxNeg ?? null, mxNeg)
}

/**
 * Parameters for rendering to output texture
 */
export interface RenderToOutputTextureParams {
    gl: WebGL2RenderingContext
    orientShader: Shader
    backDims: number[]
    outTexture: WebGLTexture | null
    mtx: mat4
    hdr: any
    intensityVolTextureUnit: number
    blendTextureUnit: number
    colormapTextureUnit: number
    modulationTextureUnit: number
    opacity: number
    atlasOutline: number
    atlasActiveIndex: number
}

/**
 * Render volume slices to output texture using framebuffer.
 * Iterates through all slices and renders each one.
 * @param params - Rendering parameters
 */
export function renderToOutputTexture(params: RenderToOutputTextureParams): void {
    const { gl, orientShader, backDims, outTexture, mtx, hdr, intensityVolTextureUnit, blendTextureUnit, colormapTextureUnit, modulationTextureUnit, opacity, atlasOutline, atlasActiveIndex } = params

    orientShader.use(gl)

    // Set up shader uniforms
    gl.uniform1i(orientShader.uniforms.intensityVol ?? null, intensityVolTextureUnit)
    gl.uniform1i(orientShader.uniforms.blend3D ?? null, blendTextureUnit)
    gl.uniform1i(orientShader.uniforms.colormap ?? null, colormapTextureUnit)
    gl.uniform1f(orientShader.uniforms.scl_inter ?? null, hdr.scl_inter)
    gl.uniform1f(orientShader.uniforms.scl_slope ?? null, hdr.scl_slope)
    gl.uniform1f(orientShader.uniforms.opacity ?? null, opacity)
    gl.uniform1i(orientShader.uniforms.modulationVol ?? null, modulationTextureUnit)
    gl.uniformMatrix4fv(orientShader.uniforms.mtx, false, mtx)

    // Set outline parameters
    let outline = 0
    if (hdr.intent_code === 1002) {
        // NiiIntentCode.NIFTI_INTENT_LABEL = 1002
        outline = atlasOutline
        gl.uniform1ui(orientShader.uniforms.activeIndex, atlasActiveIndex | 0)
    }

    gl.uniform4fv(orientShader.uniforms.xyzaFrac, [1.0 / backDims[1], 1.0 / backDims[2], 1.0 / backDims[3], outline])

    // Render each slice
    for (let i = 0; i < backDims[3]; i++) {
        const coordZ = (1 / backDims[3]) * (i + 0.5)
        gl.uniform1f(orientShader.uniforms.coordZ, coordZ)
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, outTexture, 0, i)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
}

/**
 * Parameters for updating shader uniforms
 */
export interface UpdateShaderUniformsParams {
    gl: WebGL2RenderingContext
    renderShader: Shader
    pickingImageShader: Shader
    sliceShader: Shader
    overlaysLength: number
    clipPlaneColor: number[]
    backOpacity: number
    renderOverlayBlend: number
    clipPlane: number[]
    texVox: number[] | vec3
    volScale: number[] | vec3
    drawOpacity: number
    paqdUniforms: number[]
}

/**
 * Update shader uniforms after texture operations.
 * Sets uniforms for render, picking, and slice shaders.
 * @param params - Shader uniform parameters
 */
export function updateShaderUniforms(params: UpdateShaderUniformsParams): void {
    const { gl, renderShader, pickingImageShader, sliceShader, overlaysLength, clipPlaneColor, backOpacity, renderOverlayBlend, clipPlane, texVox, volScale, drawOpacity, paqdUniforms } = params

    // Update render shader
    renderShader.use(gl)
    gl.uniform1f(renderShader.uniforms.overlays, overlaysLength)
    gl.uniform4fv(renderShader.uniforms.clipPlaneColor, clipPlaneColor)
    gl.uniform1f(renderShader.uniforms.backOpacity, backOpacity)
    gl.uniform1f(renderShader.uniforms.renderOverlayBlend, renderOverlayBlend)
    gl.uniform4fv(renderShader.uniforms.clipPlane, clipPlane)
    gl.uniform3fv(renderShader.uniforms.texVox, texVox)
    gl.uniform3fv(renderShader.uniforms.volScale, volScale)

    // Update picking shader
    pickingImageShader.use(gl)
    gl.uniform1f(pickingImageShader.uniforms.overlays, overlaysLength)
    gl.uniform3fv(pickingImageShader.uniforms.texVox, texVox)

    // Update slice shader
    sliceShader.use(gl)
    gl.uniform1f(sliceShader.uniforms.overlays, overlaysLength)
    gl.uniform1f(sliceShader.uniforms.drawOpacity, drawOpacity)
    gl.uniform4fv(sliceShader.uniforms.paqdUniforms, paqdUniforms)
}

/**
 * Parameters for slice shader selection
 */
export interface SelectSliceShaderParams {
    is2DSliceShader: boolean
    isV1SliceShader: boolean
    sliceMMShader: Shader | null
    slice2DShader: Shader | null
    sliceV1Shader: Shader | null
    customSliceShader: Shader | null
}

/**
 * Select the appropriate slice shader based on options.
 * @param params - Shader selection parameters
 * @returns Selected shader
 * @throws Error if no valid shader is available
 */
export function selectSliceShader(params: SelectSliceShaderParams): Shader {
    const { is2DSliceShader, isV1SliceShader, sliceMMShader, slice2DShader, sliceV1Shader, customSliceShader } = params

    let shader = sliceMMShader
    if (is2DSliceShader) {
        shader = slice2DShader
    }
    if (isV1SliceShader) {
        shader = sliceV1Shader
    }
    if (customSliceShader) {
        shader = customSliceShader
    }
    if (!shader) {
        throw new Error('slice shader undefined')
    }
    return shader
}

/**
 * Parameters for binding slice shader textures
 */
export interface BindSliceShaderTexturesParams {
    gl: WebGL2RenderingContext
    shader: Shader
    is2DSliceShader: boolean
    drawTexture: WebGLTexture | null
    paqdTexture: WebGLTexture | null
    TEXTURE7_DRAW: number
    TEXTURE8_PAQD: number
}

/**
 * Bind drawing and PAQD textures for slice shader.
 * @param params - Texture binding parameters
 */
export function bindSliceShaderTextures(params: BindSliceShaderTexturesParams): void {
    const { gl, shader, is2DSliceShader, drawTexture, paqdTexture, TEXTURE7_DRAW, TEXTURE8_PAQD } = params

    gl.uniform1i(shader.uniforms.drawing, 7)
    gl.activeTexture(TEXTURE7_DRAW)
    if (is2DSliceShader) {
        gl.bindTexture(gl.TEXTURE_2D, drawTexture)
    } else {
        gl.bindTexture(gl.TEXTURE_3D, drawTexture)
    }
    gl.uniform1i(shader.uniforms.paqd, 8)
    gl.activeTexture(TEXTURE8_PAQD)
    gl.bindTexture(gl.TEXTURE_3D, paqdTexture)
}

/**
 * Parameters for creating temporary 3D texture
 */
export interface CreateTemporaryTextureParams {
    gl: WebGL2RenderingContext
    TEXTURE9_ORIENT: number
}

/**
 * Create and configure a temporary 3D texture for volume rendering.
 * @param params - Texture creation parameters
 * @returns Created texture
 */
export function createTemporaryTexture(params: CreateTemporaryTextureParams): WebGLTexture | null {
    const { gl, TEXTURE9_ORIENT } = params

    const tempTex3D = gl.createTexture()
    gl.activeTexture(TEXTURE9_ORIENT)
    gl.bindTexture(gl.TEXTURE_3D, tempTex3D)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

    return tempTex3D
}

// NIfTI datatype codes (matching nvimage)
const NII_DT_UINT8 = 2
const NII_DT_INT16 = 4
const NII_DT_FLOAT32 = 16
const NII_DT_FLOAT64 = 64
const NII_DT_RGB24 = 128
const NII_DT_UINT16 = 512
const NII_DT_RGBA32 = 2304
const NII_INTENT_LABEL = 1002

/**
 * Parameters for setting up volume texture data
 */
export interface SetupVolumeTextureDataParams {
    gl: WebGL2RenderingContext
    hdr: any
    img: any
    orientShaderU: Shader
    orientShaderI: Shader
    orientShaderF: Shader
    orientShaderRGBU: Shader
    orientShaderAtlasU: Shader
    orientShaderAtlasI: Shader
}

/**
 * Result of volume texture data setup
 */
export interface SetupVolumeTextureDataResult {
    orientShader: Shader
}

/**
 * Setup volume texture data based on datatype.
 * Allocates GPU texture storage, transfers image data, and selects appropriate shader.
 * @param params - Setup parameters
 * @returns Selected orient shader
 */
export function setupVolumeTextureData(params: SetupVolumeTextureDataParams): SetupVolumeTextureDataResult {
    const { gl, hdr, img, orientShaderU, orientShaderI, orientShaderF, orientShaderRGBU, orientShaderAtlasU, orientShaderAtlasI } = params

    let orientShader = orientShaderU

    if (hdr.datatypeCode === NII_DT_UINT8) {
        if (hdr.intent_code === NII_INTENT_LABEL) {
            orientShader = orientShaderAtlasU
        }
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED_INTEGER, gl.UNSIGNED_BYTE, img)
    } else if (hdr.datatypeCode === NII_DT_INT16) {
        orientShader = orientShaderI
        if (hdr.intent_code === NII_INTENT_LABEL) {
            orientShader = orientShaderAtlasI
        }
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R16I, hdr.dims[1], hdr.dims[2], hdr.dims[3])
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED_INTEGER, gl.SHORT, img)
    } else if (hdr.datatypeCode === NII_DT_FLOAT32) {
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R32F, hdr.dims[1], hdr.dims[2], hdr.dims[3])
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED, gl.FLOAT, img)
        orientShader = orientShaderF
    } else if (hdr.datatypeCode === NII_DT_FLOAT64) {
        const img32f = Float32Array.from(img)
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R32F, hdr.dims[1], hdr.dims[2], hdr.dims[3])
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED, gl.FLOAT, img32f)
        orientShader = orientShaderF
    } else if (hdr.datatypeCode === NII_DT_RGB24) {
        orientShader = orientShaderRGBU
        orientShader.use(gl)
        gl.uniform1i(orientShader.uniforms.hasAlpha, 0)
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGB8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RGB_INTEGER, gl.UNSIGNED_BYTE, img)
    } else if (hdr.datatypeCode === NII_DT_UINT16) {
        if (hdr.intent_code === NII_INTENT_LABEL) {
            orientShader = orientShaderAtlasU
        }
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R16UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
        gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED_INTEGER, gl.UNSIGNED_SHORT, img)
    }

    return { orientShader }
}

/**
 * Parameters for setting up RGBA32 texture data
 */
export interface SetupRGBA32TextureDataParams {
    gl: WebGL2RenderingContext
    hdr: any
    img: any
    overlayItem: NVImage
    layer: number
    orientShaderRGBU: Shader
    orientShaderPAQD: Shader
    volumes: NVImage[]
    backDims: number[]
    rgbaTex: (texID: WebGLTexture | null, activeID: number, dims: number[], isInit?: boolean) => WebGLTexture | null
    paqdTexture: WebGLTexture | null
    TEXTURE8_PAQD: number
    TEXTURE9_ORIENT: number
}

/**
 * Result of RGBA32 texture data setup
 */
export interface SetupRGBA32TextureDataResult {
    orientShader: Shader
    outTexture: WebGLTexture | null
    paqdTexture: WebGLTexture | null
}

/**
 * Setup RGBA32 texture data with special PAQD (probabilistic atlas) handling.
 * Allocates GPU texture storage, transfers image data, and handles PAQD textures.
 * @param params - Setup parameters
 * @returns Orient shader and output texture
 */
export function setupRGBA32TextureData(params: SetupRGBA32TextureDataParams): SetupRGBA32TextureDataResult {
    const { gl, hdr, img, overlayItem, layer, orientShaderRGBU, orientShaderPAQD, volumes, backDims, rgbaTex, paqdTexture, TEXTURE8_PAQD, TEXTURE9_ORIENT } = params

    let orientShader = orientShaderRGBU
    let outTexture: WebGLTexture | null = null
    let updatedPaqdTexture = paqdTexture

    if (overlayItem.colormapLabel) {
        orientShader = orientShaderPAQD
        let firstPAQD = true
        for (let l = 0; l < layer; l++) {
            const isRGBA = volumes[l].hdr.datatypeCode === NII_DT_RGBA32
            const isLabel = !!volumes[l].colormapLabel
            if (isRGBA && isLabel) {
                firstPAQD = false
            }
        }
        if (firstPAQD) {
            updatedPaqdTexture = rgbaTex(paqdTexture, TEXTURE8_PAQD, backDims)
        }
        outTexture = updatedPaqdTexture
        gl.activeTexture(TEXTURE9_ORIENT)
    }

    orientShader.use(gl)
    gl.uniform1i(orientShader.uniforms.hasAlpha, 1)
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, img)

    return { orientShader, outTexture, paqdTexture: updatedPaqdTexture }
}
