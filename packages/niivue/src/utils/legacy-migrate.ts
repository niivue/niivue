// src/utils/legacy-migrate.ts
/**
 * Migration utility for older nvdocument shapes.
 *
 * Exports:
 *  - migrateLegacyDocument(documentData) -> normalized DocumentData
 *  - normalizeMeshForRehydrate(mesh) -> normalized mesh object suitable for rehydrateMeshes
 */

import { deserialize } from '@ungap/structured-clone'
import { DocumentData } from '@/nvdocument' // keep types aligned with your project

// --- helpers --------------------------------------------------------------

function isNumeric(v: any): boolean {
    return typeof v === 'number' && Number.isFinite(v)
}

function stabilizeNumber(n: number, decimals = 12): number {
    if (!isNumeric(n)) {
        return n
    }
    const mag = Math.max(1, Math.abs(n))
    const eps = 1e-9 * mag
    const rounded = Number(n.toFixed(decimals))
    if (Math.abs(n - rounded) <= eps) {
        return rounded
    }
    return n
}

function stabilizeArray(arr: any[], decimals = 12): any[] {
    return arr.map((v) => {
        if (Array.isArray(v)) {
            return stabilizeArray(v, decimals)
        }
        if (isNumeric(v)) {
            return stabilizeNumber(v, decimals)
        }
        return v
    })
}

// Encode special numeric values into strings for safe JSON roundtrip
function specialNumberReplacer(_key: string, value: any): any {
    if (typeof value === 'number') {
        if (Number.isNaN(value)) {
            return 'NaN'
        }
        if (value === Infinity) {
            return 'infinity'
        }
        if (value === -Infinity) {
            return '-infinity'
        }
        return value
    }
    return value
}

/**
 * Try to extract an Array<number> from a value produced by structured-clone
 * or various typed-array serializations.
 */
export function extractNumberArray(maybe: any): number[] | undefined {
    if (maybe === undefined || maybe === null) {
        return undefined
    }
    if (Array.isArray(maybe)) {
        return maybe.slice()
    }
    // typed arrays / ArrayBufferView
    if (ArrayBuffer.isView(maybe)) {
        try {
            return Array.from(maybe as unknown as Iterable<number>)
        } catch (_) {
            /* fallthrough */
        }
    }
    if (typeof maybe === 'object') {
        if (Array.isArray((maybe as any).data)) {
            return (maybe as any).data.slice()
        }
        if (maybe.buffer && Array.isArray(maybe.buffer.data)) {
            return maybe.buffer.data.slice()
        }
        // numeric-keyed object like { "0": v0, "1": v1, length: N }
        const numericKeys = Object.keys(maybe)
            .filter((k) => /^\d+$/.test(k))
            .map((k) => Number(k))
            .sort((a, b) => a - b)
        if (numericKeys.length > 0) {
            try {
                return numericKeys.map((i) => maybe[String(i)])
            } catch (_) {
                /* ignore */
            }
        }
        for (const candidateKey of ['_data', 'source', 'values', 'elements', 'items']) {
            if (Array.isArray((maybe as any)[candidateKey])) {
                return (maybe as any)[candidateKey].slice()
            }
        }
    }
    try {
        const arr = Array.from(maybe as unknown as Iterable<number>)
        if (Array.isArray(arr)) {
            return arr
        }
    } catch (_) {
        /* ignore */
    }
    return undefined
}

// --- per-mesh normalization -----------------------------------------------

/**
 * Convert a single parsed mesh object from legacy shapes to the modern shape
 * used by rehydrateMeshes. This is intentionally defensive and non-destructive.
 */
export function normalizeMeshForRehydrate(meshIn: any): any {
    if (!meshIn || typeof meshIn !== 'object') {
        return meshIn
    }
    const m: any = { ...(meshIn || {}) }

    // 1) pts (vertex positions)
    if ((m.pts === undefined || m.pts === null) && (m.vertices !== undefined || m.positions !== undefined || m.verts !== undefined)) {
        const candidates = [m.vertices, m.positions, m.verts]
        for (const c of candidates) {
            const arr = extractNumberArray(c)
            if (arr && arr.length > 0) {
                m.pts = stabilizeArray(arr)
                break
            }
        }
    } else if (m.pts != null && !Array.isArray(m.pts) && ArrayBuffer.isView(m.pts)) {
        const arr = extractNumberArray(m.pts)
        if (arr) {
            m.pts = stabilizeArray(arr)
        }
    } else if (Array.isArray(m.pts)) {
        m.pts = stabilizeArray(m.pts)
    }

    // 2) tris (triangle indices)
    if ((m.tris === undefined || m.tris === null) && (m.indices !== undefined || m.faces !== undefined || m.cells !== undefined)) {
        const candidates = [m.indices, m.faces, m.cells]
        for (const c of candidates) {
            const arr = extractNumberArray(c)
            if (arr && arr.length > 0) {
                m.tris = arr
                break
            }
        }
    } else if (m.tris != null && !Array.isArray(m.tris) && ArrayBuffer.isView(m.tris)) {
        const arr = extractNumberArray(m.tris)
        if (arr) {
            m.tris = arr
        }
    }

    // 3) rgba255 (colors)
    if ((m.rgba255 === undefined || m.rgba255 === null) && (m.rgba !== undefined || m.color !== undefined || m.colors !== undefined)) {
        const candidates = [m.rgba, m.color, m.colors]
        for (const c of candidates) {
            const arr = extractNumberArray(c)
            if (arr && arr.length > 0) {
                m.rgba255 = arr
                break
            }
        }
    } else if (m.rgba255 != null && !Array.isArray(m.rgba255) && ArrayBuffer.isView(m.rgba255)) {
        const arr = extractNumberArray(m.rgba255)
        if (arr) {
            m.rgba255 = arr
        }
    }

    // 4) offsetPt0 (legacy fiber storage), fiber metadata left intact
    if (m.offsetPt0 != null && !Array.isArray(m.offsetPt0)) {
        const arr = extractNumberArray(m.offsetPt0)
        if (arr) {
            m.offsetPt0 = arr
        }
    }

    // 5) nodes/edges to plain arrays with shallow clones for objects
    if (Array.isArray(m.nodes)) {
        m.nodes = m.nodes.length > 0 && typeof m.nodes[0] === 'object' ? m.nodes.map((n: any) => ({ ...n })) : m.nodes.slice()
    }
    if (Array.isArray(m.edges)) {
        m.edges = m.edges.length > 0 && typeof m.edges[0] === 'object' ? m.edges.map((e: any) => ({ ...e })) : m.edges.slice()
    }

    // 6) normalize layers: rename legacy keys and extract values arrays
    if (Array.isArray(m.layers)) {
        m.layers = m.layers.map((layer: any) => {
            if (!layer || typeof layer !== 'object') {
                return layer
            }
            const lcopy: any = { ...(layer || {}) }

            // Normalize legacy colormap keys to modern names, but prefer any already-present modern keys.
            if ('colorMap' in lcopy) {
                if (!('colormap' in lcopy)) {
                    lcopy.colormap = lcopy.colorMap
                }
                // remove legacy key
                delete lcopy.colorMap
            }
            if ('colorMapNegative' in lcopy) {
                if (!('colormapNegative' in lcopy)) {
                    lcopy.colormapNegative = lcopy.colorMapNegative
                }
                // remove legacy key
                delete lcopy.colorMapNegative
            }

            // decode numeric strings if present (lightweight)
            for (const k of ['global_min', 'global_max', 'cal_min', 'cal_max', 'cal_minNeg', 'cal_maxNeg']) {
                if (typeof lcopy[k] === 'string') {
                    const v = lcopy[k]
                    if (v === 'infinity') {
                        lcopy[k] = Infinity
                    } else if (v === '-infinity') {
                        lcopy[k] = -Infinity
                    } else if (v === 'NaN') {
                        lcopy[k] = NaN
                    } else {
                        const n = Number(v)
                        if (!Number.isNaN(n)) {
                            lcopy[k] = n
                        }
                    }
                }
            }

            if (lcopy.values != null && !Array.isArray(lcopy.values)) {
                const ev = extractNumberArray(lcopy.values)
                if (ev) {
                    lcopy.values = stabilizeArray(ev)
                }
            } else if (Array.isArray(lcopy.values)) {
                lcopy.values = stabilizeArray(lcopy.values)
            }

            if (lcopy.atlasValues != null && !Array.isArray(lcopy.atlasValues)) {
                const ev = extractNumberArray(lcopy.atlasValues)
                if (ev) {
                    lcopy.atlasValues = ev
                }
            }

            return lcopy
        })
    }

    return m
}

// --- meshesString normalization ------------------------------------------

function normalizeMeshesString(meshesString: any): string | undefined {
    if (typeof meshesString !== 'string') {
        return undefined
    }
    const trimmed = meshesString.trim()
    if (trimmed.length === 0) {
        return meshesString
    }
    try {
        const parsed = JSON.parse(meshesString)

        // Detect structured-clone serialized form: array of small objects with numeric keys 0 and 1
        const looksLikeStructuredClone = Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null && '0' in parsed[0] && '1' in parsed[0]

        if (looksLikeStructuredClone) {
            // Use deserialize to reconstruct original objects, then normalize them
            try {
                const des = deserialize(parsed as unknown as any) as any[] // reconstructs typed arrays / objects
                if (Array.isArray(des)) {
                    const normalized = des.map((mx: any) => normalizeMeshForRehydrate(mx))
                    return JSON.stringify(normalized, specialNumberReplacer)
                }
                // fallback: if deserialize produced something unexpected, continue below
            } catch (deserErr) {
                // if deserialize fails, fall through to legacy parsing below
                console.warn('legacy-migrate: structured-clone deserialize failed', deserErr)
            }
        }

        // If not structured-clone or deserialize didn't work, handle the usual JSON array case
        if (!Array.isArray(parsed)) {
            // try to locate inner array if serialize() produced wrapper
            const maybeArrayCandidates = ['value', 'data', '0']
            for (const c of maybeArrayCandidates) {
                if (parsed && Array.isArray((parsed as any)[c])) {
                    const arr = (parsed as any)[c]
                    const norm = arr.map((mx: any) => normalizeMeshForRehydrate(mx))
                    return JSON.stringify(norm, specialNumberReplacer)
                }
            }
            return meshesString
        }
        const normalized = parsed.map((mx: any) => normalizeMeshForRehydrate(mx))
        return JSON.stringify(normalized, specialNumberReplacer)
    } catch (e) {
        return meshesString
    }
}

// --- document-level migration -------------------------------------------

/**
 * Top-level migrateLegacyDocument function.
 * Takes a DocumentData-ish object and returns a normalized DocumentData object (shallow clone).
 */
export function migrateLegacyDocument(input: DocumentData | any | undefined): DocumentData {
    if (!input || typeof input !== 'object') {
        return input as DocumentData
    }

    const doc: any = { ...(input || {}) }

    // normalize root-level legacy colormap names
    if ('colorMap' in doc && !('colormap' in doc)) {
        doc.colormap = doc.colorMap
    }
    if ('colorMapNegative' in doc && !('colormapNegative' in doc)) {
        doc.colormapNegative = doc.colorMapNegative
    }

    // imageOptionsArray: convert typed-array-ish colormap fields and decode numeric strings
    if (Array.isArray(doc.imageOptionsArray)) {
        doc.imageOptionsArray = doc.imageOptionsArray.map((io: any) => {
            if (!io || typeof io !== 'object') {
                return io
            }
            const copy = { ...(io || {}) }
            for (const k of ['cal_min', 'cal_max', 'cal_minNeg', 'cal_maxNeg']) {
                if (typeof copy[k] === 'string') {
                    if (copy[k] === 'infinity') {
                        copy[k] = Infinity
                    } else if (copy[k] === '-infinity') {
                        copy[k] = -Infinity
                    } else if (copy[k] === 'NaN') {
                        copy[k] = NaN
                    } else {
                        const n = Number(copy[k])
                        if (!Number.isNaN(n)) {
                            copy[k] = n
                        }
                    }
                }
            }
            if (copy.colormap && !Array.isArray(copy.colormap)) {
                const arr = extractNumberArray(copy.colormap)
                if (arr) {
                    copy.colormap = arr
                }
            }
            if (copy.colormapNegative && !Array.isArray(copy.colormapNegative)) {
                const arr = extractNumberArray(copy.colormapNegative)
                if (arr) {
                    copy.colormapNegative = arr
                }
            }
            return copy
        })
    }

    // meshesString normalization
    if (typeof doc.meshesString === 'string' && doc.meshesString.trim().length > 0) {
        const normalized = normalizeMeshesString(doc.meshesString)
        if (typeof normalized === 'string') {
            doc.meshesString = normalized
        }
    }

    // Ensure labels/connectomes/encodedImageBlobs are plain arrays where possible
    if (doc.labels && !Array.isArray(doc.labels)) {
        try {
            doc.labels = Array.from(doc.labels)
        } catch (_) {
            /* leave as-is */
        }
    }
    if (doc.connectomes && !Array.isArray(doc.connectomes)) {
        try {
            doc.connectomes = Array.from(doc.connectomes)
        } catch (_) {
            /* leave as-is */
        }
    }
    if (doc.encodedImageBlobs && !Array.isArray(doc.encodedImageBlobs)) {
        try {
            doc.encodedImageBlobs = Array.from(doc.encodedImageBlobs)
        } catch (_) {
            /* leave as-is */
        }
    }

    return doc as DocumentData
}

export default migrateLegacyDocument
