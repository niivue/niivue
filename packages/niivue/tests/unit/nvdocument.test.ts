import { readFileSync } from 'fs'
import { assert, expect, test } from 'vitest'
import { NVDocument, DocumentData, DEFAULT_OPTIONS, INITIAL_SCENE_DATA } from '../../src/niivue/index.js' // note the js extension
import * as nvd from '../images/document/niivue.mesh-old-colorMap.json'

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

test('nvdocument only saves config options that differ from DEFAULT_OPTIONS', () => {
  const doc = new NVDocument()

  // Modify one config field from the default
  doc.opts.textHeight = 0.5
  doc.opts.dragMode = 2
  doc.opts.meshThicknessOn2D = Infinity

  // Export document
  const json = doc.json()

  // Should not include every option
  const savedKeys = Object.keys(json.opts)
  expect(savedKeys).toContain('textHeight')
  expect(savedKeys).toContain('dragMode')
  expect(savedKeys).toContain('meshThicknessOn2D')
  expect(savedKeys).not.toContain('colorbarHeight')
  expect(savedKeys).not.toContain('crosshairGap')

  // Should match values set
  expect(json.opts.textHeight).toBe(0.5)
  expect(json.opts.dragMode).toBe(2)
  expect(json.opts.meshThicknessOn2D).toBe('infinity') // special case

  // Reload document
  const loaded = NVDocument.loadFromJSON({
    ...doc.data,
    opts: json.opts // simulate saving only diff
  })

  expect(loaded.opts.textHeight).toBe(0.5)
  expect(loaded.opts.dragMode).toBe(2)
  expect(loaded.opts.colorbarHeight).toBe(DEFAULT_OPTIONS.colorbarHeight)
  expect(loaded.opts.meshThicknessOn2D).toBe(Infinity)
})

test('nvdocument can be initialized from minimal JSON input', () => {
  const minimal: Partial<DocumentData> = {
    title: 'Minimal Doc',
    imageOptionsArray: [
      {
        name: 'brain.nii.gz',
        url: './images/brain.nii.gz',
        colormap: 'gray',
        opacity: 1
      }
    ]
  }

  const doc = NVDocument.loadFromJSON(minimal as DocumentData)

  expect(doc.data.title).toBe('Minimal Doc')
  expect(doc.data.imageOptionsArray!.length).toBe(1)
  expect(doc.data.imageOptionsArray![0].name).toBe('brain.nii.gz')

  // Ensure missing fields are filled with defaults
  expect(doc.data.meshOptionsArray).toEqual([])
  expect(doc.data.labels).toEqual([])
  expect(doc.data.encodedImageBlobs).toEqual([])
  expect(doc.data.encodedDrawingBlob).toBe('')
  expect(doc.data.previewImageDataURL).toBe('')
  expect(doc.data.customData).toBe('')
  expect(doc.data.opts).toEqual(DEFAULT_OPTIONS)
  expect(doc.scene.sceneData).toEqual(INITIAL_SCENE_DATA)
})
