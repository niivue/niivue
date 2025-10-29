// nvcamera.ts
import { mat4 } from 'gl-matrix'
import { NVConfigOptions } from '@/nvdocument.js'

export type RectLTWH = [number, number, number, number]

/**
 * Handles projection matrix and viewport conversion for orthographic scenes.
 */
export class NVCamera {
  /**
   * Computes an orthographic projection matrix for the given viewport.
   */
  computeProjectionMatrix(
    ltwh: RectLTWH,
    furthestFromPivot: number,
    volScaleMultiplier: number,
    _opts?: NVConfigOptions
  ): mat4 {
    const projection = mat4.create()
    const width = ltwh[2]
    const height = ltwh[3]
    const whratio = width / Math.max(1, height)
    const scale = (0.8 * furthestFromPivot) / Math.max(1, volScaleMultiplier)

    if (whratio < 1) {
      mat4.ortho(projection, -scale, scale, -scale / whratio, scale / whratio, scale * 0.01, scale * 8.0)
    } else {
      mat4.ortho(projection, -scale * whratio, scale * whratio, -scale, scale, scale * 0.01, scale * 8.0)
    }

    return projection
  }

  /**
   * Converts a canvas-space rectangle (Y-down) to a GL viewport (Y-up).
   */
  canvasToGLViewport(ltwh: RectLTWH, canvasHeight: number): RectLTWH {
    const [x, y, w, h] = ltwh
    return [x, canvasHeight - y - h, w, h]
  }
}
