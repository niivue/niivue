import { expect, test, vi, beforeAll } from 'vitest'
import { Niivue, PEN_TYPE, SLICE_TYPE } from '../../src/niivue/index.js' // note the js extension
import { vec4 } from 'gl-matrix'

// Mock WebGL-dependent methods
beforeAll(() => {
  vi.spyOn(Niivue.prototype, 'drawScene').mockImplementation(() => {})
  vi.spyOn(Niivue.prototype, 'updateGLVolume').mockImplementation(() => {})
})

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
  const pan2Dxyzmm = vec4.fromValues(5, -4, 2, 1.5)
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

test('setPivot3DPoint sets and getPivot3DPoint retrieves the pivot point', () => {
  const nv = new Niivue()

  const originalPivot = nv.pivot3D
  // Test setting a valid pivot point
  const pivot = [10, 20, 30] as [number, number, number]
  nv.setPivot3DPoint(pivot)
  const retrieved = nv.pivot3D
  expect(retrieved).not.toBeNull()
  expect(retrieved[0]).toBe(10)
  expect(retrieved[1]).toBe(20)
  expect(retrieved[2]).toBe(30)

  // Test clearing the pivot point. Reset to original value
  nv.setPivot3DPoint(null)
  expect(nv.pivot3D[0]).toBe(originalPivot[0])
  expect(nv.pivot3D[1]).toBe(originalPivot[1])
  expect(nv.pivot3D[2]).toBe(originalPivot[2])
})

test('setPivot3DPoint ignores non-finite values', () => {
  const nv = new Niivue()

  // Set a valid pivot first
  nv.setPivot3DPoint([1, 2, 3])
  expect(nv.pivot3D).not.toBeNull()

  // Try to set invalid values - should be ignored
  nv.setPivot3DPoint([NaN, 0, 0])
  expect(nv.pivot3D).toEqual([1, 2, 3])

  nv.setPivot3DPoint([0, Infinity, 0])
  expect(nv.pivot3D).toEqual([1, 2, 3])

  nv.setPivot3DPoint([0, 0, -Infinity])
  expect(nv.pivot3D).toEqual([1, 2, 3])
})

test('setPivot3DPoint returns a copy not a reference', () => {
  const nv = new Niivue()
  const original = [5, 10, 15] as [number, number, number]
  nv.setPivot3DPoint(original)

  const retrieved = nv.pivot3D
  expect(retrieved).not.toBeNull()

  // Modify the retrieved array
  retrieved![0] = 999

  // Original should not be modified
  expect(original[0]).toBe(5)

  // Internal state should not be modified
  const retrievedAgain = nv.pivot3D
  expect(retrievedAgain![0]).toBe(5)
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


test('showAllOrientationMarkers set by setShowAllOrientationMarkers is tracked in document', () => {
  const nv = new Niivue()
  // Default should be false
  expect(nv.document.opts.showAllOrientationMarkers).toBe(false)
  
  nv.setShowAllOrientationMarkers(true)
  expect(nv.document.opts.showAllOrientationMarkers).toBe(true)
  
  nv.setShowAllOrientationMarkers(false)
  expect(nv.document.opts.showAllOrientationMarkers).toBe(false)
})

test('penType defaults to pen', () => {
  const nv = new Niivue()
  expect(nv.document.opts.penType).toBe(PEN_TYPE.PEN)
})

test('penType can be set to rectangle', () => {
  const nv = new Niivue()
  nv.document.opts.penType = PEN_TYPE.RECTANGLE
  expect(nv.document.opts.penType).toBe(PEN_TYPE.RECTANGLE)
})

test('penType can be set to ellipse', () => {
  const nv = new Niivue()
  nv.document.opts.penType = PEN_TYPE.ELLIPSE
  expect(nv.document.opts.penType).toBe(PEN_TYPE.ELLIPSE)
})
