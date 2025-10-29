// nvrenderer.ts
import { mat4, vec3 } from 'gl-matrix'
import { NVMatrices } from './nvcomposer.js'
import { Shader } from '@/shader.js'
import { NiivueObject3D } from '@/niivue-object3D.js'
import { NVConfigOptions } from '@/nvdocument.js'

/**
 * Handles low-level GL drawing and state management.
 */
export class NVRenderer {
  gl: WebGL2RenderingContext
  config: NVConfigOptions
  private cachedRayDir: vec3 = vec3.fromValues(0, 0, -1)

  constructor(gl: WebGL2RenderingContext, config: NVConfigOptions) {
    this.gl = gl
    this.config = config

    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
  }

  /**
   * Draws an object using precomputed matrices.
   */
  //   render3D(matrices: NVMatrices, shader: Shader, object3D: NiivueObject3D): void {
  //     console.log('render 3D')
  //     if (!object3D?.vao) {
  //       console.log('no vao')
  //       return
  //     }
  //     console.log('object3D', object3D)
  //     const gl = this.gl
  //     shader.use(gl)

  //     gl.enable(gl.BLEND)
  //     gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  //     const det = mat4.determinant(matrices.model)
  //     if (det < 0) {
  //       console.log('setting front face as CW')
  //     } else {
  //       console.log('setting front face as CCW')
  //     }
  //     gl.frontFace(det < 0 ? gl.CW : gl.CCW)
  //     gl.clearDepth(1.0)
  //     gl.clear(gl.DEPTH_BUFFER_BIT)
  //     gl.depthFunc(gl.LESS)
  //     if (shader.uniforms.mvpMtx) {
  //       gl.uniformMatrix4fv(shader.uniforms.mvpMtx!, false, matrices.mvp)
  //     }
  //     if (shader.uniforms.normMtx) {
  //       gl.uniformMatrix3fv(shader.uniforms.normMtx!, false, matrices.normalMat3)
  //     }
  //     if (shader.uniforms.rayDir) {
  //       gl.uniform3fv(shader.uniforms.rayDir!, this.cachedRayDir)
  //     }

  //     gl.bindVertexArray(object3D.vao)
  //     gl.drawElements(object3D.mode ?? gl.TRIANGLES, object3D.indexCount ?? 0, gl.UNSIGNED_SHORT, 0)
  //     gl.bindVertexArray(null)
  //     gl.frontFace(gl.CCW)
  //   }
  render3D(matrices: NVMatrices, shader: Shader, object3D: NiivueObject3D): void {
    if (!object3D?.vao) {
      return
    }
    const gl = this.gl
    shader.use(gl)

    // Blending (enable only if needed for volume compositing)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // Culling: BACK is the common default. Use FRONT only if your volume technique expects front-face passes.
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)

    // Determine winding from the same model matrix used by drawImage3D
    // (you discovered det >= 0 => CW in your working path)
    const det = mat4.determinant(matrices.model)
    gl.frontFace(det >= 0 ? gl.CW : gl.CCW)

    // Depth: conventional setup. Ideally call these once at frame init.
    gl.clearDepth(1.0) // farthest
    // NOTE: clear once per-frame in a central place. If you must keep here, it's harmless.
    gl.clear(gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)

    // Upload uniforms
    if (shader.uniforms.mvpMtx) {
      gl.uniformMatrix4fv(shader.uniforms.mvpMtx!, false, matrices.mvp)
    }

    if (shader.uniforms.normMtx) {
      // Prefer sending a mat3 if shader expects mat3
      if (shader.uniforms.normMtxSize === 3 || /* your app tracks this */ false) {
        gl.uniformMatrix3fv(shader.uniforms.normMtx!, false, matrices.normalMat3)
      } else {
        // Expand mat3->mat4 for legacy shaders that expect mat4
        const nm4 = mat4.create()
        nm4[0] = matrices.normalMat3[0]
        nm4[1] = matrices.normalMat3[1]
        nm4[2] = matrices.normalMat3[2]
        nm4[4] = matrices.normalMat3[3]
        nm4[5] = matrices.normalMat3[4]
        nm4[6] = matrices.normalMat3[5]
        nm4[8] = matrices.normalMat3[6]
        nm4[9] = matrices.normalMat3[7]
        nm4[10] = matrices.normalMat3[8]
        nm4[15] = 1.0
        gl.uniformMatrix4fv(shader.uniforms.normMtx!, false, nm4)
      }
    }

    if (shader.uniforms.rayDir) {
      gl.uniform3fv(shader.uniforms.rayDir!, this.cachedRayDir)
    }

    // gl.disable(gl.DEPTH_TEST)
    // gl.disable(gl.CULL_FACE)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.frontFace(det >= 0 ? gl.CW : gl.CCW)
    // Draw
    gl.bindVertexArray(object3D.vao)
    gl.drawElements(object3D.mode ?? gl.TRIANGLES, object3D.indexCount ?? 0, gl.UNSIGNED_SHORT, 0)
    gl.cullFace(gl.FRONT)
    gl.frontFace(det >= 0 ? gl.CW : gl.CCW)
    gl.drawElements(object3D.mode ?? gl.TRIANGLES, object3D.indexCount ?? 0, gl.UNSIGNED_SHORT, 0)
    gl.bindVertexArray(null)

    // Optional: restore defaults
    gl.frontFace(gl.CCW)
  }
}
