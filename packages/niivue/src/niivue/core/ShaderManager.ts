/**
 * Shader management functions for WebGL shader compilation, initialization, and lifecycle.
 * This module provides pure functions for shader operations without class instantiation overhead.
 */

import { Shader } from '@/shader'
import {
    vertSliceMMShader,
    vertMeshShader,
    gradientOpacityLutCount,
    vertOrientCubeShader,
    fragOrientCubeShader,
    fragSlice2DShader,
    fragSliceMMShader,
    fragSliceV1Shader,
    vertRectShader,
    fragRectShader,
    fragRectOutlineShader,
    vertLineShader,
    vertLine3DShader,
    vertCircleShader,
    fragCircleShader,
    vertRenderShader,
    fragRenderShader,
    fragRenderSliceShader,
    fragRenderGradientShader,
    fragRenderGradientValuesShader,
    vertColorbarShader,
    fragColorbarShader,
    blurVertShader,
    blurFragShader,
    sobelBlurFragShader,
    sobelFirstOrderFragShader,
    sobelSecondOrderFragShader,
    vertGrowCutShader,
    fragGrowCutShader,
    vertPassThroughShader,
    fragPassThroughShader,
    vertOrientShader,
    fragOrientShaderU,
    fragOrientShaderI,
    fragOrientShaderF,
    fragOrientShader,
    fragOrientShaderAtlas,
    fragRGBOrientShader,
    fragPAQDOrientShader,
    vertFiberShader,
    fragFiberShader,
    vertSurfaceShader,
    fragSurfaceShader,
    fragVolumePickingShader,
    vertFlatMeshShader,
    fragFlatMeshShader,
    fragMeshShader,
    fragMeshToonShader,
    fragMeshMatcapShader,
    fragMeshOutlineShader,
    fragMeshEdgeShader,
    fragMeshRimShader,
    fragMeshContourShader,
    fragCrosscutMeshShader,
    fragMeshShaderCrevice,
    fragMeshDiffuseEdgeShader,
    fragMeshHemiShader,
    fragMeshMatteShader,
    fragMeshShaderSHBlue,
    fragMeshSpecularEdgeShader
} from '@/shader-srcs'

/**
 * Shader collection containing all rendering shaders
 */
export interface ShaderSet {
    sliceMMShader: Shader
    slice2DShader: Shader
    sliceV1Shader: Shader
    orientCubeShader: Shader
    rectShader: Shader
    rectOutlineShader: Shader
    lineShader: Shader
    line3DShader: Shader
    circleShader: Shader
    renderVolumeShader: Shader
    renderSliceShader: Shader
    renderGradientShader: Shader
    renderGradientValuesShader: Shader
    colorbarShader: Shader
    blurShader: Shader
    sobelBlurShader: Shader
    sobelFirstOrderShader: Shader
    sobelSecondOrderShader: Shader
    growCutShader: Shader
    passThroughShader: Shader
    orientShaderAtlasU: Shader
    orientShaderAtlasI: Shader
    orientShaderU: Shader
    orientShaderI: Shader
    orientShaderF: Shader
    orientShaderRGBU: Shader
    orientShaderPAQD: Shader
    surfaceShader: Shader
    fiberShader: Shader
    pickingImageShader: Shader
    bmpShader: Shader
    fontShader: Shader | null
}

/**
 * Mesh shader definition
 */
export interface MeshShaderDef {
    Name: string
    Frag: string
    shader?: Shader
}

/**
 * Parameters for initializing render shaders
 */
export interface InitRenderShaderParams {
    gl: WebGL2RenderingContext
    shader: Shader
    gradientAmount?: number
    renderDrawAmbientOcclusion: number
    renderSilhouette: number
    gradientOpacity: number
}

/**
 * Parameters for setting custom slice shader
 */
export interface SetCustomSliceShaderParams {
    gl: WebGL2RenderingContext
    fragmentShaderText: string
    drawOpacity: number
    customSliceShader: Shader | null
}

/**
 * Parameters for creating custom mesh shader
 */
export interface CreateCustomMeshShaderParams {
    gl: WebGL2RenderingContext
    fragmentShaderText: string
    name: string
    meshShaders: MeshShaderDef[]
}

/**
 * Initialize the default mesh shader definitions array
 * @returns Array of mesh shader definitions
 */
export function createDefaultMeshShaders(): MeshShaderDef[] {
    return [
        {
            Name: 'Phong',
            Frag: fragMeshShader
        },
        {
            Name: 'Matte',
            Frag: fragMeshMatteShader
        },
        {
            Name: 'Harmonic',
            Frag: fragMeshShaderSHBlue
        },
        {
            Name: 'Hemispheric',
            Frag: fragMeshHemiShader
        },
        {
            Name: 'Crevice',
            Frag: fragMeshShaderCrevice
        },
        {
            Name: 'Edge',
            Frag: fragMeshEdgeShader
        },
        {
            Name: 'Diffuse',
            Frag: fragMeshDiffuseEdgeShader
        },
        {
            Name: 'Outline',
            Frag: fragMeshOutlineShader
        },
        {
            Name: 'Specular',
            Frag: fragMeshSpecularEdgeShader
        },
        {
            Name: 'Toon',
            Frag: fragMeshToonShader
        },
        {
            Name: 'Flat',
            Frag: fragFlatMeshShader
        },
        {
            Name: 'Matcap',
            Frag: fragMeshMatcapShader
        },
        {
            Name: 'Rim',
            Frag: fragMeshRimShader
        },
        {
            Name: 'Silhouette',
            Frag: fragMeshContourShader
        },
        {
            Name: 'Crosscut',
            Frag: fragCrosscutMeshShader
        }
    ]
}

/**
 * Initialize a rendering shader with texture units and uniforms
 * @param params - Configuration parameters for shader initialization
 */
export function initRenderShader(params: InitRenderShaderParams): void {
    const { gl, shader, gradientAmount = 0.0, renderDrawAmbientOcclusion, renderSilhouette, gradientOpacity } = params

    shader.use(gl)
    gl.uniform1i(shader.uniforms.volume, 0)
    gl.uniform1i(shader.uniforms.colormap, 1)
    gl.uniform1i(shader.uniforms.overlay, 2)
    gl.uniform1i(shader.uniforms.drawing, 7)
    gl.uniform1i(shader.uniforms.paqd, 8) // TEXTURE8_PAQD
    gl.uniform1fv(shader.uniforms.renderDrawAmbientOcclusion, [renderDrawAmbientOcclusion, 1.0])
    gl.uniform1f(shader.uniforms.gradientAmount, gradientAmount)
    gl.uniform1f(shader.uniforms.silhouettePower, renderSilhouette)

    const gradientOpacityLut = new Float32Array(gradientOpacityLutCount)
    for (let i = 0; i < gradientOpacityLutCount; i++) {
        if (gradientOpacity === 0.0) {
            gradientOpacityLut[i] = 1.0
        } else {
            gradientOpacityLut[i] = Math.pow(i / (gradientOpacityLutCount - 1.0), gradientOpacity * 8.0)
        }
    }
    gl.uniform1fv(gl.getUniformLocation(shader.program, 'gradientOpacity'), gradientOpacityLut)
    shader.uniforms.clipPlanes = gl.getUniformLocation(shader.program, 'clipPlanes[0]')
}

/**
 * Create a custom slice shader for 2D slice rendering
 * @param params - Parameters for custom slice shader creation
 * @returns New custom shader or null if fragmentShaderText is empty
 */
export function setCustomSliceShader(params: SetCustomSliceShaderParams): Shader | null {
    const { gl, fragmentShaderText, drawOpacity, customSliceShader } = params

    // If there's an existing custom shader, delete it
    if (customSliceShader) {
        gl.deleteProgram(customSliceShader.program)
    }

    // If empty string, return null to fall back to default shader
    if (!fragmentShaderText) {
        return null
    }

    // Create new custom shader
    const shader = new Shader(gl, vertSliceMMShader, fragmentShaderText)
    shader.use(gl)
    gl.uniform1i(shader.uniforms.volume, 0)
    gl.uniform1i(shader.uniforms.colormap, 1)
    gl.uniform1i(shader.uniforms.overlay, 2)
    gl.uniform1i(shader.uniforms.drawing, 7)
    gl.uniform1i(shader.uniforms.paqd, 8) // TEXTURE8_PAQD
    gl.uniform1f(shader.uniforms.drawOpacity, drawOpacity)

    return shader
}

/**
 * Find the index of a mesh shader by name
 * @param meshShaderName - Name of the shader to find
 * @param meshShaders - Array of mesh shader definitions
 * @returns Index of the shader, or undefined if not found
 */
export function meshShaderNameToNumber(meshShaderName: string, meshShaders: MeshShaderDef[]): number | undefined {
    const name = meshShaderName.toLowerCase()
    for (let i = 0; i < meshShaders.length; i++) {
        if (meshShaders[i].Name.toLowerCase() === name) {
            return i
        }
    }
    return undefined
}

/**
 * Create a custom mesh shader with the specified fragment shader code
 * @param params - Parameters for custom mesh shader creation
 * @returns Mesh shader definition object
 */
export function createCustomMeshShader(params: CreateCustomMeshShaderParams): MeshShaderDef {
    const { gl, fragmentShaderText, name, meshShaders } = params

    if (!fragmentShaderText) {
        throw new Error('Need fragment shader')
    }

    // Check if a shader with this name already exists
    const existingIndex = meshShaderNameToNumber(name, meshShaders)
    if (existingIndex !== undefined && existingIndex >= 0) {
        // Prior shader uses this name: delete it!
        const existingShader = meshShaders[existingIndex].shader
        if (existingShader) {
            gl.deleteProgram(existingShader.program)
        }
        meshShaders.splice(existingIndex, 1)
    }

    const shader = new Shader(gl, vertMeshShader, fragmentShaderText)
    shader.use(gl)

    return {
        Name: name,
        Frag: fragmentShaderText,
        shader
    }
}

/**
 * Get list of all mesh shader names
 * @param meshShaders - Array of mesh shader definitions
 * @param sort - Whether to sort alphabetically
 * @returns Array of shader names
 */
export function meshShaderNames(meshShaders: MeshShaderDef[], sort = true): string[] {
    const names = meshShaders.map((shader) => shader.Name)
    return sort ? names.sort() : names
}

/**
 * Initialize all core slice shaders
 * @param gl - WebGL2 rendering context
 * @param drawOpacity - Drawing opacity value
 * @returns Object containing initialized slice shaders
 */
export function initSliceShaders(
    gl: WebGL2RenderingContext,
    drawOpacity: number
): {
    slice2DShader: Shader
    sliceMMShader: Shader
    sliceV1Shader: Shader
} {
    // slice 2D shader
    const slice2DShader = new Shader(gl, vertSliceMMShader, fragSlice2DShader)
    slice2DShader.use(gl)
    gl.uniform1i(slice2DShader.uniforms.volume, 0)
    gl.uniform1i(slice2DShader.uniforms.colormap, 1)
    gl.uniform1i(slice2DShader.uniforms.overlay, 2)
    gl.uniform1i(slice2DShader.uniforms.drawing, 7)
    gl.uniform1f(slice2DShader.uniforms.drawOpacity, drawOpacity)

    // slice mm shader
    const sliceMMShader = new Shader(gl, vertSliceMMShader, fragSliceMMShader)
    sliceMMShader.use(gl)
    gl.uniform1i(sliceMMShader.uniforms.volume, 0)
    gl.uniform1i(sliceMMShader.uniforms.colormap, 1)
    gl.uniform1i(sliceMMShader.uniforms.overlay, 2)
    gl.uniform1i(sliceMMShader.uniforms.drawing, 7)
    gl.uniform1f(sliceMMShader.uniforms.drawOpacity, drawOpacity)

    // slice V1 shader
    const sliceV1Shader = new Shader(gl, vertSliceMMShader, fragSliceV1Shader)
    sliceV1Shader.use(gl)
    gl.uniform1i(sliceV1Shader.uniforms.volume, 0)
    gl.uniform1i(sliceV1Shader.uniforms.colormap, 1)
    gl.uniform1i(sliceV1Shader.uniforms.overlay, 2)
    gl.uniform1i(sliceV1Shader.uniforms.drawing, 7)
    gl.uniform1f(sliceV1Shader.uniforms.drawOpacity, drawOpacity)

    return { slice2DShader, sliceMMShader, sliceV1Shader }
}

/**
 * Initialize orientation cube shader and VAO
 * @param gl - WebGL2 rendering context
 * @param orientCube - Vertex data for orientation cube
 * @param unusedVAO - Unused VAO to restore after setup
 * @returns Object containing shader and VAO
 */
export function initOrientCubeShader(gl: WebGL2RenderingContext, orientCube: Float32Array, unusedVAO: WebGLVertexArrayObject | null): { shader: Shader; vao: WebGLVertexArrayObject } {
    const shader = new Shader(gl, vertOrientCubeShader, fragOrientCubeShader)
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)

    // Create a buffer
    const positionBuffer = gl.createBuffer()
    gl.enableVertexAttribArray(0)
    gl.enableVertexAttribArray(1)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, orientCube, gl.STATIC_DRAW)

    // XYZ position: (three floats)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
    // RGB color: (also three floats)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
    gl.bindVertexArray(unusedVAO)

    return { shader, vao }
}

/**
 * Initialize basic 2D rendering shaders (rect, line, circle)
 * @param gl - WebGL2 rendering context
 * @returns Object containing initialized 2D shaders
 */
export function init2DShaders(gl: WebGL2RenderingContext): {
    rectShader: Shader
    rectOutlineShader: Shader
    lineShader: Shader
    line3DShader: Shader
    circleShader: Shader
} {
    const rectShader = new Shader(gl, vertRectShader, fragRectShader)
    rectShader.use(gl)

    const rectOutlineShader = new Shader(gl, vertRectShader, fragRectOutlineShader)
    rectOutlineShader.use(gl)

    const lineShader = new Shader(gl, vertLineShader, fragRectShader)
    lineShader.use(gl)

    const line3DShader = new Shader(gl, vertLine3DShader, fragRectShader)
    line3DShader.use(gl)

    const circleShader = new Shader(gl, vertCircleShader, fragCircleShader)
    circleShader.use(gl)

    return { rectShader, rectOutlineShader, lineShader, line3DShader, circleShader }
}

/**
 * Initialize 3D volume rendering shaders
 * @param params - Initialization parameters
 * @returns Object containing initialized volume rendering shaders and active shader reference
 */
export function initVolumeRenderShaders(params: { gl: WebGL2RenderingContext; renderDrawAmbientOcclusion: number; renderSilhouette: number; gradientOpacity: number }): {
    renderVolumeShader: Shader
    renderSliceShader: Shader
    renderGradientShader: Shader
    renderGradientValuesShader: Shader
    renderShader: Shader
} {
    const { gl, renderDrawAmbientOcclusion, renderSilhouette, gradientOpacity } = params

    const renderVolumeShader = new Shader(gl, vertRenderShader, fragRenderShader)
    initRenderShader({ gl, shader: renderVolumeShader, renderDrawAmbientOcclusion, renderSilhouette, gradientOpacity })

    const renderSliceShader = new Shader(gl, vertRenderShader, fragRenderSliceShader)
    initRenderShader({ gl, shader: renderSliceShader, renderDrawAmbientOcclusion, renderSilhouette, gradientOpacity })

    const renderGradientShader = new Shader(gl, vertRenderShader, fragRenderGradientShader)
    initRenderShader({
        gl,
        shader: renderGradientShader,
        gradientAmount: 0.3,
        renderDrawAmbientOcclusion,
        renderSilhouette,
        gradientOpacity
    })
    gl.uniform1i(renderGradientShader.uniforms.matCap, 5)
    gl.uniform1i(renderGradientShader.uniforms.gradient, 6)

    const renderGradientValuesShader = new Shader(gl, vertRenderShader, fragRenderGradientValuesShader)
    initRenderShader({
        gl,
        shader: renderGradientValuesShader,
        renderDrawAmbientOcclusion,
        renderSilhouette,
        gradientOpacity
    })
    gl.uniform1i(renderGradientValuesShader.uniforms.matCap, 5)
    gl.uniform1i(renderGradientValuesShader.uniforms.gradient, 6)

    return {
        renderVolumeShader,
        renderSliceShader,
        renderGradientShader,
        renderGradientValuesShader,
        renderShader: renderVolumeShader
    }
}

/**
 * Initialize colorbar shader
 * @param gl - WebGL2 rendering context
 * @returns Initialized colorbar shader
 */
export function initColorbarShader(gl: WebGL2RenderingContext): Shader {
    const shader = new Shader(gl, vertColorbarShader, fragColorbarShader)
    shader.use(gl)
    gl.uniform1i(shader.uniforms.colormap, 1)
    return shader
}

/**
 * Initialize image processing shaders (blur, sobel, etc.)
 * @param gl - WebGL2 rendering context
 * @returns Object containing initialized image processing shaders
 */
export function initImageProcessingShaders(gl: WebGL2RenderingContext): {
    blurShader: Shader
    sobelBlurShader: Shader
    sobelFirstOrderShader: Shader
    sobelSecondOrderShader: Shader
    growCutShader: Shader
    passThroughShader: Shader
} {
    const blurShader = new Shader(gl, blurVertShader, blurFragShader)
    const sobelBlurShader = new Shader(gl, blurVertShader, sobelBlurFragShader)
    const sobelFirstOrderShader = new Shader(gl, blurVertShader, sobelFirstOrderFragShader)
    const sobelSecondOrderShader = new Shader(gl, blurVertShader, sobelSecondOrderFragShader)
    const growCutShader = new Shader(gl, vertGrowCutShader, fragGrowCutShader)
    const passThroughShader = new Shader(gl, vertPassThroughShader, fragPassThroughShader)

    return {
        blurShader,
        sobelBlurShader,
        sobelFirstOrderShader,
        sobelSecondOrderShader,
        growCutShader,
        passThroughShader
    }
}

/**
 * Initialize orientation overlay shaders
 * @param gl - WebGL2 rendering context
 * @returns Object containing initialized orientation shaders
 */
export function initOrientationShaders(gl: WebGL2RenderingContext): {
    orientShaderAtlasU: Shader
    orientShaderAtlasI: Shader
    orientShaderU: Shader
    orientShaderI: Shader
    orientShaderF: Shader
    orientShaderRGBU: Shader
    orientShaderPAQD: Shader
} {
    const orientShaderAtlasU = new Shader(gl, vertOrientShader, fragOrientShaderU.concat(fragOrientShaderAtlas))
    const orientShaderAtlasI = new Shader(gl, vertOrientShader, fragOrientShaderI.concat(fragOrientShaderAtlas))
    const orientShaderU = new Shader(gl, vertOrientShader, fragOrientShaderU.concat(fragOrientShader))
    const orientShaderI = new Shader(gl, vertOrientShader, fragOrientShaderI.concat(fragOrientShader))
    const orientShaderF = new Shader(gl, vertOrientShader, fragOrientShaderF.concat(fragOrientShader))
    const orientShaderRGBU = new Shader(gl, vertOrientShader, fragOrientShaderU.concat(fragRGBOrientShader))
    const orientShaderPAQD = new Shader(gl, vertOrientShader, fragOrientShaderU.concat(fragPAQDOrientShader))

    return {
        orientShaderAtlasU,
        orientShaderAtlasI,
        orientShaderU,
        orientShaderI,
        orientShaderF,
        orientShaderRGBU,
        orientShaderPAQD
    }
}

/**
 * Initialize 3D geometry shaders (surface, fiber)
 * @param gl - WebGL2 rendering context
 * @returns Object containing initialized geometry shaders
 */
export function init3DGeometryShaders(gl: WebGL2RenderingContext): {
    surfaceShader: Shader
    fiberShader: Shader
} {
    const surfaceShader = new Shader(gl, vertSurfaceShader, fragSurfaceShader)
    surfaceShader.use(gl)

    const fiberShader = new Shader(gl, vertFiberShader, fragFiberShader)

    return { surfaceShader, fiberShader }
}

/**
 * Initialize picking shader for volume selection
 * @param gl - WebGL2 rendering context
 * @returns Initialized picking shader
 */
export function initPickingImageShader(gl: WebGL2RenderingContext): Shader {
    const shader = new Shader(gl, vertRenderShader, fragVolumePickingShader)
    shader.use(gl)
    shader.uniforms.clipPlanes = gl.getUniformLocation(shader.program, 'clipPlanes[0]')
    gl.uniform1i(shader.uniforms.volume, 0)
    gl.uniform1i(shader.uniforms.colormap, 1)
    gl.uniform1i(shader.uniforms.overlay, 2)
    gl.uniform1i(shader.uniforms.drawing, 7)
    return shader
}

/**
 * Compile all mesh shaders from definitions array
 * @param gl - WebGL2 rendering context
 * @param meshShaders - Array of mesh shader definitions
 */
export function compileMeshShaders(gl: WebGL2RenderingContext, meshShaders: MeshShaderDef[]): void {
    for (let i = 0; i < meshShaders.length; i++) {
        const m = meshShaders[i]
        if (m.Name === 'Flat') {
            m.shader = new Shader(gl, vertFlatMeshShader, fragFlatMeshShader)
        } else {
            m.shader = new Shader(gl, vertMeshShader, m.Frag)
        }
        m.shader.use(gl)
        m.shader.isCrosscut = m.Name === 'Crosscut'
        m.shader.isMatcap = m.Name === 'Matcap'
        if (m.shader.isMatcap) {
            gl.uniform1i(m.shader.uniforms.matCap, 5)
        }
    }
}
