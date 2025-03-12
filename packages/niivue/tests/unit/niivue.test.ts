import { expect, test } from 'vitest'
import { Niivue, SLICE_TYPE } from '../../src/niivue/index.js' // note the js extension
import { vec4 } from 'gl-matrix'

test('backColor defaults to black', () => {
  const nv = new Niivue()
  expect(nv.opts.backColor).toStrictEqual([0, 0, 0, 1])
})

test('crosshairColor can be set', async () => {
  const nv = new Niivue()
  const green = [0, 1, 0, 1] // RGBA green
  await nv.setCrosshairColor(green)
  expect(nv.opts.crosshairColor).toStrictEqual(green)
})

test('options are copied and not referenced', () => {
  const nv1 = new Niivue()
  const nv2 = new Niivue()
  nv1.setSliceType(SLICE_TYPE.SAGITTAL)
  nv2.setSliceType(SLICE_TYPE.AXIAL)
  expect(nv1.opts.sliceType).toBe(2) // SLICE_TYPE.SAGITTAL  
})

test('azimuth and elevation set by setRenderAzimuthElevation is tracked in document', () => {
  const expectedAzimuth = 77
  const expectedElevation = 88

  const nv = new Niivue()
  nv.setRenderAzimuthElevation(expectedAzimuth, expectedElevation)
  expect(nv.document.scene.renderAzimuth).toBe(expectedAzimuth)
  expect(nv.document.scene.renderElevation).toBe(expectedElevation)
})

test('pan2Dxyzmm set by setPan2Dxyzmm is tracked in document', () => {
  const nv = new Niivue()
  const pan2Dxyzmm = vec4.fromValues(5,-4, 2, 1.5)
  nv.setPan2Dxyzmm(pan2Dxyzmm)
  expect(nv.document.scene.pan2Dxyzmm).toBe(pan2Dxyzmm)  
})

test('isSliceMM set by setSliceMM is tracked in document', () => {
  const nv = new Niivue()
  nv.setSliceMM(false)
  nv.setSliceMM(true)
  expect(nv.document.opts.isSliceMM).toBe(true)
  nv.setSliceMM(false)
  expect(nv.document.opts.isSliceMM).toBe(false)
})

test('isAdditiveBlend set by setAdditiveBlend is tracked in document', () => {
  const nv = new Niivue()
  nv.setAdditiveBlend(false)
  nv.setAdditiveBlend(true)
  expect(nv.document.opts.isAdditiveBlend).toBe(true)
  nv.setAdditiveBlend(false)
  expect(nv.document.opts.isAdditiveBlend).toBe(false)
})

test('sliceMosaicString set by setSliceMosaicString is tracked in document', () => {
  const nv = new Niivue()
  const mosaic = 'A 0 20 C 30 S 42'
  nv.setSliceMosaicString(mosaic)
  expect(nv.document.opts.sliceMosaicString).toBe(mosaic)  
})

test('meshThicknessOn2D set by setMeshThicknessOn2D is tracked in document', () => {
  const nv = new Niivue()
  const meshThickness = 7
  nv.setMeshThicknessOn2D(meshThickness)
  expect(nv.document.opts.meshThicknessOn2D).toBe(meshThickness)  
})

test('isHighResolutionCapable set by setHighResolutionCapable is tracked in document', () => {
  const nv = new Niivue()
  nv.setHighResolutionCapable(-1)
  nv.setHighResolutionCapable(0)
  expect(nv.document.opts.forceDevicePixelRatio).toBe(0)
  nv.setHighResolutionCapable(-1)
  expect(nv.document.opts.forceDevicePixelRatio).toBe(-1)
})

test('isRadiologicalConvention set by setRadiologicalConvention is tracked in document', () => {
  const nv = new Niivue()
  nv.setRadiologicalConvention(false)
  nv.setRadiologicalConvention(true)
  expect(nv.document.opts.isRadiologicalConvention).toBe(true)
  nv.setRadiologicalConvention(false)
  expect(nv.document.opts.isRadiologicalConvention).toBe(false)
})

test('isCornerOrientationText set by setCornerOrientationText is tracked in document', () => {
  const nv = new Niivue()
  nv.setCornerOrientationText(false)
  nv.setCornerOrientationText(true)
  expect(nv.document.opts.isCornerOrientationText).toBe(true)
  nv.setCornerOrientationText(false)
  expect(nv.document.opts.isCornerOrientationText).toBe(false)
})

test('multiplanarLayout set by setMultiplanarLayout is tracked in document', () => {
  const nv = new Niivue()
  const multiplanarLayout = 3
  nv.setMultiplanarLayout(multiplanarLayout)
  expect(nv.document.opts.multiplanarLayout).toBe(multiplanarLayout)  
})

test('multiplanarPadPixels set by setMultiplanarPadPixels is tracked in document', () => {
  const nv = new Niivue()
  const multiplanarPadPixels = 4
  nv.setMultiplanarPadPixels(multiplanarPadPixels)
  expect(nv.document.opts.multiplanarPadPixels).toBe(multiplanarPadPixels)  
})