/**
 * Mesh rendering helper functions for 3D mesh visualization.
 * This module provides pure functions for 3D mesh rendering operations.
 *
 * Related to: 3D mesh rendering, shader selection, fiber rendering, x-ray effects
 */

import { mat4, vec3 } from 'gl-matrix'
import { NVMesh } from '@/nvmesh'
import { Shader } from '@/shader'

// WebGL texture unit constants
const TEXTURE5_MATCAP = 33989 // gl.TEXTURE5

/**
 * Represents a shader entry for mesh rendering
 * Note: Uses capital 'Name' and 'Frag' to match existing data structure
 */
export interface MeshShaderEntry {
  Name: string
  Frag: string
  shader?: Shader | null
}

/**
 * Parameters for determining if a mesh should be rendered
 */
export interface ShouldRenderMeshParams {
  visible: boolean
  opacity: number
  indexCount: number
}

/**
 * Determine if a mesh should be rendered based on its properties.
 * @param params - Mesh visibility parameters
 * @returns Whether the mesh should be rendered
 */
export function shouldRenderMesh(params: ShouldRenderMeshParams): boolean {
  const { visible, opacity, indexCount } = params
  return visible && opacity > 0.0 && indexCount >= 3
}

/**
 * Parameters for selecting mesh shader
 */
export interface SelectMeshShaderParams {
  meshShaderIndex: number
  meshShaders: MeshShaderEntry[]
  pickingMeshShader: Shader | null
  mouseDepthPicker: boolean
}

/**
 * Select the appropriate shader for mesh rendering.
 * @param params - Shader selection parameters
 * @returns The shader to use for rendering
 */
export function selectMeshShader(params: SelectMeshShaderParams): Shader | null {
  const { meshShaderIndex, meshShaders, pickingMeshShader, mouseDepthPicker } = params
  if (mouseDepthPicker) {
    return pickingMeshShader
  }
  return meshShaders[meshShaderIndex]?.shader ?? null
}

/**
 * Parameters for calculating mesh alpha/opacity
 */
export interface CalculateMeshAlphaParams {
  meshOpacity: number
  globalAlpha: number
}

/**
 * Calculate the final alpha value for a mesh.
 * @param params - Alpha calculation parameters
 * @returns The combined alpha value
 */
export function calculateMeshAlpha(params: CalculateMeshAlphaParams): number {
  const { meshOpacity, globalAlpha } = params
  return meshOpacity * globalAlpha
}

/**
 * Parameters for determining if a mesh is a fiber mesh
 */
export interface IsFiberMeshParams {
  offsetPt0: number[] | Uint32Array | null | undefined
  fiberSides: number
  fiberRadius: number
}

/**
 * Determine if a mesh is a fiber (line-based) mesh.
 * @param params - Mesh fiber properties
 * @returns Whether the mesh is a fiber mesh
 */
export function isFiberMesh(params: IsFiberMeshParams): boolean {
  const { offsetPt0, fiberSides, fiberRadius } = params
  return !!offsetPt0 && (fiberSides < 3 || fiberRadius <= 0)
}

/**
 * Parameters for calculating crosscut slice position
 */
export interface CalculateCrosscutSliceParams {
  modelMtx: mat4
  crosshairMM: vec3 | number[]
  is2D: boolean
}

/**
 * Calculate the slice position for crosscut shader, handling 2D view occlusion.
 * @param params - Crosscut calculation parameters
 * @returns The mm coordinates with potential OUT_OF_RANGE values for 2D views
 */
export function calculateCrosscutSlice(params: CalculateCrosscutSliceParams): number[] {
  const { modelMtx, crosshairMM, is2D } = params
  const OUT_OF_RANGE = 1e9
  const mm = [crosshairMM[0], crosshairMM[1], crosshairMM[2]]

  if (is2D) {
    // Determine which axes to hide based on model matrix orientation
    // Check sagittal orientation
    if (Math.abs(modelMtx[2]) + Math.abs(modelMtx[4]) + Math.abs(modelMtx[9]) >= 2.95) {
      mm[1] = OUT_OF_RANGE
      mm[2] = OUT_OF_RANGE
    }
    // Check coronal orientation
    if (Math.abs(modelMtx[0]) + Math.abs(modelMtx[6]) + Math.abs(modelMtx[9]) >= 2.95) {
      mm[0] = OUT_OF_RANGE
      mm[2] = OUT_OF_RANGE
    }
    // Check axial orientation
    if (Math.abs(modelMtx[0]) + Math.abs(modelMtx[5]) + Math.abs(modelMtx[10]) >= 2.95) {
      mm[0] = OUT_OF_RANGE
      mm[1] = OUT_OF_RANGE
    }
  }

  return mm
}

/**
 * Get mesh thickness in mm, defaulting to 1.0 if invalid.
 * @param meshThicknessOn2D - The configured mesh thickness
 * @returns Valid mesh thickness value
 */
export function getMeshThickness(meshThicknessOn2D: number | string | undefined): number {
  let thickness = Number(meshThicknessOn2D)
  if (!Number.isFinite(thickness)) {
    thickness = 1.0
  }
  return thickness
}

/**
 * Parameters for configuring GL state for mesh rendering
 */
export interface ConfigureMeshGLStateParams {
  gl: WebGL2RenderingContext
  isDepthTest: boolean
  alpha: number
}

/**
 * Configure WebGL state for opaque or transparent mesh rendering.
 * @param params - GL state configuration parameters
 */
export function configureMeshGLState(params: ConfigureMeshGLStateParams): void {
  const { gl, isDepthTest, alpha } = params

  gl.enable(gl.DEPTH_TEST)

  if (isDepthTest) {
    gl.depthFunc(gl.LEQUAL)
  } else {
    gl.depthFunc(gl.ALWAYS)
  }

  gl.cullFace(gl.BACK)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  if (alpha >= 1.0) {
    // Opaque
    gl.disable(gl.BLEND)
    gl.depthMask(true)
  } else {
    // Transparent
    gl.enable(gl.BLEND)
    gl.depthMask(false)
  }
}

/**
 * Parameters for setting up crosscut shader
 */
export interface SetupCrosscutShaderParams {
  gl: WebGL2RenderingContext
  shader: Shader
  modelMtx: mat4
  sliceMM: number[]
  meshThickness: number
}

/**
 * Setup shader uniforms for crosscut rendering mode.
 * @param params - Crosscut shader setup parameters
 */
export function setupCrosscutShader(params: SetupCrosscutShaderParams): void {
  const { gl, shader, modelMtx, sliceMM, meshThickness } = params

  gl.disable(gl.DEPTH_TEST)
  gl.disable(gl.CULL_FACE)
  gl.uniformMatrix4fv(shader.uniforms.modelMtx, false, modelMtx)
  gl.uniform4fv(shader.uniforms.sliceMM, [sliceMM[0], sliceMM[1], sliceMM[2], meshThickness])
}

/**
 * Parameters for setting mesh shader uniforms
 */
export interface SetMeshUniformsParams {
  gl: WebGL2RenderingContext
  shader: Shader
  mvpMtx: mat4
  normMtx: mat4
  opacity: number
}

/**
 * Set common shader uniforms for mesh rendering.
 * @param params - Uniform setup parameters
 */
export function setMeshUniforms(params: SetMeshUniformsParams): void {
  const { gl, shader, mvpMtx, normMtx, opacity } = params
  gl.uniformMatrix4fv(shader.uniforms.mvpMtx, false, mvpMtx)
  gl.uniformMatrix4fv(shader.uniforms.normMtx, false, normMtx)
  gl.uniform1f(shader.uniforms.opacity, opacity)
}

/**
 * Parameters for binding matcap texture
 */
export interface BindMatcapTextureParams {
  gl: WebGL2RenderingContext
  matCapTexture: WebGLTexture | null
}

/**
 * Bind the matcap texture for matcap shader rendering.
 * @param params - Matcap binding parameters
 */
export function bindMatcapTexture(params: BindMatcapTextureParams): void {
  const { gl, matCapTexture } = params
  gl.activeTexture(TEXTURE5_MATCAP)
  gl.bindTexture(gl.TEXTURE_2D, matCapTexture)
}

/**
 * Parameters for drawing a single mesh
 */
export interface DrawSingleMeshParams {
  gl: WebGL2RenderingContext
  mesh: NVMesh
  unusedVAO: WebGLVertexArrayObject
}

/**
 * Draw a single mesh using its VAO.
 * @param params - Mesh drawing parameters
 */
export function drawSingleMesh(params: DrawSingleMeshParams): void {
  const { gl, mesh, unusedVAO } = params
  gl.bindVertexArray(mesh.vao)
  gl.drawElements(gl.TRIANGLES, mesh.indexCount!, gl.UNSIGNED_INT, 0)
  gl.bindVertexArray(unusedVAO)
}

/**
 * Parameters for drawing fiber mesh
 */
export interface DrawFiberMeshParams {
  gl: WebGL2RenderingContext
  mesh: NVMesh
  unusedVAO: WebGLVertexArrayObject
}

/**
 * Draw a fiber mesh using line strips.
 * @param params - Fiber mesh drawing parameters
 */
export function drawFiberMesh(params: DrawFiberMeshParams): void {
  const { gl, mesh, unusedVAO } = params
  gl.bindVertexArray(mesh.vaoFiber)
  gl.drawElements(gl.LINE_STRIP, mesh.indexCount!, gl.UNSIGNED_INT, 0)
  gl.bindVertexArray(unusedVAO)
}

/**
 * Parameters for X-ray mesh pass
 */
export interface ConfigureXRayPassParams {
  gl: WebGL2RenderingContext
}

/**
 * Configure GL state for X-ray mesh rendering pass.
 * @param params - X-ray configuration parameters
 */
export function configureXRayPass(params: ConfigureXRayPassParams): void {
  const { gl } = params
  gl.enable(gl.BLEND)
  gl.depthMask(false)
  gl.depthFunc(gl.ALWAYS)
}

/**
 * Reset GL state after X-ray pass.
 * @param gl - WebGL context
 */
export function resetAfterXRayPass(gl: WebGL2RenderingContext): void {
  gl.depthMask(true)
  gl.depthFunc(gl.LEQUAL)
  gl.disable(gl.BLEND)
}

/**
 * Reset GL state after mesh rendering.
 * @param gl - WebGL context
 */
export function resetMeshGLState(gl: WebGL2RenderingContext): void {
  gl.depthMask(true)
  gl.disable(gl.BLEND)
}

/**
 * Parameters for the full mesh 3D rendering pass
 */
export interface DrawMesh3DParams {
  gl: WebGL2RenderingContext
  meshes: NVMesh[]
  isDepthTest: boolean
  alpha: number
  mvpMatrix: mat4
  modelMatrix: mat4
  normalMatrix: mat4
  is2D: boolean
  meshShaders: MeshShaderEntry[]
  pickingMeshShader: Shader | null
  fiberShader: Shader | null
  mouseDepthPicker: boolean
  matCapTexture: WebGLTexture | null
  unusedVAO: WebGLVertexArrayObject
  meshXRay: number
  meshThicknessOn2D: number | string | undefined
  frac2mm: (pos: number[]) => number[] | vec3 | Float32Array
  crosshairPos: number[] | vec3
}

/**
 * Render all visible 3D meshes with proper blending, depth, and shader settings.
 * @param params - Full mesh rendering parameters
 */
export function drawMesh3D(params: DrawMesh3DParams): void {
  const {
    gl,
    meshes,
    isDepthTest,
    alpha,
    mvpMatrix,
    modelMatrix,
    normalMatrix,
    is2D,
    meshShaders,
    pickingMeshShader,
    fiberShader,
    mouseDepthPicker,
    matCapTexture,
    unusedVAO,
    meshXRay,
    meshThicknessOn2D,
    frac2mm,
    crosshairPos
  } = params

  if (meshes.length < 1) {
    return
  }

  gl.enable(gl.DEPTH_TEST)

  // Use inverted depth convention
  if (isDepthTest) {
    gl.depthFunc(gl.LEQUAL)
  } else {
    gl.depthFunc(gl.ALWAYS)
  }

  gl.cullFace(gl.BACK)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  let hasFibers = false

  // -----------------------
  // Pass 1: Main mesh draw
  // -----------------------
  for (const mesh of meshes) {
    if (!shouldRenderMesh({ visible: mesh.visible, opacity: mesh.opacity, indexCount: mesh.indexCount! })) {
      continue
    }

    const meshAlpha = calculateMeshAlpha({ meshOpacity: mesh.opacity, globalAlpha: alpha })

    // Select shader
    const shader = selectMeshShader({
      meshShaderIndex: mesh.meshShaderIndex,
      meshShaders,
      pickingMeshShader,
      mouseDepthPicker
    })

    if (!shader) {
      continue
    }

    shader.use(gl)

    if (shader.isCrosscut) {
      const mm = frac2mm([crosshairPos[0], crosshairPos[1], crosshairPos[2]])
      const sliceMM = calculateCrosscutSlice({ modelMtx: modelMatrix, crosshairMM: mm, is2D })
      const thickness = getMeshThickness(meshThicknessOn2D)
      setupCrosscutShader({ gl, shader, modelMtx: modelMatrix, sliceMM, meshThickness: thickness })
    } else {
      gl.enable(gl.CULL_FACE)
      gl.enable(gl.DEPTH_TEST)
    }

    // Set uniforms
    setMeshUniforms({ gl, shader, mvpMtx: mvpMatrix, normMtx: normalMatrix, opacity: meshAlpha })

    // Depth + blending per mesh
    if (meshAlpha >= 1.0) {
      gl.disable(gl.BLEND)
      gl.depthMask(true)
    } else {
      gl.enable(gl.BLEND)
      gl.depthMask(false)
    }

    // Fiber meshes drawn later
    if (isFiberMesh({ offsetPt0: mesh.offsetPt0, fiberSides: mesh.fiberSides, fiberRadius: mesh.fiberRadius })) {
      hasFibers = true
      continue
    }

    if (shader.isMatcap) {
      bindMatcapTexture({ gl, matCapTexture })
    }

    // Draw mesh
    drawSingleMesh({ gl, mesh, unusedVAO })
  }

  gl.enable(gl.CULL_FACE)

  // -----------------------
  // Pass 2: X-Ray Mesh
  // -----------------------
  if (meshXRay > 0.0 && !hasFibers) {
    configureXRayPass({ gl })

    for (const mesh of meshes) {
      if (!mesh.visible || mesh.indexCount! < 3) {
        continue
      }

      const shader = meshShaders[mesh.meshShaderIndex]?.shader
      if (!shader) {
        continue
      }

      shader.use(gl)

      setMeshUniforms({
        gl,
        shader,
        mvpMtx: mvpMatrix,
        normMtx: normalMatrix,
        opacity: mesh.opacity * alpha * meshXRay
      })

      drawSingleMesh({ gl, mesh, unusedVAO })
    }

    resetAfterXRayPass(gl)
  }

  // -----------------------
  // Pass 3: Fibers
  // -----------------------
  if (hasFibers && fiberShader) {
    fiberShader.use(gl)
    gl.uniformMatrix4fv(fiberShader.uniforms.mvpMtx, false, mvpMatrix)
    gl.uniform1f(fiberShader.uniforms.opacity, alpha)

    for (const mesh of meshes) {
      if (!mesh.offsetPt0) {
        continue
      }
      if (mesh.fiberSides >= 3 && mesh.fiberRadius > 0) {
        continue // cylinders already drawn
      }

      drawFiberMesh({ gl, mesh, unusedVAO })
    }
  }

  // Restore defaults
  resetMeshGLState(gl)
}
