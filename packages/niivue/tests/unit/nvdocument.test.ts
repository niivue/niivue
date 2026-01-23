import { readFileSync } from 'fs'
import { expect, test } from 'vitest'
import { NVDocument, DocumentData, COLORMAP_TYPE } from '../../src/nvdocument'
import NVSerializer from '../../src/nvserializer' // adjust path if needed

// Keep the old legacy test fixture JSON handy (old tests commented out below)
const nvd = JSON.parse(
  readFileSync('tests/images/document/niivue.mesh-old-colorMap.json', 'utf-8')
)

/**
 * Helper to parse meshesString safely
 */
function parseMeshesString(msString: string | undefined): any[] {
  if (!msString) return []
  try {
    const parsed = JSON.parse(msString)
    if (Array.isArray(parsed)) return parsed
    if (parsed && Array.isArray(parsed.value)) return parsed.value
    if (parsed && Array.isArray(parsed.data)) return parsed.data
    return []
  } catch (e) {
    return []
  }
}

/**
 * New tests for the updated serializer/deserializer
 */
test('NVSerializer.deserializeDocument preserves top-level fields (opts, sceneData, meshesString)', async () => {
  const doc = new NVDocument()
  doc.title = 'Serialize-Roundtrip-Doc'
  // mutate opts to ensure diff is tracked
  doc.opts.textHeight = 0.35
  doc.opts.meshThicknessOn2D = Infinity
  // add completed measurement to verify clone/restore behavior
  doc.completedMeasurements = [{
    startMM: [0, 0, 0] as any,
    endMM: [1, 1, 1] as any,
    distance: 1.732,
    sliceIndex: 0,
    sliceType: 0 as any,
    slicePosition: 0
  }];

  // add a tiny mesh so meshesString exists
  // use a plain array for rgba255 to avoid any weird typed-array/stringify issues
  (doc as any).meshes = [{
    name: 'roundtrip-mesh',
    pts: [0, 0, 0],
    tris: [0],
    rgba255: [1, 2, 3, 4],
    layers: []
  }];

  const exported = NVSerializer.serializeDocument(doc, true, true);
  // ensure semicolon present so the next line isn't parsed incorrectly

  // Now deserialize into a new NVDocument
  const newDoc = await NVSerializer.deserializeDocument(exported as DocumentData);

  // Top-level fields preserved
  expect(newDoc.data).toBeDefined();
  expect(newDoc.data.title).toBeDefined();
  expect(newDoc.data.title).toBe(doc.title);
  // opts were merged with defaults inside deserializeDocument
  expect(newDoc.data.opts).toBeDefined();
  expect((newDoc.data.opts as any).textHeight).toBeCloseTo(0.35, 6);
  // meshThicknessOn2D "infinity" string should have been restored to Infinity
  expect((newDoc.data.opts as any).meshThicknessOn2D).toBe(Infinity);
  // sceneData default merge
  expect(newDoc.scene.sceneData.gamma).toBeDefined();
  // meshesString should be preserved so later mesh rehydration can occur
  expect((newDoc.data as any).meshesString).toBeDefined();
});


test('NVSerializer.rehydrateMeshes decodes numeric encodings and normalizes legacy layer keys (no GL)', async() => {
  // Prepare a DocumentData-like object (like what serializeDocument produced)
  const doc = new NVDocument()
  const mesh: any = {
    name: 'rehydrate-test',
    pts: [0, 0, 0],
    tris: [0],
    rgba255: [255, 0, 0, 255],
    layers: [
      {
        // serialized form may already have colormap (as produced by serializeDocument)
        colormap: 'warm',
        colormapNegative: 'winter',
        // encoded special numbers (strings)
        global_min: 'NaN',
        global_max: 'infinity',
        cal_min: '-infinity',
        cal_max: 5.5,
        values: [0.1, 0.2],
        atlasValues: [3, 4]
      }
    ]
  }

  const exported = NVSerializer.serializeDocument(doc, true, true)
  // replace meshesString with our contrived mesh if serializer didn't include one
  const meshesArray = [mesh]
  const meshesString = JSON.stringify(meshesArray)
  const documentData: DocumentData = {
    meshesString,
    imageOptionsArray: [],
    encodedImageBlobs: [],
    sceneData: {},
    opts: {}
  }

  // Call rehydrateMeshes without GL - this should return plain object meshes, but decode numeric strings
  const rehydrated = await NVSerializer.rehydrateMeshes(documentData, undefined, false)

  expect(Array.isArray(rehydrated)).toBe(true)
  expect(rehydrated.length).toBe(1)
  const m0 = rehydrated[0]
  expect(m0.layers).toBeDefined()
  const l0 = m0.layers[0]

  // Legacy normalization should not leave legacy keys behind (we supplied colormap already)
  expect(l0.colormap).toBe('warm')
  expect(l0.colormapNegative).toBe('winter')

  // Numeric strings should have been decoded back to proper JS numbers
  expect(Number.isNaN(l0.global_min)).toBe(true)
  expect(Object.is(l0.global_max, Infinity)).toBe(true)
  expect(Object.is(l0.cal_min, -Infinity)).toBe(true)
  expect(l0.cal_max).toBe(5.5)

  // Values and atlasValues should be arrays with expected entries
  expect(Array.isArray(l0.values)).toBe(true)
  expect(l0.values).toEqual([0.1, 0.2])
  expect(Array.isArray(l0.atlasValues)).toBe(true)
  expect(l0.atlasValues).toEqual([3, 4])
})

test('NVSerializer.deserializeDocument preserves top-level fields (opts, sceneData, meshesString)', async () => {
  const doc = new NVDocument()
  doc.title = 'Serialize-Roundtrip-Doc'
  // mutate opts to ensure diff is tracked
  doc.opts.textHeight = 0.35
  doc.opts.meshThicknessOn2D = Infinity
  // add completed measurement to verify clone/restore behavior
  doc.completedMeasurements = [{
    startMM: [0, 0, 0] as any,
    endMM: [1, 1, 1] as any,
    distance: 1.732,
    sliceIndex: 0,
    sliceType: 0 as any,
    slicePosition: 0
  }];

  // add a tiny mesh so meshesString exists
  (doc as any).meshes = [{
    name: 'roundtrip-mesh',
    pts: [0, 0, 0],
    tris: [0],
    rgba255: [1, 2, 3, 4],
    layers: []
  }]

  const exported = NVSerializer.serializeDocument(doc, true, true)

  // Now deserialize into a new NVDocument
  const newDoc = await NVSerializer.deserializeDocument(exported as DocumentData)

  // Top-level fields preserved
  expect(newDoc.data).toBeDefined()
  expect(newDoc.data.title).toBeDefined()
  expect(newDoc.data.title).toBe(doc.title)
  // opts were merged with defaults inside deserializeDocument
  expect(newDoc.data.opts).toBeDefined()
  expect((newDoc.data.opts as any).textHeight).toBeCloseTo(0.35, 6)
  // meshThicknessOn2D "infinity" string should have been restored to Infinity
  expect((newDoc.data.opts as any).meshThicknessOn2D).toBe(Infinity)
  // sceneData default merge
  expect(newDoc.scene.sceneData.gamma).toBeDefined()
  // meshesString should be preserved so later mesh rehydration can occur
  expect((newDoc.data as any).meshesString).toBeDefined()
})

/**
 * Test: legacy layer keys + numeric encodings
 * - colorMap -> colormap normalization
 * - numeric strings 'NaN' / 'infinity' / '-infinity' decode back to JS numbers
 * - values/atlasValues preserved as arrays
 */
test('NVSerializer.rehydrateMeshes decodes legacy colorMap and numeric encodings (no GL)', async () => {
  const legacyMesh = {
    name: 'legacy-layer-test',
    pts: [0, 0, 0],
    tris: [0],
    rgba255: [255, 0, 0, 255],
    layers: [
      {
        // legacy field names intentionally used here
        colorMap: 'warm',
        colorMapNegative: 'winter',
        // numeric encodings as strings (what older serializers produced)
        global_min: 'NaN',
        global_max: 'infinity',
        cal_min: '-infinity',
        cal_max: 42,
        // arrays (already plain arrays, but ensure still preserved)
        values: [0.1, 0.2],
        atlasValues: [3, 4]
      }
    ]
  }

  const doc: DocumentData = {
    meshesString: JSON.stringify([legacyMesh]),
    imageOptionsArray: [],
    encodedImageBlobs: [],
    sceneData: {},
    opts: {}
  }

  const rehydrated = await NVSerializer.rehydrateMeshes(doc, undefined, false)

  expect(Array.isArray(rehydrated)).toBe(true)
  expect(rehydrated.length).toBe(1)

  const m0 = rehydrated[0] as any
  expect(m0.layers).toBeDefined()
  const l = m0.layers[0]

  // legacy keys should be normalized
  expect(l.colormap).toBe('warm')
  expect(l.colormapNegative).toBe('winter')
  expect(('colorMap' in l)).toBe(false)
  expect(('colorMapNegative' in l)).toBe(false)

  // numeric decodings
  expect(Number.isNaN(l.global_min)).toBe(true)
  expect(Object.is(l.global_max, Infinity)).toBe(true)
  expect(Object.is(l.cal_min, -Infinity)).toBe(true)
  expect(l.cal_max).toBe(42)

  // values & atlasValues preserved as arrays with same entries
  expect(Array.isArray(l.values)).toBe(true)
  expect(l.values).toEqual([0.1, 0.2])
  expect(Array.isArray(l.atlasValues)).toBe(true)
  expect(l.atlasValues).toEqual([3, 4])
})

/**
 * Test: meshesString that looks like a structured-clone wrapper or a wrapper object
 * Ensures normalizeMeshesString path is exercised and that resulting layers are normalized.
 */
test('NVSerializer.rehydrateMeshes handles wrapped/structured-clone-like meshesString (no GL)', async () => {
  // Simulate a wrapper shape (old code sometimes wrapped the array in { value: [...] } )
  const inner = [
    {
      name: 'wrapped-mesh',
      pts: [0],
      tris: [0],
      rgba255: [10, 20, 30, 40],
      layers: [
        {
          // already modern name present; ensure it's preserved
          colormap: 'hot',
          global_min: 'NaN',
          global_max: 'infinity',
          cal_min: '-infinity',
          cal_max: 3.14,
          values: [1.5],
          atlasValues: [7]
        }
      ]
    }
  ]
  // wrapper object
  const wrapper = { value: inner }
  const doc: DocumentData = {
    meshesString: JSON.stringify(wrapper),
    imageOptionsArray: [],
    encodedImageBlobs: [],
    sceneData: {},
    opts: {}
  }

  const rehydrated = await NVSerializer.rehydrateMeshes(doc, undefined, false)

  expect(Array.isArray(rehydrated)).toBe(true)
  expect(rehydrated.length).toBe(1)

  const m0 = rehydrated[0] as any
  expect(m0.name).toBe('wrapped-mesh')
  const l = m0.layers[0]

  expect(l.colormap).toBe('hot')
  expect(Number.isNaN(l.global_min)).toBe(true)
  expect(Object.is(l.global_max, Infinity)).toBe(true)
  expect(Object.is(l.cal_min, -Infinity)).toBe(true)
  expect(l.cal_max).toBe(3.14)

  expect(Array.isArray(l.values)).toBe(true)
  expect(l.values).toEqual([1.5])
  expect(Array.isArray(l.atlasValues)).toBe(true)
  expect(l.atlasValues).toEqual([7])
})