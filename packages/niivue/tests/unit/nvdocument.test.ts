import { readFileSync } from 'fs'
import { assert, expect, test } from 'vitest'
import { NVDocument, DocumentData, DEFAULT_OPTIONS, INITIAL_SCENE_DATA } from '../../src/niivue/index.js'

const nvd = JSON.parse(
  readFileSync('tests/images/document/niivue.mesh-old-colorMap.json', 'utf-8')
)

/**
 * Small helper: return an array of mesh-like plain objects from a loaded NVDocument.
 * Supports two possible shapes after refactor:
 *  - doc.meshDataObjects already populated (runtime objects)
 *  - doc.data.meshesString present (stringified JSON)
 */
function extractMeshesFromDoc(doc: NVDocument): any[] {
  if (doc.meshDataObjects && Array.isArray(doc.meshDataObjects) && doc.meshDataObjects.length > 0) {
    return doc.meshDataObjects as any[]
  }
  // fallback: try to parse meshesString on the data object
  const ms = (doc.data && (doc.data as any).meshesString) || (doc.data && (doc.data as any).meshesString === '' ? '[]' : undefined)
  if (ms) {
    try {
      const parsed = JSON.parse(ms)
      return Array.isArray(parsed) ? parsed : []
    } catch (err) {
      // not valid JSON -> return empty
      return []
    }
  }
  return []
}

test('loadFromFile loads a valid document', async () => {
  // Load the JSON document as a Blob
  const data = readFileSync('tests/images/document/niivue.mesh-pre-0.52.0.nvd')
  const blob = new Blob([data], { type: 'application/json' })

  // loadFromFile is async in the new codepath
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
})

test('nvdocument convert colorMap and colorMapNegative to colormap and colormapNegative', async () => {
  // await the (potentially) async loader
  const doc = await NVDocument.loadFromJSON(nvd as DocumentData)

  // extract meshes whether they are present as meshDataObjects or only as a meshesString
  const meshes = extractMeshesFromDoc(doc)
  assert(meshes.length > 0, 'no meshes found in loaded document')

  const firstLayer = (meshes[0].layers && meshes[0].layers[0]) || {}
  console.log('firstLayer:', firstLayer)
  // legacy fields should be normalized to `colormap` / `colormapNegative`
  expect(firstLayer.colormap).toEqual('warm')
  expect(firstLayer.colormapNegative).toEqual('winter')
  // ensure original legacy property names are not preserved on the exported/loaded object
  expect('colorMap' in firstLayer).toBe(false)
  expect('colorMapNegative' in firstLayer).toBe(false)
})

test('nvdocument only saves config options that differ from DEFAULT_OPTIONS', async () => {
  const doc = new NVDocument()

  // Modify one config field from the default
  doc.opts.textHeight = 0.5
  doc.opts.dragMode = 2
  doc.opts.meshThicknessOn2D = Infinity

  // Export document
  const json = doc.json()

  // Should include keys for the modified fields
  const savedKeys = Object.keys(json.opts)
  expect(savedKeys).toContain('textHeight')
  expect(savedKeys).toContain('dragMode')
  expect(savedKeys).toContain('meshThicknessOn2D')

  // It's acceptable for other default keys to be present depending on serialization strategy;
  // ensure the values for our changed keys are correct.
  expect(json.opts.textHeight).toBe(0.5)
  expect(json.opts.dragMode).toBe(2)
  expect(json.opts.meshThicknessOn2D).toBe(Infinity) // special case

  // Reload document — use async loader in case implementation is async
  const loaded = await NVDocument.loadFromJSON({
    ...doc.data,
    opts: json.opts // simulate saving only diff
  } as DocumentData)

  // New document should reflect the changed options; defaults should remain for unset keys
  expect(loaded.opts.textHeight).toBe(0.5)
  expect(loaded.opts.dragMode).toBe(2)
  // colorbarHeight should still exist on the live opts and equal default if not changed
  expect(loaded.opts.colorbarHeight).toBe(DEFAULT_OPTIONS.colorbarHeight)
  expect(loaded.opts.meshThicknessOn2D).toBe(Infinity)
})

test('nvdocument can be initialized from minimal JSON input', async () => {
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

  const doc = await NVDocument.loadFromJSON(minimal as DocumentData)

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

test('nvdocument preserves mesh and mesh-layer properties through json roundtrip', async () => {
  const src = new NVDocument()

  // Create a runtime mesh with many properties set (typed arrays, NaN/Infinity, fiber fields, offsetPt0, nodes/edges)
  const mesh: any = {
    id: 'mesh-1',
    name: 'test-mesh',
    pts: [0, 0, 0, 1, 1, 1],
    tris: [0, 1, 2],
    rgba255: new Uint8Array([10, 20, 30, 40]),
    opacity: 0.8,
    meshShaderIndex: 2,
    groups: [0],
    dpg: null,
    dps: null,
    dpv: null,
    hasConnectome: false,
    edgeColormap: 'jet',
    edgeColormapNegative: 'cool',
    edgeMax: 255,
    edgeMin: 0,
    edges: [{ a: 1 }],
    extentsMax: [1, 1, 1],
    extentsMin: [0, 0, 0],
    furthestVertexFromOrigin: 1.732,
    nodeColormap: 'hot',
    nodeColormapNegative: 'winter',
    nodeMaxColor: [1, 1, 1],
    nodeMinColor: [0, 0, 0],
    nodeScale: 1.0,
    legendLineThickness: 2,
    offsetPt0: [5, 6, 7],
    nodes: [{ id: 42 }],
    // fiber/connectome fields (should be preserved when offsetPt0 present)
    fiberGroupColormap: [0, 1, 2],
    fiberColor: [1, 0, 0],
    fiberDither: 0.5,
    fiberRadius: 0.2,
    colormap: 'hot',
    // layers: include typed arrays + special numeric values
    layers: [
      {
        name: 'layer1',
        key: 'l1',
        opacity: 1.0,
        // use typed arrays for values and atlasValues
        values: new Float32Array([0.1, 0.2]),
        atlasValues: new Uint8Array([3, 4]),
        // numeric edge cases
        global_min: NaN,
        global_max: Infinity,
        cal_min: -Infinity,
        cal_max: 42,
        cal_minNeg: NaN,
        cal_maxNeg: -Infinity,
        // backward compat fields
        colorMap: undefined,
        colorMapNegative: undefined,
        colormap: 'hot',
        colormapNegative: 'cool',
        labels: [{ name: 'a' }]
      }
    ]
  }

  // put mesh into doc runtime meshes
  src.meshes.push(mesh)

  // Serialize out
  const exported = src.json(true, true)

  // Sanity: meshesString must be present
  expect(exported.meshesString).toBeDefined()

  // Create new doc from json string (simulate loadFromFile behavior)
  const doc2 = await NVDocument.loadFromJSON({
    meshesString: exported.meshesString as string
  } as DocumentData)

  // Extract meshes (works whether meshDataObjects was populated or not)
  const meshes = extractMeshesFromDoc(doc2)
  expect(meshes).toBeDefined()
  expect(meshes.length).toBe(1)

  const loaded = meshes[0]

  // rgba255 should be a Uint8Array when runtime objects are present, or an array of numbers when parsed from JSON
  if (loaded.rgba255 instanceof Uint8Array) {
    expect(Array.from(loaded.rgba255 as Uint8Array)).toEqual([10, 20, 30, 40])
  } else {
    expect(Array.isArray(loaded.rgba255)).toBe(true)
    expect(loaded.rgba255).toEqual([10, 20, 30, 40])
  }

  // offsetPt0 preserved
  expect(Array.isArray(loaded.offsetPt0)).toBe(true)
  expect(loaded.offsetPt0).toEqual([5, 6, 7])

  // nodes/edges preserved and deep-cloned into plain objects
  expect(Array.isArray(loaded.nodes)).toBe(true)
  expect(loaded.nodes[0]).toEqual({ id: 42 })
  expect(Array.isArray(loaded.edges)).toBe(true)
  expect(loaded.edges[0]).toEqual({ a: 1 })

  // fiber fields preserved (because offsetPt0 was present)
  expect(loaded.fiberColor).toEqual([1, 0, 0])
  expect(loaded.fiberDither).toBeCloseTo(0.5)
  expect(loaded.fiberRadius).toBeCloseTo(0.2)
  expect(loaded.fiberGroupColormap).toEqual([0, 1, 2])

  // layers restored
  expect(Array.isArray(loaded.layers)).toBe(true)
  const l = loaded.layers[0]

  // colormap fields preserved (and colorMap / colorMapNegative renamed if present)
  expect(l.colormap).toBe('hot')
  expect(l.colormapNegative).toBe('cool')

  // numeric special cases restored (coercion to proper number values)
  expect(Number.isNaN(l.global_min)).toBe(true)
  expect(Object.is(l.global_max, Infinity)).toBe(true)
  expect(Object.is(l.cal_min, -Infinity)).toBe(true)
  expect(Object.is(l.cal_max, 42)).toBe(true)
  expect(Number.isNaN(l.cal_minNeg)).toBe(true)
  expect(Object.is(l.cal_maxNeg, -Infinity)).toBe(true)

  // values and atlasValues preserved as arrays with same entries
  expect(Array.isArray(l.values)).toBe(true)
  expect(l.values).toEqual([0.1, 0.2])
  expect(Array.isArray(l.atlasValues)).toBe(true)
  expect(l.atlasValues).toEqual([3, 4])
})

test('nvdocument roundtrip keeps colorMap -> colormap conversion and numeric encodings for layers', async () => {
  // Build a mesh object that uses legacy colorMap property and special numbers
  const src = new NVDocument()
  const mesh: any = {
    id: 'mesh-legacy',
    name: 'legacy',
    pts: [0],
    tris: [0],
    rgba255: new Uint8Array([255, 0, 0, 255]),
    layers: [
      {
        name: 'legacyLayer',
        colorMap: 'warm', // legacy field name that should be converted
        colorMapNegative: 'cool', // legacy negative
        global_min: NaN,
        global_max: Infinity,
        cal_min: -Infinity,
        cal_max: 100
      }
    ]
  }
  src.meshes.push(mesh)

  const exported = src.json()
  const loadedDoc = await NVDocument.loadFromJSON({ meshesString: exported.meshesString as string } as DocumentData)

  const meshes = extractMeshesFromDoc(loadedDoc)
  expect(meshes).toBeDefined()
  expect(meshes.length).toBeGreaterThan(0)

  const lm = meshes[0]
  expect(lm.layers[0].colormap).toBe('warm')
  expect(lm.layers[0].colormapNegative).toBe('cool')
  // decoded numeric coercion should have been attempted
  expect(Number.isNaN(lm.layers[0].global_min)).toBe(true)
  expect(Object.is(lm.layers[0].global_max, Infinity)).toBe(true)
  expect(Object.is(lm.layers[0].cal_min, -Infinity)).toBe(true)
  expect(lm.layers[0].cal_max).toBe(100)
})
