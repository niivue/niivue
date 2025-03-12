import { assert, expect, test } from 'vitest'
import { NVDocument, DocumentData } from '../../src/niivue/index.js' // note the js extension
import * as nvd from '../images/document/niivue.mesh-old-colorMap.json'
import { readFileSync } from 'fs'

test('loadFromFile loads a valid document', async () => {
  // Load the JSON document as a Blob
  const data = readFileSync('tests/images/document/niivue.mesh-pre-0.52.0.nvd')
  const blob = new Blob([data], { type: 'application/json' })

  const document = await NVDocument.loadFromFile(blob)

  const expectedData = {
    textHeight: 0.06,
    colorbarHeight: 0.05,
    crosshairWidth: 1,
    rulerWidth: 4,
    show3Dcrosshair: true,
    backColor: [1, 1, 1, 1],
    crosshairColor: [1, 0, 0, 1],
    selectionBoxColor: [1, 1, 1, 0.5],
    clipPlaneColor: [0.7, 0, 0.7, 0.5],
    rulerColor: [1, 0, 0, 0.8],
    colorbarMargin: 0.05,
    trustCalMinMax: true,
    clipPlaneHotKey: 'KeyC',
    viewModeHotKey: 'KeyV',
    doubleTouchTimeout: 500,
    longTouchTimeout: 1000,
    keyDebounceTime: 50,
    isNearestInterpolation: false,
    isAtlasOutline: false,
    isRuler: false,
    isColorbar: false,
    isOrientCube: false,
    multiplanarPadPixels: 0,
    multiplanarForceRender: false,
    isRadiologicalConvention: false,
    meshThicknessOn2D: null,
    dragMode: 1,
    isDepthPickMesh: false,
    isCornerOrientationText: false,
    sagittalNoseLeft: false,
    isSliceMM: false,
    logging: false,
    loadingText: 'waiting for images...',
    dragAndDropEnabled: true,
    drawingEnabled: false,
    penValue: 1,
    isFilledPen: false,
    thumbnail: '',
    maxDrawUndoBitmaps: 8,
    sliceType: 4,
    isHighResolutionCapable: true
  }

  expect(document).toBeDefined()
  expect(document.data).toBeDefined()
  expect(document.data.opts).toBeDefined()
  expect(document.data.opts).toEqual(expectedData)
})

test('nvdocument convert colorMap and colorMapNegative to colormap and colormapNegative', () => {
  const doc = NVDocument.loadFromJSON(nvd as DocumentData)
  assert(doc.meshDataObjects)
  const colorMapIsInLayer = 'colorMap' in doc.meshDataObjects[0].layers[0]
  const colorMapNegativeIsInLayer = 'colorMapNegative' in doc.meshDataObjects[0].layers[0]
  expect(doc.meshDataObjects[0].layers[0].colormap).toEqual('warm')
  expect(doc.meshDataObjects[0].layers[0].colormapNegative).toEqual('winter')
  expect(colorMapIsInLayer).toBe(false)
  expect(colorMapNegativeIsInLayer).toBe(false)
})

