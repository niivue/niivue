// @vitest-environment node
import { expect, test, vi } from 'vitest'
import { configureColormapUniforms } from '../../src/niivue/data/VolumeLayerRenderer.js'
import { COLORMAP_TYPE } from '../../src/colortables.js'

/**
 * Regression test for niivue issue #1594
 * ("Transparent and translucent subthreshold rendering seem reversed").
 *
 * The fragment shader's `isAlphaThreshold` uniform drives the TRANSLUCENT
 * (graded partial-alpha) branch, so it must be 1 ONLY for
 * COLORMAP_TYPE.ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN (value 2), and 0 for both
 * MIN_TO_MAX (0) and ZERO_TO_MAX_TRANSPARENT_BELOW_MIN (1).
 */

// Sentinel uniform location used to assert the spy was called with the
// isAlphaThreshold location specifically (not some other uniform).
const ISALPHATHRESHOLD_LOC = 'LOC_isAlphaThreshold'

function buildMocks(colormapType: COLORMAP_TYPE): {
  gl: { uniform1i: ReturnType<typeof vi.fn>; uniform1f: ReturnType<typeof vi.fn> }
  orientShader: { uniforms: Record<string, string> }
  overlayItem: Record<string, unknown>
} {
  const gl = {
    uniform1i: vi.fn(),
    uniform1f: vi.fn()
  }

  const orientShader = {
    uniforms: {
      isAlphaThreshold: ISALPHATHRESHOLD_LOC,
      isColorbarFromZero: 'LOC_isColorbarFromZero',
      isAdditiveBlend: 'LOC_isAdditiveBlend',
      layer: 'LOC_layer',
      cal_minNeg: 'LOC_cal_minNeg',
      cal_maxNeg: 'LOC_cal_maxNeg'
    }
  }

  // Empty colormapNegative skips the negative-colormap branch, so cal_min/cal_max
  // are never read. We still provide them as finite numbers for completeness.
  const overlayItem = {
    colormapType,
    colormapNegative: [],
    cal_min: 0,
    cal_max: 1,
    cal_minNeg: Number.NaN,
    cal_maxNeg: Number.NaN
  }

  return { gl, orientShader, overlayItem }
}

function callConfigure(colormapType: COLORMAP_TYPE): {
  gl: { uniform1i: ReturnType<typeof vi.fn>; uniform1f: ReturnType<typeof vi.fn> }
  orientShader: { uniforms: Record<string, string> }
} {
  const { gl, orientShader, overlayItem } = buildMocks(colormapType)
  configureColormapUniforms({
    gl: gl as any,
    overlayItem: overlayItem as any,
    orientShader: orientShader as any,
    layer: 1,
    isAdditiveBlend: false
  })
  return { gl, orientShader }
}

test('isAlphaThreshold is 1 for ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN (translucent)', () => {
  const { gl, orientShader } = callConfigure(COLORMAP_TYPE.ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN)
  expect(gl.uniform1i).toHaveBeenCalledWith(orientShader.uniforms.isAlphaThreshold, 1)
})

test('isAlphaThreshold is 0 for ZERO_TO_MAX_TRANSPARENT_BELOW_MIN (transparent)', () => {
  const { gl, orientShader } = callConfigure(COLORMAP_TYPE.ZERO_TO_MAX_TRANSPARENT_BELOW_MIN)
  expect(gl.uniform1i).toHaveBeenCalledWith(orientShader.uniforms.isAlphaThreshold, 0)
  expect(gl.uniform1i).not.toHaveBeenCalledWith(orientShader.uniforms.isAlphaThreshold, 1)
})

test('isAlphaThreshold is 0 for MIN_TO_MAX', () => {
  const { gl, orientShader } = callConfigure(COLORMAP_TYPE.MIN_TO_MAX)
  expect(gl.uniform1i).toHaveBeenCalledWith(orientShader.uniforms.isAlphaThreshold, 0)
  expect(gl.uniform1i).not.toHaveBeenCalledWith(orientShader.uniforms.isAlphaThreshold, 1)
})

test('isColorbarFromZero is unaffected: 1 for both threshold types, 0 for MIN_TO_MAX', () => {
  // Guards against regressing the (correct) sibling line 211.
  const translucent = callConfigure(COLORMAP_TYPE.ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN)
  expect(translucent.gl.uniform1i).toHaveBeenCalledWith(translucent.orientShader.uniforms.isColorbarFromZero, 1)
  expect(translucent.gl.uniform1i).not.toHaveBeenCalledWith(translucent.orientShader.uniforms.isColorbarFromZero, 0)

  const transparent = callConfigure(COLORMAP_TYPE.ZERO_TO_MAX_TRANSPARENT_BELOW_MIN)
  expect(transparent.gl.uniform1i).toHaveBeenCalledWith(transparent.orientShader.uniforms.isColorbarFromZero, 1)
  expect(transparent.gl.uniform1i).not.toHaveBeenCalledWith(transparent.orientShader.uniforms.isColorbarFromZero, 0)

  const minToMax = callConfigure(COLORMAP_TYPE.MIN_TO_MAX)
  expect(minToMax.gl.uniform1i).toHaveBeenCalledWith(minToMax.orientShader.uniforms.isColorbarFromZero, 0)
  expect(minToMax.gl.uniform1i).not.toHaveBeenCalledWith(minToMax.orientShader.uniforms.isColorbarFromZero, 1)
})
