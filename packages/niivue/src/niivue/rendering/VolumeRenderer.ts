/**
 * Volume rendering helper functions for 3D visualization.
 * This module provides pure functions for 3D volume rendering operations.
 *
 * Related to: 3D volume rendering (ray-casting, MIP, etc.), gradient textures, lighting
 */

import { mat3, mat4, vec3 } from 'gl-matrix'
import { NiftiHeader } from '@/nvimage/nifti'
import { Shader } from '@/shader'
import { NiivueObject3D } from '@/niivue-object3D'
import { deg2rad } from '@/utils'
import { log } from '@/logger'

// WebGL texture unit constants
const TEXTURE0_BACK_VOL = 33984 // gl.TEXTURE0
const TEXTURE6_GRADIENT = 33990 // gl.TEXTURE6
const TEXTURE8_GRADIENT_TEMP = 33992 // gl.TEXTURE8

/**
 * Convert spherical coordinates (azimuth, elevation) to Cartesian unit vector.
 * @param azimuth - Azimuth angle in degrees
 * @param elevation - Elevation angle in degrees
 * @returns Normalized Cartesian [x, y, z] vector
 */
export function sph2cartDeg(azimuth: number, elevation: number): number[] {
    // convert spherical AZIMUTH,ELEVATION,RANGE to Cartesian
    // see Matlab's [x,y,z] = sph2cart(THETA,PHI,R)
    // reverse with cart2sph
    const Phi = -elevation * (Math.PI / 180)
    const Theta = ((azimuth - 90) % 360) * (Math.PI / 180)
    const ret = [Math.cos(Phi) * Math.cos(Theta), Math.cos(Phi) * Math.sin(Theta), Math.sin(Phi)]
    const len = Math.sqrt(ret[0] * ret[0] + ret[1] * ret[1] + ret[2] * ret[2])
    if (len <= 0.0) {
        return ret
    }
    ret[0] /= len
    ret[1] /= len
    ret[2] /= len
    return ret
}

/**
 * Parameters for calculating model matrix
 */
export interface CalculateModelMatrixParams {
    azimuth: number
    elevation: number
    obliqueRAS?: mat4 | null
}

/**
 * Computes the model transformation matrix for the given azimuth and elevation.
 * Applies optional oblique RAS rotation if available.
 * @param params - Parameters containing azimuth, elevation, and optional oblique RAS matrix
 * @returns The calculated model matrix
 */
export function calculateModelMatrix(params: CalculateModelMatrixParams): mat4 {
    const { azimuth, elevation, obliqueRAS } = params
    const modelMatrix = mat4.create()
    modelMatrix[0] = -1 // mirror X coordinate
    // push the model away from the camera so camera not inside model
    // apply elevation
    mat4.rotateX(modelMatrix, modelMatrix, deg2rad(270 - elevation))
    // apply azimuth
    mat4.rotateZ(modelMatrix, modelMatrix, deg2rad(azimuth - 180))
    if (obliqueRAS) {
        const oblique = mat4.clone(obliqueRAS)
        mat4.multiply(modelMatrix, modelMatrix, oblique)
    }
    return modelMatrix
}

/**
 * Parameters for calculating ray direction
 */
export interface CalculateRayDirectionParams {
    azimuth: number
    elevation: number
    obliqueRAS?: mat4 | null
}

/**
 * Returns the normalized near-to-far ray direction for the given view angles.
 * Ensures components are nonzero to avoid divide-by-zero errors.
 * n.b. volumes can have shear (see shear.html), so invert instead of transpose
 * @param params - Parameters containing azimuth, elevation, and optional oblique RAS matrix
 * @returns Normalized ray direction vector
 */
export function calculateRayDirection(params: CalculateRayDirectionParams): vec3 {
    const { azimuth, elevation, obliqueRAS } = params
    // direction in clip/View space we want to map back (note: vec3 used for "direction")
    const dirClip = vec3.fromValues(0, 0, -1)
    const modelMatrix = calculateModelMatrix({ azimuth, elevation, obliqueRAS })
    const proj3 = mat3.fromValues(1, 0, 0, 0, -1, 0, 0, 0, -1)
    const dirAfterProj = vec3.create()
    vec3.transformMat3(dirAfterProj, dirClip, proj3)
    const model3 = mat3.create()
    mat3.fromMat4(model3, modelMatrix)
    const invModel3 = mat3.create()
    if (!mat3.invert(invModel3, model3)) {
        // fallback: if not invertible, return a sensible default (e.g. unit Z)
        return vec3.fromValues(0, 0, 1)
    }
    // worldRay = invModel3 * dirAfterProj
    const worldRay = vec3.create()
    vec3.transformMat3(worldRay, dirAfterProj, invModel3)
    vec3.normalize(worldRay, worldRay)
    // small defuzz to avoid exact zero components
    const tiny = 0.00005
    for (let i = 0; i < 3; i++) {
        if (Math.abs(worldRay[i]) < tiny) {
            worldRay[i] = Math.sign(worldRay[i]) * tiny || tiny
        }
    }
    return worldRay
}

/**
 * Parameters for generating gradient texture
 */
export interface GradientGLParams {
    gl: WebGL2RenderingContext
    hdr: NiftiHeader
    genericVAO: WebGLVertexArrayObject
    unusedVAO: WebGLVertexArrayObject
    volumeTexture: WebGLTexture
    paqdTexture: WebGLTexture | null
    gradientTexture: WebGLTexture | null
    gradientOrder: number
    blurShader: Shader
    sobelBlurShader: Shader
    sobelFirstOrderShader: Shader
    sobelSecondOrderShader: Shader
    rgbaTex: (tex: WebGLTexture | null, textureNum: number, dims: number[], isInit?: boolean) => WebGLTexture
}

/**
 * Generates gradient texture from volume data using GPU shaders and framebuffers.
 * @param params - Parameters containing GL context and all required resources
 * @returns The generated gradient texture
 */
export function gradientGL(params: GradientGLParams): WebGLTexture {
    const { gl, hdr, genericVAO, unusedVAO, volumeTexture, paqdTexture, gradientOrder, blurShader: blurShaderInput, sobelBlurShader, sobelFirstOrderShader, sobelSecondOrderShader, rgbaTex } = params

    let { gradientTexture } = params

    gl.bindVertexArray(genericVAO)
    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.viewport(0, 0, hdr.dims[1], hdr.dims[2])
    gl.disable(gl.BLEND)
    const tempTex3D = rgbaTex(null, TEXTURE8_GRADIENT_TEMP, hdr.dims, true)
    const blurShader = gradientOrder === 2 ? sobelBlurShader : blurShaderInput
    blurShader.use(gl)
    gl.activeTexture(TEXTURE0_BACK_VOL)
    gl.bindTexture(gl.TEXTURE_3D, volumeTexture)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    const blurRadius = 0.7
    gl.uniform1i(blurShader.uniforms.intensityVol, 0)
    gl.uniform1f(blurShader.uniforms.dX, blurRadius / hdr.dims[1])
    gl.uniform1f(blurShader.uniforms.dY, blurRadius / hdr.dims[2])
    gl.uniform1f(blurShader.uniforms.dZ, blurRadius / hdr.dims[3])
    for (let i = 0; i < hdr.dims[3] - 1; i++) {
        const coordZ = (1 / hdr.dims[3]) * (i + 0.5)
        gl.uniform1f(blurShader.uniforms.coordZ, coordZ)
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tempTex3D, 0, i)
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            log.error('blur shader: ', status)
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    const sobelShader = gradientOrder === 2 ? sobelSecondOrderShader : sobelFirstOrderShader
    sobelShader.use(gl)
    gl.activeTexture(TEXTURE8_GRADIENT_TEMP)
    gl.bindTexture(gl.TEXTURE_3D, tempTex3D) // input texture
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.uniform1i(sobelShader.uniforms.intensityVol, 8) // TEXTURE8_GRADIENT_TEMP
    const sobelRadius = 0.7
    gl.uniform1f(sobelShader.uniforms.dX, sobelRadius / hdr.dims[1])
    gl.uniform1f(sobelShader.uniforms.dY, sobelRadius / hdr.dims[2])
    gl.uniform1f(sobelShader.uniforms.dZ, sobelRadius / hdr.dims[3])
    if (gradientOrder === 2) {
        gl.uniform1f(sobelShader.uniforms.dX2, (2.0 * sobelRadius) / hdr.dims[1])
        gl.uniform1f(sobelShader.uniforms.dY2, (2.0 * sobelRadius) / hdr.dims[2])
        gl.uniform1f(sobelShader.uniforms.dZ2, (2.0 * sobelRadius) / hdr.dims[3])
    }
    gl.uniform1f(sobelShader.uniforms.coordZ, 0.5)
    if (gradientTexture !== null) {
        gl.deleteTexture(gradientTexture)
    }
    gradientTexture = rgbaTex(gradientTexture, TEXTURE6_GRADIENT, hdr.dims)
    for (let i = 0; i < hdr.dims[3] - 1; i++) {
        const coordZ = (1 / hdr.dims[3]) * (i + 0.5)
        gl.uniform1f(sobelShader.uniforms.coordZ, coordZ)
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gradientTexture, 0, i)
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            log.error('sobel shader: ', status)
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    gl.deleteFramebuffer(fb)
    gl.deleteTexture(tempTex3D)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.activeTexture(33992) // TEXTURE8_PAQD
    gl.bindTexture(gl.TEXTURE_3D, paqdTexture) // input texture
    gl.bindVertexArray(unusedVAO)

    return gradientTexture!
}

/**
 * Parameters for getting gradient texture data
 */
export interface GetGradientTextureDataParams {
    gl: WebGL2RenderingContext
    gradientTexture: WebGLTexture | null
    dims: number[] | null
}

/**
 * Get the gradient texture produced by gradientGL as a TypedArray
 * @param params - Parameters containing GL context, gradient texture, and dimensions
 * @returns Float32Array containing the gradient texture data, or null if no gradient texture exists
 */
export function getGradientTextureData(params: GetGradientTextureDataParams): Float32Array | null {
    const { gl, gradientTexture, dims } = params

    if (!gradientTexture || !dims) {
        return null
    }

    const width = dims[1]
    const height = dims[2]
    const depth = dims[3]
    const numVoxels = width * height * depth

    // Create framebuffer to read from 3D texture
    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)

    // Create output array
    const data = new Float32Array(numVoxels * 4) // RGBA components

    try {
        // Read each slice of the 3D texture
        for (let slice = 0; slice < depth; slice++) {
            // Attach the current slice to the framebuffer
            gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gradientTexture, 0, slice)

            // Check framebuffer completeness
            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                console.warn('Framebuffer not complete for gradient texture reading, slice', slice, 'status:', status.toString(16))
                continue
            }

            // Read as UINT8 data (more compatible) and convert to float
            try {
                const byteData = new Uint8Array(width * height * 4)
                gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, byteData)

                // Convert from uint8 (0-255) to float (-1.0 to 1.0) range
                const sliceData = new Float32Array(width * height * 4)
                for (let i = 0; i < byteData.length; i++) {
                    sliceData[i] = byteData[i] / 127.5 - 1.0
                }

                // Copy slice data to output array
                const sliceOffset = slice * width * height * 4
                data.set(sliceData, sliceOffset)
            } catch (readError) {
                console.warn('Failed to read pixels for slice', slice, ':', readError)
                // Fill with zeros for this slice
                const sliceOffset = slice * width * height * 4
                const zeroSlice = new Float32Array(width * height * 4)
                data.set(zeroSlice, sliceOffset)
            }
        }
    } catch (error) {
        console.error('Error reading gradient texture:', error)
        return null
    } finally {
        // Cleanup
        gl.deleteFramebuffer(fb)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    return data
}

/**
 * Parameters for setting custom gradient texture
 */
export interface SetCustomGradientTextureParams {
    gl: WebGL2RenderingContext
    data: Float32Array | Uint8Array | null
    dims?: number[]
    backDims?: number[] | null
    gradientTexture: WebGLTexture | null
    gradientTextureAmount: number
    hdr?: NiftiHeader | null
    gradientGLFn?: (hdr: NiftiHeader) => void
}

/**
 * Result of setting custom gradient texture
 */
export interface SetCustomGradientTextureResult {
    gradientTexture: WebGLTexture | null
    useCustomGradientTexture: boolean
}

/**
 * Set a custom gradient texture to use instead of the one produced by gradientGL
 * @param params - Parameters containing GL context and texture data
 * @returns Object with new gradient texture and useCustomGradientTexture flag
 */
export function setCustomGradientTexture(params: SetCustomGradientTextureParams): SetCustomGradientTextureResult {
    const { gl, data, dims, backDims, gradientTextureAmount, hdr, gradientGLFn } = params
    let { gradientTexture } = params

    if (data === null) {
        // Revert to auto-generated gradient
        if (hdr && gradientTextureAmount > 0.0 && gradientGLFn) {
            gradientGLFn(hdr)
        }
        return {
            gradientTexture,
            useCustomGradientTexture: false
        }
    }

    if (!dims && !backDims) {
        console.warn('No dimensions provided and no background volume loaded')
        return {
            gradientTexture,
            useCustomGradientTexture: false
        }
    }

    const texDims = dims || backDims!
    const width = texDims[1]
    const height = texDims[2]
    const depth = texDims[3]
    const expectedSize = width * height * depth * 4

    if (data.length !== expectedSize) {
        console.warn(`Custom gradient data size mismatch. Expected ${expectedSize}, got ${data.length}`)
        return {
            gradientTexture,
            useCustomGradientTexture: false
        }
    }

    // Delete existing gradient texture
    if (gradientTexture !== null) {
        gl.deleteTexture(gradientTexture)
    }

    // Create new texture
    gradientTexture = gl.createTexture()
    gl.activeTexture(TEXTURE6_GRADIENT)
    gl.bindTexture(gl.TEXTURE_3D, gradientTexture)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

    // Convert float data to uint8 if needed and use RGBA8 format for better compatibility
    let textureData: Uint8Array
    if (data instanceof Float32Array) {
        // Convert float data (-1.0 to 1.0) to uint8 (0 to 255)
        textureData = new Uint8Array(data.length)
        for (let i = 0; i < data.length; i++) {
            // Clamp to -1.0 to 1.0, then map to 0-255
            const clampedValue = Math.max(-1.0, Math.min(1.0, data[i]))
            textureData[i] = Math.round((clampedValue + 1.0) * 127.5)
        }
    } else {
        // Data is already Uint8Array
        textureData = data
    }

    // Use RGBA8 format for better WebGL compatibility
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA8, width, height, depth)
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, width, height, depth, gl.RGBA, gl.UNSIGNED_BYTE, textureData)

    return {
        gradientTexture,
        useCustomGradientTexture: true
    }
}

/**
 * Parameters for drawing 3D image
 */
export interface DrawImage3DParams {
    gl: WebGL2RenderingContext
    mvpMatrix: mat4
    azimuth: number
    elevation: number
    volumesLength: number
    volumeObject3D: NiivueObject3D | null
    unusedVAO: WebGLVertexArrayObject
    renderShader: Shader
    pickingImageShader: Shader
    mouseDepthPicker: boolean
    backgroundMasksOverlays: number
    gradientTextureAmount: number
    gradientTexture: WebGLTexture | null
    drawBitmap: Uint8Array | null
    renderDrawAmbientOcclusion: number
    drawOpacity: number
    paqdUniforms: number[]
    matRAS: mat4
    crosshairPos: number[] | vec3
    clipPlaneDepthAziElevs: number[][]
    isClipPlanesCutaway: boolean
    obliqueRAS?: mat4 | null
}

/**
 * Render a 3D volume visualization of the current NVImage using provided transformation matrices and angles.
 * @param params - Parameters containing GL context and all required rendering state
 */
export function drawImage3D(params: DrawImage3DParams): void {
    const {
        gl,
        mvpMatrix,
        azimuth,
        elevation,
        volumesLength,
        volumeObject3D,
        unusedVAO,
        renderShader,
        pickingImageShader,
        mouseDepthPicker,
        backgroundMasksOverlays,
        gradientTextureAmount,
        gradientTexture,
        drawBitmap,
        renderDrawAmbientOcclusion,
        drawOpacity,
        paqdUniforms,
        matRAS,
        crosshairPos,
        clipPlaneDepthAziElevs,
        isClipPlanesCutaway,
        obliqueRAS
    } = params

    if (volumesLength === 0) {
        return
    }

    const rayDir = calculateRayDirection({ azimuth, elevation, obliqueRAS })
    const object3D = volumeObject3D
    if (object3D) {
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.enable(gl.CULL_FACE)
        gl.cullFace(gl.FRONT) // TH switch since we L/R flipped in calculateMvpMatrix
        let shader = renderShader
        if (mouseDepthPicker) {
            shader = pickingImageShader
        }
        shader.use(gl)
        gl.uniform1i(shader.uniforms.backgroundMasksOverlays, backgroundMasksOverlays)
        if (gradientTextureAmount > 0.0 && shader.uniforms.normMtx && gradientTexture) {
            gl.activeTexture(TEXTURE6_GRADIENT)
            gl.bindTexture(gl.TEXTURE_3D, gradientTexture)
            const modelMatrix = calculateModelMatrix({ azimuth, elevation, obliqueRAS })
            const iModelMatrix = mat4.create()
            mat4.invert(iModelMatrix, modelMatrix)
            const normalMatrix = mat4.create()
            mat4.transpose(normalMatrix, iModelMatrix)
            gl.uniformMatrix4fv(shader.uniforms.normMtx, false, normalMatrix)
        }
        if (drawBitmap && drawBitmap.length > 8) {
            gl.uniform2f(shader.uniforms.renderDrawAmbientOcclusionXY, renderDrawAmbientOcclusion, drawOpacity)
        } else {
            gl.uniform2f(shader.uniforms.renderDrawAmbientOcclusionXY, renderDrawAmbientOcclusion, 0.0)
        }
        gl.uniform4fv(shader.uniforms.paqdUniforms, paqdUniforms)
        gl.uniformMatrix4fv(shader.uniforms.mvpMtx, false, mvpMatrix)
        gl.uniformMatrix4fv(shader.uniforms.matRAS, false, matRAS)
        gl.uniform3fv(shader.uniforms.rayDir, rayDir)

        if (gradientTextureAmount < 0.0) {
            // use slice shader
            gl.uniform4fv(shader.uniforms.clipPlane, [crosshairPos[0], crosshairPos[1], crosshairPos[2], 30])
        } else {
            const MAX_CLIP_PLANES = 6
            // n.b. clipplane.a == 2.0 means no clipping
            const arr = new Float32Array(4 * MAX_CLIP_PLANES).fill(2.0)
            for (let i = 0; i < clipPlaneDepthAziElevs.length; i++) {
                const dae = clipPlaneDepthAziElevs[i]
                const v = sph2cartDeg(dae[1] + 180, dae[2])
                const planeI = [v[0], v[1], v[2], dae[0]]
                arr.set(planeI, i * 4)
            }
            gl.uniform4fv(shader.uniforms.clipPlanes, arr)
        }
        gl.uniform1f(shader.uniforms.drawOpacity, 1.0)
        gl.uniform1i(shader.uniforms.isClipCutaway, isClipPlanesCutaway ? 1 : 0)
        gl.bindVertexArray(object3D.vao)
        gl.drawElements(object3D.mode, object3D.indexCount, gl.UNSIGNED_SHORT, 0)
        gl.bindVertexArray(unusedVAO)
    }
}
