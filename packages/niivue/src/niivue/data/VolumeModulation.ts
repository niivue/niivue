/**
 * Volume modulation functions for handling modulation textures in volume rendering.
 */

import { NVImage, NiiDataType } from '@/nvimage'
import { Shader } from '@/shader'
import { log } from '@/logger'

/**
 * Parameters for modulation setup
 */
export interface ModulationParams {
    gl: WebGL2RenderingContext
    overlayItem: NVImage
    hdr: any
    volumes: NVImage[]
    orientShader: Shader
    r8Tex: (texID: WebGLTexture | null, activeID: number, dims: number[], isInit: boolean) => WebGLTexture | null
    TEXTURE7: number
}

/**
 * Result of modulation setup
 */
export interface ModulationResult {
    modulateTexture: WebGLTexture | null
}

/**
 * Setup modulation texture for volume rendering
 * @param params - Modulation parameters
 * @returns Modulation texture
 */
export function setupModulation(params: ModulationParams): ModulationResult {
    const { gl, overlayItem, hdr, volumes, orientShader, r8Tex, TEXTURE7 } = params

    // Check if modulation is enabled and valid
    if (overlayItem.modulationImage === null || overlayItem.modulationImage < 0 || overlayItem.modulationImage >= volumes.length) {
        gl.uniform1i(orientShader.uniforms.modulation, 0)
        return { modulateTexture: null }
    }

    const mhdr = volumes[overlayItem.modulationImage].hdr!

    // Check dimensions match
    if (mhdr.dims[1] !== hdr.dims[1] || mhdr.dims[2] !== hdr.dims[2] || mhdr.dims[3] !== hdr.dims[3]) {
        log.debug('Modulation image dimensions do not match target')
        gl.uniform1i(orientShader.uniforms.modulation, 0)
        return { modulateTexture: null }
    }

    log.debug('modulating', volumes)

    // Set modulation mode
    if (overlayItem.modulateAlpha) {
        gl.uniform1i(orientShader.uniforms.modulation, 2)
        gl.uniform1f(orientShader.uniforms.opacity, 1.0)
    } else {
        gl.uniform1i(orientShader.uniforms.modulation, 1)
    }

    // Create modulation texture
    const modulateTexture = r8Tex(null, TEXTURE7, hdr.dims, true)
    gl.activeTexture(TEXTURE7)
    gl.bindTexture(gl.TEXTURE_3D, modulateTexture)

    // Prepare modulation volume data
    const vx = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
    const modulateVolume = new Uint8Array(vx)
    const mn = volumes[overlayItem.modulationImage].cal_min!
    const scale = 1.0 / (volumes[overlayItem.modulationImage].cal_max! - mn)
    const imgRaw = volumes[overlayItem.modulationImage].img!.buffer

    // Get typed array based on datatype
    let img: Uint8Array | Int16Array | Float32Array | Float64Array | Uint16Array = new Uint8Array(imgRaw)
    switch (mhdr.datatypeCode) {
        case NiiDataType.DT_INT16:
            img = new Int16Array(imgRaw)
            break
        case NiiDataType.DT_FLOAT32:
            img = new Float32Array(imgRaw)
            break
        case NiiDataType.DT_FLOAT64:
            img = new Float64Array(imgRaw)
            break
        case NiiDataType.DT_RGB24:
            img = new Uint8Array(imgRaw)
            break
        case NiiDataType.DT_UINT16:
            img = new Uint16Array(imgRaw)
            break
    }

    log.debug(volumes[overlayItem.modulationImage])

    // Handle negative colormap
    const isColormapNegative = volumes[overlayItem.modulationImage].colormapNegative.length > 0
    let mnNeg = volumes[overlayItem.modulationImage].cal_min
    let mxNeg = volumes[overlayItem.modulationImage].cal_max

    if (isFinite(volumes[overlayItem.modulationImage].cal_minNeg) && isFinite(volumes[overlayItem.modulationImage].cal_maxNeg)) {
        mnNeg = volumes[overlayItem.modulationImage].cal_minNeg
        mxNeg = volumes[overlayItem.modulationImage].cal_maxNeg
    }

    mnNeg = Math.abs(mnNeg!)
    mxNeg = Math.abs(mxNeg!)
    if (mnNeg > mxNeg) {
        ;[mnNeg, mxNeg] = [mxNeg, mnNeg]
    }

    const scaleNeg = 1.0 / (mxNeg - mnNeg)
    let mpow = Math.abs(overlayItem.modulateAlpha)
    mpow = Math.max(mpow, 1.0)

    // Select the correct frame for 4D volumes
    const volOffset = volumes[overlayItem.modulationImage].frame4D * vx

    // Fill modulation volume
    for (let i = 0; i < vx; i++) {
        const vRaw = img[i + volOffset] * mhdr.scl_slope + mhdr.scl_inter
        let v = (vRaw - mn) * scale
        if (isColormapNegative && vRaw < 0.0) {
            v = (Math.abs(vRaw) - mnNeg) * scaleNeg
        }
        v = Math.min(Math.max(v, 0.0), 1.0)
        v = Math.pow(v, mpow) * 255.0
        modulateVolume[i] = v
    }

    // Upload to GPU
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], gl.RED, gl.UNSIGNED_BYTE, modulateVolume)

    return { modulateTexture }
}
