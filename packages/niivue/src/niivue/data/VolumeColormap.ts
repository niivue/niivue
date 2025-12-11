/**
 * Volume colormap management functions for handling colormap textures and label colormaps.
 */

import { NVImage } from '@/nvimage'
import { Shader } from '@/shader'

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
 * Parameters for colormap label setup
 */
export interface ColormapLabelParams {
    gl: WebGL2RenderingContext
    overlayItem: NVImage
    orientShader: Shader
    createColormapTexture: (texture: WebGLTexture | null, w: number, h: number) => WebGLTexture | null
}

/**
 * Result of colormap label setup
 */
export interface ColormapLabelResult {
    colormapLabelTexture: WebGLTexture | null
    shouldCleanup: boolean
}

/**
 * Setup colormap for label volumes
 * @param params - Colormap label parameters
 * @returns Colormap texture and cleanup flag
 */
export function setupColormapLabel(params: ColormapLabelParams): ColormapLabelResult {
    const { gl, overlayItem, orientShader, createColormapTexture } = params

    if (overlayItem.colormapLabel === null || overlayItem.colormapLabel.lut.length <= 7) {
        return {
            colormapLabelTexture: null,
            shouldCleanup: false
        }
    }

    const nLabel = overlayItem.colormapLabel.max! - overlayItem.colormapLabel.min! + 1
    const colormapLabelTexture = createColormapTexture(null, 1, nLabel)

    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nLabel, 1, gl.RGBA, gl.UNSIGNED_BYTE, overlayItem.colormapLabel.lut)

    gl.uniform1f(orientShader.uniforms.cal_min, overlayItem.colormapLabel.min! - 0.5)
    gl.uniform1f(orientShader.uniforms.cal_max, overlayItem.colormapLabel.max! + 0.5)
    gl.bindTexture(gl.TEXTURE_2D, colormapLabelTexture)

    return {
        colormapLabelTexture,
        shouldCleanup: true
    }
}
