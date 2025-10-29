// nvtransform.ts
import { mat3, mat4, vec3 } from 'gl-matrix'

/**
 * Handles object-space transforms and normal matrix computation.
 */
export class NVTransform {
  /**
   * Compute the model matrix for a given object.
   */
  computeModelMatrix(
    azimuth: number,
    elevation: number,
    flipX = false,
    pushAway = -1.8,
    position?: [number, number, number] | vec3,
    pivot?: [number, number, number] | vec3
  ): mat4 {
    const model = mat4.create()

    if (flipX) {
      mat4.scale(model, model, [-1, 1, 1])
    }
    mat4.translate(model, model, [0, 0, pushAway])
    if (position) {
      mat4.translate(model, model, position)
    }

    mat4.rotateX(model, model, this.deg2rad(270 - elevation))
    mat4.rotateZ(model, model, this.deg2rad(azimuth - 180))
    if (pivot) {
      mat4.translate(model, model, [-pivot[0], -pivot[1], -pivot[2]])
    }

    return model
  }

  /**
   * Compute a 3x3 normal matrix from a 4x4 model or modelView matrix.
   */
  computeNormalMat3(matrix4: mat4): mat3 {
    const normal = mat3.create()
    mat3.normalFromMat4(normal, matrix4)
    return normal
  }

  private deg2rad(d: number): number {
    return (d * Math.PI) / 180.0
  }
}
