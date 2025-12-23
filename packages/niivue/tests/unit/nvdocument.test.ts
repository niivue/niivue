import { readFileSync } from 'fs'
import { assert, expect, test } from 'vitest'
import { NVDocument, DocumentData, DEFAULT_OPTIONS, INITIAL_SCENE_DATA } from '../../src/niivue/index.js'
import * as nvd from '../images/document/niivue.mesh-old-colorMap.json'

test('loadFromFile loads a valid document', async () => {
  // Load the JSON document as a Blob
  const data = readFileSync('tests/images/document/niivue.mesh-pre-0.52.0.nvd')
  const blob = new Blob([data], { type: 'application/json' })

  const document = await NVDocument.loadFromFile(blob)

  expect(document).toBeDefined()
  expect(document.data).toBeDefined()
  expect(document.data.opts).toBeDefined()

  // Check a handful of important values
  expect(document.data.opts.textHeight).toBeCloseTo(0.06, 5)
  expect(document.data.opts.backColor).toEqual([1, 1, 1, 1])
  expect(document.data.opts.show3Dcrosshair).toBe(true)
  expect(document.data.opts.dragMode).toBe(1)

  // Legacy special-case: older files expect meshThicknessOn2D === null
  expect(document.data.opts.meshThicknessOn2D).toBeNull()

  // Optional: make sure we didn't accidentally merge DEFAULT_OPTIONS into this legacy file
  // (only do this if you rely on legacy files remaining compact)
  // expect(Object.keys(document.data.opts).length).toBeLessThan(100)
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

test('nvdocument penType defaults to pen', () => {
  const doc = new NVDocument()
  expect(doc.opts.penType).toBe(0)
  expect(DEFAULT_OPTIONS.penType).toBe(0)
})
