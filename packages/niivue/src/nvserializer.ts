// src/nvserializer.ts
import { NVUtilities } from '@/nvutilities'
import { NVImage, NVIMAGE_TYPE, ImageFromUrlOptions } from '@/nvimage'
import { NVMesh, MeshType } from '@/nvmesh'
import { NVConnectome } from '@/nvconnectome'
import { log } from '@/logger'
import { NVDocument, DEFAULT_OPTIONS, DocumentData, ExportDocumentData, INITIAL_SCENE_DATA } from '@/nvdocument'
import { vec3, vec4 } from 'gl-matrix'
import { migrateLegacyDocument, normalizeMeshForRehydrate } from '@/utils/legacy-migrate' // shared migration utility

/** Helpers for special numeric encoding */
function encodeNumberForJSON(v: number | null | undefined): number | string | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (Number.isFinite(v)) return v
  if (v === Infinity) return 'infinity'
  if (v === -Infinity) return '-infinity'
  return 'NaN'
}
function decodeNumberFromJSON(v: any): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v === 'number') return v
  if (v === 'NaN') return NaN
  if (v === 'infinity') return Infinity
  if (v === '-infinity') return -Infinity
  const n = Number(v)
  return Number.isNaN(n) ? NaN : n
}

/** Small safe conversion helper that handles arrays, typed arrays, iterables. */
function toPlainArray<T>(maybe: any): T[] | undefined {
  if (maybe === undefined || maybe === null) return undefined
  if (Array.isArray(maybe)) return maybe.slice()
  try {
    // cast via unknown to satisfy TS when given typed arrays / arraybufferviews
    return Array.from(maybe as unknown as Iterable<T>)
  } catch (e) {
    return undefined
  }
}

/** 
 * Convert array-like to Float32Array.
 * Returns undefined if input is null/undefined.
 */
function toFloat32Array(maybe: any): Float32Array | undefined {
  if (maybe === undefined || maybe === null) return undefined
  if (maybe instanceof Float32Array) return maybe
  if (Array.isArray(maybe)) return new Float32Array(maybe)
  if (ArrayBuffer.isView(maybe)) {
    return new Float32Array(Array.from(maybe as unknown as Iterable<number>))
  }
  try {
    return new Float32Array(Array.from(maybe as unknown as Iterable<number>))
  } catch (e) {
    return undefined
  }
}

/** 
 * Convert array-like to Uint32Array.
 * Returns undefined if input is null/undefined.
 */
function toUint32Array(maybe: any): Uint32Array | undefined {
  if (maybe === undefined || maybe === null) return undefined
  if (maybe instanceof Uint32Array) return maybe
  if (Array.isArray(maybe)) return new Uint32Array(maybe)
  if (ArrayBuffer.isView(maybe)) {
    return new Uint32Array(Array.from(maybe as unknown as Iterable<number>))
  }
  try {
    return new Uint32Array(Array.from(maybe as unknown as Iterable<number>))
  } catch (e) {
    return undefined
  }
}

/** 
 * Convert array-like to Uint8Array.
 * Returns undefined if input is null/undefined.
 */
function toUint8Array(maybe: any): Uint8Array | undefined {
  if (maybe === undefined || maybe === null) return undefined
  if (maybe instanceof Uint8Array) return maybe
  if (Array.isArray(maybe)) return new Uint8Array(maybe)
  if (ArrayBuffer.isView(maybe)) {
    return new Uint8Array(Array.from(maybe as unknown as Iterable<number>))
  }
  try {
    return new Uint8Array(Array.from(maybe as unknown as Iterable<number>))
  } catch (e) {
    return undefined
  }
}

/** replacer to convert typed arrays / array buffers to plain arrays for JSON.stringify */
function jsonReplacer(_key: string, value: any): any {
  if (typeof value === 'function') return undefined
  if (typeof value === 'symbol') return undefined

  // Typed arrays & DataView -> array of numbers
  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView) {
      return Array.from(new Uint8Array((value as DataView).buffer, (value as DataView).byteOffset, (value as DataView).byteLength))
    }
    // cast through unknown to avoid TS complaining about missing iterator
    return Array.from(value as unknown as Iterable<number>)
  }

  if (value instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(value))
  }

  return value
}

export class NVSerializer {

  /**
   * Decode/normalize "opts" encoded form into NVConfigOptions shape.
   * Move the decodeOptsFromJSON logic here (serializer owns encoding/decoding).
   */
  static decodeOptsFromJSON(opts: any): any {
    if (opts === undefined || opts === null) return undefined

    const decodeRecursive = (v: any): any => {
      if (v === undefined) return undefined
      if (v === null) return null
      if (typeof v === 'number') return v
      if (typeof v === 'string') {
        // try to decode special numeric strings
        if (v === 'NaN') return NaN
        if (v === 'infinity') return Infinity
        if (v === '-infinity') return -Infinity
        return v
      }
      if (Array.isArray(v)) return v.map((el) => decodeRecursive(el))
      if (typeof v === 'object') {
        const out: any = {}
        for (const k of Object.keys(v)) out[k] = decodeRecursive(v[k])
        return out
      }
      return v
    }

    const out: any = {}
    for (const k of Object.keys(opts)) {
      const val = opts[k]
      if (val === undefined) continue
      out[k] = decodeRecursive(val)
    }
    return out
  }

  /**
   * Serialize an NVDocument-like object into ExportDocumentData (same shape as NVDocument.json)
   * (This function mirrors the responsibilities of NVDocument.json in your code).
   */
  static serializeDocument(document: any, embedImages = true, embedDrawing = true): ExportDocumentData {
    const out: Partial<ExportDocumentData> = {
      encodedImageBlobs: [],
      previewImageDataURL: document.previewImageDataURL ?? '',
      imageOptionsMap: new Map<string, number>()
    }

    out.sceneData = { ...(document.scene?.sceneData ?? {}) }
    out.opts = document.opts ?? {}
    out.labels = Array.isArray(document.labels) ? document.labels.map((l: any) => {
      const copy = { ...(l || {}) }
      delete copy.onClick
      return copy
    }) : []

    out.customData = document.customData ?? ''
    out.completedMeasurements = document.completedMeasurements ? document.completedMeasurements.slice() : []
    out.completedAngles = document.completedAngles ? document.completedAngles.slice() : []

    // images
    const imageOptionsArray: any[] = []
    const volumes = document.volumes ?? []
    if (volumes.length) {
      for (let i = 0; i < volumes.length; i++) {
        const v = volumes[i]
        let imageOptions = document.getImageOptions ? document.getImageOptions(v) : null
        if (imageOptions === null) {
          // fallback minimal options
          imageOptions = {
            name: v?.name ?? '',
            colormap: v?._colormap ?? 'gray',
            opacity: v?._opacity ?? 1.0,
            cal_min: v?.cal_min ?? NaN,
            cal_max: v?.cal_max ?? NaN,
            trustCalMinMax: v?.trustCalMinMax ?? true,
            percentileFrac: v?.percentileFrac ?? 0.02,
            ignoreZeroVoxels: v?.ignoreZeroVoxels ?? false,
            imageType: v?.imageType ?? NVIMAGE_TYPE.NII,
            frame4D: v?.frame4D ?? 0,
            limitFrames4D: v?.limitFrames4D ?? NaN,
            url: v?.url ?? '',
            urlImageData: v?.urlImgData ?? '',
            cal_minNeg: v?.cal_minNeg ?? NaN,
            cal_maxNeg: v?.cal_maxNeg ?? NaN,
            colorbarVisible: v?.colorbarVisible ?? true
          }
        } else {
          if (!('imageType' in imageOptions)) {
            imageOptions.imageType = NVIMAGE_TYPE.NII
          }
        }

        imageOptions.colormap = v.colormap
        imageOptions.colormapLabel = v.colormapLabel
        imageOptions.opacity = v.opacity
        imageOptions.cal_max = v.cal_max ?? NaN
        imageOptions.cal_min = v.cal_min ?? NaN

        imageOptionsArray.push(imageOptions)

        if (embedImages) {
          const blob = NVUtilities.uint8tob64(v.toUint8Array())
          out.encodedImageBlobs!.push(blob)
        }
        out.imageOptionsMap!.set(v.id, i)
      }
    }
    out.imageOptionsArray = imageOptionsArray

    // meshes: build safe clones and convert typed arrays to plain arrays
    const meshesForExport: any[] = []
    const meshes = document.meshes || []
    out.connectomes = []
    for (const mesh of meshes) {
      if (!mesh || typeof mesh !== 'object') continue
      if (mesh.type === MeshType.CONNECTOME) {
        try { out.connectomes!.push(JSON.stringify((mesh as NVConnectome).json())) } catch (e) { log.warn('serializeDocument: failed connectome export', e) }
        continue
      }

      // build layers
      const layersForExport = (mesh.layers || []).map((layer: any) => {
        const exported: any = {
          name: layer?.name,
          key: layer?.key,
          url: layer?.url,
          headers: layer?.headers,
          opacity: layer?.opacity,
          colormap: layer?.colorMap ?? layer?.colormap,
          colormapNegative: layer?.colorMapNegative ?? layer?.colormapNegative,
          colormapInvert: layer?.colormapInvert,
          colormapLabel: layer?.colormapLabel,
          useNegativeCmap: layer?.useNegativeCmap,
          // numeric meta
          global_min: encodeNumberForJSON(layer?.global_min),
          global_max: encodeNumberForJSON(layer?.global_max),
          cal_min: encodeNumberForJSON(layer?.cal_min),
          cal_max: encodeNumberForJSON(layer?.cal_max),
          cal_minNeg: encodeNumberForJSON(layer?.cal_minNeg),
          cal_maxNeg: encodeNumberForJSON(layer?.cal_maxNeg),
          isAdditiveBlend: layer?.isAdditiveBlend,
          frame4D: layer?.frame4D,
          nFrame4D: layer?.nFrame4D,
          outlineBorder: layer?.outlineBorder,
          isTransparentBelowCalMin: layer?.isTransparentBelowCalMin,
          colormapType: layer?.colormapType,
          base64: layer?.base64,
          colorbarVisible: layer?.colorbarVisible,
          showLegend: layer?.showLegend
        }

        if (layer?.values != null) {
          const vals = Array.isArray(layer.values) ? layer.values.slice() : Array.from(layer.values as unknown as Iterable<number> || [])
          exported.values = vals.map((v: any) => {
            const num = Number(v)
            return Number.isFinite(num) ? Math.round(num * 1e12) / 1e12 : num
          })
        }
        if (layer?.atlasValues != null) {
          exported.atlasValues = Array.isArray(layer.atlasValues) ? layer.atlasValues.slice() : Array.from(layer.atlasValues as unknown as Iterable<number> || [])
        }
        if (Array.isArray(layer?.labels)) {
          exported.labels = layer.labels.map((l: any) => ({ ...(l || {}) }))
        } else if (layer?.labels != null) {
          exported.labels = Array.from(layer.labels as unknown as Iterable<any> || [])
        }
        return exported
      })

      const meshCopy: any = {
        ...Object.assign({}, mesh || {}),
        rgba255: Array.from(mesh.rgba255 || []),
        layers: layersForExport,
        edges: Array.isArray(mesh?.edges) ? mesh.edges.map((e: any) => ({ ...(e || {}) })) : [],
        nodes: Array.isArray(mesh?.nodes) ? mesh.nodes.map((n: any) => ({ ...(n || {}) })) : mesh?.nodes,
        offsetPt0: Array.isArray(mesh?.offsetPt0) ? [...mesh.offsetPt0] : mesh?.offsetPt0
      }

      // fiber fields
      if (Array.isArray(mesh.offsetPt0) && mesh.offsetPt0.length > 0) {
        meshCopy.offsetPt0 = Array.isArray(mesh.offsetPt0) ? [...mesh.offsetPt0] : mesh.offsetPt0
        if (Array.isArray(mesh.fiberGroupColormap)) meshCopy.fiberGroupColormap = [...mesh.fiberGroupColormap]
        if (Array.isArray(mesh.fiberColor)) meshCopy.fiberColor = Array.from(mesh.fiberColor)
        meshCopy.fiberDither = mesh.fiberDither
        meshCopy.fiberRadius = mesh.fiberRadius
        meshCopy.colormap = mesh.colormap
      }

      meshesForExport.push(meshCopy)
    }

    try {
      out.meshesString = JSON.stringify(meshesForExport, jsonReplacer)
    } catch (err) {
      log.warn('serializeDocument: JSON.stringify failed for meshes', err)
      // fallback: per-mesh serialization
      const per: string[] = []
      for (let i = 0; i < meshesForExport.length; i++) {
        try {
          per.push(JSON.stringify(meshesForExport[i], jsonReplacer))
        } catch (e) {
          log.error('serializeDocument: failed to serialize mesh at index', i, e, meshesForExport[i])
          per.push(JSON.stringify({ name: meshesForExport[i]?.name ?? 'unknown', id: meshesForExport[i]?.id ?? null }))
        }
      }
      out.meshesString = `[${per.join(',')}]`
    }

    if (embedDrawing && document.drawBitmap) {
      out.encodedDrawingBlob = NVUtilities.uint8tob64(document.drawBitmap)
    } else {
      out.encodedDrawingBlob = document.encodedDrawingBlob ?? ''
    }

    out.title = document.title ?? 'untitled'
    out.customData = document.customData ?? ''
    out.labels = Array.isArray(document.labels) ? document.labels.map((l: any) => {
      const copy = { ...(l || {}) }
      delete copy.onClick
      return copy
    }) : []

    // Export completed measurements & angles (clone vectors/objects so they survive JSON roundtrip)
    out.completedMeasurements = (document.completedMeasurements || []).map((m: any) => ({
      ...m,
      startMM: Array.isArray(m.startMM) ? [...m.startMM] : m.startMM,
      endMM: Array.isArray(m.endMM) ? [...m.endMM] : m.endMM
    }))

    out.completedAngles = (document.completedAngles || []).map((a: any) => ({
      ...a,
      firstLineMM: {
        start: Array.isArray(a.firstLineMM?.start) ? [...a.firstLineMM.start] : a.firstLineMM?.start,
        end: Array.isArray(a.firstLineMM?.end) ? [...a.firstLineMM.end] : a.firstLineMM?.end
      },
      secondLineMM: {
        start: Array.isArray(a.secondLineMM?.start) ? [...a.secondLineMM.start] : a.secondLineMM?.start,
        end: Array.isArray(a.secondLineMM?.end) ? [...a.secondLineMM.end] : a.secondLineMM?.end
      }
    }))

    // Make sure sceneData and opts are included (you already had these, but double-check)
    out.sceneData = out.sceneData ?? { ...(document.scene?.sceneData ?? {}) }
    out.opts = out.opts ?? (document.opts ? { ...(document.opts as any) } : {})

    return out as ExportDocumentData
  }

  /**
   * Rehydrate images into NVImage instances using NVImage.new
   */
  static async rehydrateImages(documentData: DocumentData): Promise<NVImage[]> {
    console.log('NVSerializer.rehydrateImages: start')
    const imgs: NVImage[] = []

    // Normalize legacy shapes first
    const migrated = await migrateLegacyDocument(documentData)

    const encoded = migrated.encodedImageBlobs ?? []
    const optsArr = migrated.imageOptionsArray ?? []

    for (let i = 0; i < optsArr.length; i++) {
      const imageOptions = { ...(optsArr[i] || {}) } as any
      try {
        const b64 = encoded[i]
        if (!b64) {
          log.debug('NVSerializer.rehydrateImages: no blob for index', i)
          continue
        }
        const u8 = await NVUtilities.b64toUint8(b64)
        if (!u8) { log.warn('NVSerializer.rehydrateImages: b64toUint8 returned empty for index', i); continue }

        const name = imageOptions.name ?? imageOptions.url ?? `image-${i}`
        // Ensure colormap keys are strings when we call color-table lookups.
        // Legacy data sometimes stores colormaps in typed-array / object shapes —
        // guard against that so colormapFromKey(name) doesn't throw.
        let colormap: string | any[] = imageOptions.colormap ?? imageOptions.colorMap ?? ''
        if (typeof colormap !== 'string') {
        // Prefer the explicitly provided colorMap string if present
        if (typeof imageOptions.colorMap === 'string') {
            colormap = imageOptions.colorMap
        } else {
            // otherwise treat as "no named colormap" so colour-table lookup won't be attempted
            colormap = ''
        }
        }

        const opacity = imageOptions.opacity ?? 1.0

        const pairedImgData = imageOptions.pairedImgData ? (typeof imageOptions.pairedImgData === 'string' ? (await NVUtilities.b64toUint8(imageOptions.pairedImgData)).buffer : imageOptions.pairedImgData) : null
        const cal_min = decodeNumberFromJSON(imageOptions.cal_min)
        const cal_max = decodeNumberFromJSON(imageOptions.cal_max)
        const trustCalMinMax = imageOptions.trustCalMinMax ?? true
        const percentileFrac = imageOptions.percentileFrac ?? 0.02
        const ignoreZeroVoxels = imageOptions.ignoreZeroVoxels ?? false
        const useQFormNotSForm = imageOptions.useQFormNotSForm ?? false
        const colormapNegative = imageOptions.colormapNegative ?? ''
        const frame4D = imageOptions.frame4D ?? 0
        const imageType = ('imageType' in imageOptions && typeof imageOptions.imageType === 'number') ? imageOptions.imageType : (imageOptions.imageType ?? NVIMAGE_TYPE.UNKNOWN)
        const cal_minNeg = decodeNumberFromJSON(imageOptions.cal_minNeg)
        const cal_maxNeg = decodeNumberFromJSON(imageOptions.cal_maxNeg)
        const colorbarVisible = imageOptions.colorbarVisible ?? true
        const colormapLabel = imageOptions.colormapLabel ?? null
        const colormapType = imageOptions.colormapType ?? 0
        const zarrData = imageOptions.zarrData ?? null

        // ensure ArrayBuffer argument
        console.log(`Image ${i} buffer length: ${u8.byteLength}`);

        // Check if the data is actually all zeros before Niivue gets it
        const isAllZeros = !u8.some(val => val !== 0);
        if (isAllZeros) {
          console.error(`CRITICAL: Base64 decoding for ${name} resulted in an all-zero array!`);
        }

        const bufferArg = u8.slice().buffer;

        const img = await NVImage.new(
          bufferArg,
          name,
          colormap as string,
          opacity,
          pairedImgData,
          cal_min as any,
          cal_max as any,
          trustCalMinMax,
          percentileFrac,
          ignoreZeroVoxels,
          useQFormNotSForm,
          colormapNegative,
          frame4D,
          imageType,
          cal_minNeg as any,
          cal_maxNeg as any,
          colorbarVisible,
          colormapLabel,
          colormapType,
          zarrData
        )
        imgs.push(img)
      } catch (err) {
        log.warn('NVSerializer.rehydrateImages: failed for index', i, err)
      }
    }
    return imgs
  }

  /**
   * Rehydrate meshes into runtime NVMesh instances.
   * If gl is provided and callUpdateMesh=true, updateMesh(gl) will be called.
   *
   * CRITICAL FIX: Properly convert arrays to TypedArrays before passing to NVMesh constructor
   * to avoid "underspecified mesh" warnings.
   */
  static async rehydrateMeshes(documentData: DocumentData, gl?: WebGL2RenderingContext, callUpdateMesh = false): Promise<Array<NVMesh | any>> {
    console.log('NVSerializer.rehydrateMeshes: start')
    const out: Array<NVMesh | any> = []

    // Normalize legacy shapes first
    const migrated = await migrateLegacyDocument(documentData)

    // Defensive logging: show what migrated contains at a glance
    try {
    console.log('NVSerializer.rehydrateMeshes: migrated keys:', Object.keys(migrated || {}).slice(0, 20))
    } catch (e) {
    console.warn('NVSerializer.rehydrateMeshes: error logging migrated', e)
    }

    const meshesString = migrated.meshesString ?? '[]'

    // Diagnostic logging to capture the exact string being parsed in the unit test
    try {
    if (typeof meshesString === 'string') {
        const preview = meshesString.length > 200 ? meshesString.slice(0, 200) + '…' : meshesString
        console.log('NVSerializer.rehydrateMeshes: meshesString preview:', preview)
    } else {
        console.log('NVSerializer.rehydrateMeshes: meshesString is non-string of type', typeof meshesString, meshesString)
    }
    } catch (e) {
    console.warn('NVSerializer.rehydrateMeshes: error logging meshesString', e)
    }

    let parsed: any[] = []
    try {
      parsed = JSON.parse(meshesString)
    } catch (e) {
      console.warn('NVSerializer.rehydrateMeshes: failed to parse meshesString', e)
      parsed = []
    }

    for (let i = 0; i < parsed.length; i++) {
      let m = parsed[i] || {}
      try {
        m = normalizeMeshForRehydrate(m)
        console.log(`NVSerializer.rehydrateMeshes: processing mesh index ${i} name="${m.name}"`, m)
        // Normalize layer keys and numeric encodings (colorMap -> colormap etc.)
        if (Array.isArray(m.layers)) {
          for (const layer of m.layers) {
            if (!layer) continue
            if ('colorMap' in layer && !('colormap' in layer)) {
              layer.colormap = layer.colorMap
              delete layer.colorMap
            }
            if ('colorMapNegative' in layer && !('colormapNegative' in layer)) {
              layer.colormapNegative = layer.colorMapNegative
              delete layer.colorMapNegative
            }

            // decode special numeric strings (in case encodeNumberForJSON used)
            layer.global_min = decodeNumberFromJSON(layer.global_min)
            layer.global_max = decodeNumberFromJSON(layer.global_max)
            layer.cal_min = decodeNumberFromJSON(layer.cal_min)
            layer.cal_max = decodeNumberFromJSON(layer.cal_max)
            layer.cal_minNeg = decodeNumberFromJSON(layer.cal_minNeg)
            layer.cal_maxNeg = decodeNumberFromJSON(layer.cal_maxNeg)

            // ensure values/atlasValues are plain arrays (migration already attempted to normalize)
            if (layer.values != null && !Array.isArray(layer.values)) {
              try { layer.values = Array.from(layer.values) } catch (e) { /* leave as-is */ }
            }
            if (layer.atlasValues != null && !Array.isArray(layer.atlasValues)) {
              try { layer.atlasValues = Array.from(layer.atlasValues) } catch (e) { /* leave as-is */ }
            }
          }
        }

        // CRITICAL: Convert arrays to proper TypedArrays BEFORE creating NVMesh
        // This prevents the "underspecified mesh" warning in updateMesh

        // Convert rgba255 to Uint8Array
        const rgba255 = toUint8Array(m.rgba255) ?? new Uint8Array([255, 255, 255, 255])

        // Convert pts to Float32Array (vertex positions)
        const pts = toFloat32Array(m.pts)

        // Convert tris to Uint32Array (triangle indices)
        let tris = toUint32Array(m.tris)

        // ensure nodes/edges plain arrays
        if (Array.isArray(m.nodes)) {
          m.nodes = m.nodes.length > 0 && typeof m.nodes[0] === 'object' ? m.nodes.map((n:any)=>({...n})) : m.nodes.slice()
        }
        if (Array.isArray(m.edges)) {
          m.edges = m.edges.length > 0 && typeof m.edges[0] === 'object' ? m.edges.map((e:any)=>({...e})) : m.edges.slice()
        }

        // preserve id if present (important)
        const persistedId = m.id !== undefined ? m.id : null

        // If no GL provided, keep as plain object (tests may parse/expect object form)
        if (!gl) {
          // For test environments, keep arrays as-is
          out.push(m)
          continue
        }

        // Handle fiber meshes: offsetPt0 becomes tris
        if (Array.isArray(m.offsetPt0) && m.offsetPt0.length > 0) {
          tris = new Uint32Array(m.offsetPt0)
          // Set alpha to 0 for fibers
          if (rgba255) {
            rgba255[3] = 0
          }
        }

        // Construct NVMesh with proper TypedArrays
        // 1. Ensure we have a Uint8Array.
        // 2. If it's already a Uint8Array, we wrap it to ensure the buffer type matches.
        const finalizedRgba = Array.isArray(rgba255)
          ? new Uint8Array(rgba255)
          : new Uint8Array((rgba255 as Uint8Array).buffer)

        const meshInstance = new NVMesh(
          pts,
          tris,
          m.name,
          finalizedRgba as Uint8Array<ArrayBuffer>,
          m.opacity,
          m.visible,
          gl,
          m.connectome,
          m.dpg,
          m.dps,
          m.dpv
        );

        // restore preserved id (overwrite generated id)
        if (persistedId !== null) {
          (meshInstance as any).id = persistedId
        }

        // fiber metadata
        if (Array.isArray(m.offsetPt0) && m.offsetPt0.length > 0) {
          meshInstance.fiberGroupColormap = m.fiberGroupColormap
          meshInstance.fiberColor = m.fiberColor ? m.fiberColor : undefined
          meshInstance.fiberDither = m.fiberDither
          meshInstance.fiberRadius = m.fiberRadius
          meshInstance.colormap = m.colormap
        }

        // layers & shader index
        meshInstance.meshShaderIndex = m.meshShaderIndex
        meshInstance.layers = m.layers || []

        if (callUpdateMesh) {
          try {
            meshInstance.updateMesh(gl)
          } catch (e) {
            console.warn('NVSerializer.rehydrateMeshes: updateMesh failed for idx', i, e)
          }
        }

        out.push(meshInstance)
      } catch (err) {
        console.warn('NVSerializer.rehydrateMeshes: failed idx', i, err)
        // push the plain object as fallback so lengths/indices remain stable
        out.push(m)
      }
    }

    // Defensive: guarantee an array is returned for all (possibly-legacy) inputs.
    try {
    // Defensive: guarantee an array is returned for all (possibly-legacy) inputs.
    if (!Array.isArray(out)) {
        console.warn('NVSerializer.rehydrateMeshes: unexpected non-array output, coercing to array', {
        typeofOut: typeof out,
        isArray: Array.isArray(out),
        outPreview: out && (typeof out === 'object' ? Object.keys(out).slice(0,10) : out)
        })
        return out ? [out] : []
    }

    console.log('NVSerializer.rehydrateMeshes: completed successfully, returning array length=', out.length)
    return out
    } catch (err) {
    console.error('NVSerializer.rehydrateMeshes: final-return error', err)
    return []
    }


  }

  static async deserializeDocument(documentData: DocumentData): Promise<NVDocument> {
    // run migration to normalize legacy shapes up-front
    const migrated = await migrateLegacyDocument(documentData)

    // Create a fresh NVDocument
    const document = new NVDocument()

    // Basic top-level fields (preserve defaults where missing)
    Object.assign(document.data, {
      ...migrated,
      imageOptionsArray: migrated.imageOptionsArray ?? [],
      encodedImageBlobs: migrated.encodedImageBlobs ?? [],
      labels: migrated.labels ?? [],
      meshOptionsArray: migrated.meshOptionsArray ?? [],
      connectomes: migrated.connectomes ?? [],
      encodedDrawingBlob: migrated.encodedDrawingBlob ?? '',
      previewImageDataURL: migrated.previewImageDataURL ?? '',
      customData: migrated.customData ?? '',
      title: migrated.title ?? 'untitled'
    })

    // decode opts and merge with defaults
    const decodedOpts = NVSerializer.decodeOptsFromJSON((migrated as any).opts as any)
    document.data.opts = {
      ...DEFAULT_OPTIONS,
      ...(decodedOpts || {})
    } as any

    if ((document.data.opts as any).meshThicknessOn2D === 'infinity') {
      (document.data.opts as any).meshThicknessOn2D = Infinity
    }

    // scene data (merge with initial scene)
    document.scene.sceneData = {
      ...INITIAL_SCENE_DATA,
      ...(migrated.sceneData || {})
    }

    // back-compat: single clipPlane fields -> arrays
    const sceneDataAny: any = migrated.sceneData || {}
    if (sceneDataAny.clipPlane && !sceneDataAny.clipPlanes) {
      document.scene.sceneData.clipPlanes = [sceneDataAny.clipPlane]
    }
    if (sceneDataAny.clipPlaneDepthAziElev && !sceneDataAny.clipPlaneDepthAziElevs) {
      document.scene.sceneData.clipPlaneDepthAziElevs = [sceneDataAny.clipPlaneDepthAziElev]
    }

    // restore completed measurements & angles (clone vectors)
    if (migrated.completedMeasurements) {
      document.completedMeasurements = migrated.completedMeasurements.map((m: any) => ({
        ...m,
        startMM: vec3.clone(m.startMM),
        endMM: vec3.clone(m.endMM)
      }))
    }
    if (migrated.completedAngles) {
      document.completedAngles = migrated.completedAngles.map((a: any) => ({
        ...a,
        firstLineMM: {
          start: vec3.clone(a.firstLineMM.start),
          end: vec3.clone(a.firstLineMM.end)
        },
        secondLineMM: {
          start: vec3.clone(a.secondLineMM.start),
          end: vec3.clone(a.secondLineMM.end)
        }
      }))
    }

    // keep other runtime lists in sync
    // preserve connectome strings (Niivue.loadDocument adds them as runtime meshes later)
    document.data.connectomes = migrated.connectomes ?? []

    // drawing blob stays as encoded base64 (consumer will decode)
    document.data.encodedDrawingBlob = migrated.encodedDrawingBlob ?? ''

    // preview image
    document.data.previewImageDataURL = migrated.previewImageDataURL ?? ''

    return document
  }
}

export default NVSerializer
