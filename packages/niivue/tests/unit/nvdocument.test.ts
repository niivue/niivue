import { assert, expect, test } from 'vitest'
import { NVDocument, DocumentData } from '../../src/niivue/index.js' // note the js extension
import * as nvd from '../images/document/niivue.mesh-old-colorMap.json';

test('nvdocument convert colorMap and colorMapNegative to colormap and colormapNegative', () => {
  const doc = NVDocument.loadFromJSON(nvd as DocumentData)
  assert(doc.meshDataObjects)
  const colorMapIsInLayer = "colorMap" in doc.meshDataObjects[0].layers[0]
  const colorMapNegativeIsInLayer = "colorMapNegative" in doc.meshDataObjects[0].layers[0]
  expect(doc.meshDataObjects[0].layers[0].colormap).toEqual("warm")
  expect(doc.meshDataObjects[0].layers[0].colormapNegative).toEqual("winter")
  expect(colorMapIsInLayer).toBe(false)
  expect(colorMapNegativeIsInLayer).toBe(false)
})