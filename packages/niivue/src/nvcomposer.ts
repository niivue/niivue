// nvcomposer.ts
import { mat3, mat4, vec3 } from 'gl-matrix'
import { NVCamera, RectLTWH } from './nvcamera.js'
import { NVTransform } from './nvtransform.js'
import { NVConfigOptions } from '@/nvdocument.js'

/**
 * Container for combined transformation matrices used in rendering.
 */
export interface NVMatrices {
  mvp: mat4
  model: mat4
  normalMat3: mat3
}

/**
 * NVComposer
 * -----------
 * Combines projection and model transforms into complete matrix sets
 * (MVP, Model, Normal) for rendering. This is the glue between the
 * camera and transform subsystems.
 */
export class NVComposer {
  camera: NVCamera
  transform: NVTransform

  constructor() {
    this.camera = new NVCamera()
    this.transform = new NVTransform()
  }

  /**
   * Builds a consistent set of matrices for rendering.
   *
   * @param ltwh - Viewport rectangle [x, y, w, h] in pixels
   * @param azimuth - Rotation around Z axis in degrees
   * @param elevation - Rotation around X axis in degrees
   * @param flipX - Mirror X axis (radiological convention)
   * @param furthestFromPivot - Used to determine projection scale
   * @param volScaleMultiplier - Scene scale multiplier
   * @param opts - Configuration options (passed through if needed)
   * @param position - Optional model translation
   * @param pivot - Optional model pivot offset
   * @returns {NVMatrices} mvp, model, and normalMat3
   */
  buildMatrices(
    ltwh: RectLTWH,
    azimuth: number,
    elevation: number,
    flipX: boolean,
    furthestFromPivot: number,
    volScaleMultiplier: number,
    opts?: NVConfigOptions,
    position?: [number, number, number] | vec3,
    pivot?: [number, number, number] | vec3
  ): NVMatrices {
    // 1. Compute orthographic projection
    const projection = this.camera.computeProjectionMatrix(ltwh, furthestFromPivot, volScaleMultiplier, opts)

    // 2. Compute object-space model transform
    const model = this.transform.computeModelMatrix(azimuth, elevation, flipX, -1.8, position, pivot)

    // 3. Combine: MVP = Projection * Model (no separate view)
    const mvp = mat4.create()
    mat4.multiply(mvp, projection, model)

    // 4. Normal matrix (3×3)
    const normalMat3 = this.transform.computeNormalMat3(model)

    return { mvp, model, normalMat3 }
  }
}
