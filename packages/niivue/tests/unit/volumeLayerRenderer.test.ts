import { describe, expect, test } from 'vitest'
import { configureColormapUniforms } from '../../src/niivue/data/VolumeLayerRenderer.js'
import { COLORMAP_TYPE } from '../../src/colortables.js'

function uniformsFor(colormapType: COLORMAP_TYPE): Record<string, number> {
  const set: Record<string, number> = {}
  const gl = {
    uniform1i: (location: string, value: number): void => {
      set[location] = value
    },
    uniform1f: (): void => {}
  }
  configureColormapUniforms({
    gl: gl as unknown as WebGL2RenderingContext,
    overlayItem: { colormapType, colormapNegative: '', cal_min: 1, cal_max: 2 } as any,
    orientShader: {
      uniforms: { isAlphaThreshold: 'isAlphaThreshold', isColorbarFromZero: 'isColorbarFromZero', isAdditiveBlend: 'isAdditiveBlend' }
    } as any,
    layer: 1,
    isAdditiveBlend: false
  })
  return set
}

describe('configureColormapUniforms', () => {
  test('restricts the colorbar to the range for MIN_TO_MAX', () => {
    expect(uniformsFor(COLORMAP_TYPE.MIN_TO_MAX)).toMatchObject({ isColorbarFromZero: 0, isAlphaThreshold: 0 })
  })

  test('hides values below the threshold for ZERO_TO_MAX_TRANSPARENT_BELOW_MIN', () => {
    expect(uniformsFor(COLORMAP_TYPE.ZERO_TO_MAX_TRANSPARENT_BELOW_MIN)).toMatchObject({ isColorbarFromZero: 1, isAlphaThreshold: 0 })
  })

  test('fades values below the threshold for ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN', () => {
    expect(uniformsFor(COLORMAP_TYPE.ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN)).toMatchObject({ isColorbarFromZero: 1, isAlphaThreshold: 1 })
  })
})
