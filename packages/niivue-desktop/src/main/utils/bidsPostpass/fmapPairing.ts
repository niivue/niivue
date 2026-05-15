// Fmap-to-target pairing for the import post-pass. Ports `_find_fmap_groups`,
// `_find_compatible`, `_select_closest`, `_populate_b0_fields`, and the
// supporting helpers from reproinx.py.
//
// The pairing emits modern BIDS `B0FieldIdentifier` (on every fmap sidecar
// in a used group) and `B0FieldSource` (on every target sidecar that
// selected one), mirroring heudiconv's POPULATE_INTENDED_FOR_OPTS with
// MATCHING_PARAMETERS = ("ImagingVolume", "Shims") and the Closest-in-
// time tie-break.

import { type Affine, type Shape3, getBestAffine } from './affine.js'
import { paramsMatch } from './allclose.js'
import type { PostPassFs } from './fs.js'
import { readNiftiHeaderBytes } from './headerReader.js'
import { parseNiftiHeader } from './niftiHeader.js'
import { hmsSeconds } from './scansTsv.js'
import { parseSidecar, serializeSidecar } from './sidecarJson.js'

export interface SidecarEdit {
  path: string
  content: string
}

const FMAP_SUFFIX_RE =
  /(_dir-[A-Za-z0-9]+)?(_phase[12])?(_phasediff)?(_magnitude[12])?(_fieldmap)?/g

export function stripFmapSuffix(stem: string): string {
  return stem.replace(FMAP_SUFFIX_RE, '')
}

/**
 * Group fmap-dir JSON stems by their suffix-stripped prefix. Returns a
 * Map keyed by group prefix, values are the member stems (sorted). The
 * Map's insertion order is sorted-prefix order to match reproinx.py's
 * `sorted({...})` step.
 */
export function findFmapGroups(jsonStems: ReadonlyArray<string>): Map<string, string[]> {
  const sortedStems = [...jsonStems].sort()
  const prefixes = new Set<string>()
  for (const s of sortedStems) prefixes.add(stripFmapSuffix(s))
  const sortedPrefixes = [...prefixes].sort()
  const groups = new Map<string, string[]>()
  for (const p of sortedPrefixes) {
    groups.set(
      p,
      sortedStems.filter((s) => stripFmapSuffix(s) === p)
    )
  }
  return groups
}

/**
 * Stable `B0FieldIdentifier` derived from a fmap group prefix. Strips
 * the leading sub- and ses- entities for a shorter identifier; falls
 * back to the raw prefix when stripping yields an empty string.
 */
export function b0Identifier(groupPrefix: string): string {
  const stripped = groupPrefix.replace(/^sub-[A-Za-z0-9]+_?/, '').replace(/^ses-[A-Za-z0-9]+_?/, '')
  return stripped.length > 0 ? stripped : groupPrefix
}

function isTargetForFmaps(datatype: string, stem: string): boolean {
  if (datatype === 'fmap') return false
  if (stem.endsWith('_sbref')) return false
  return true
}

interface KeyInfo {
  shims: ReadonlyArray<unknown> | null
  imagingVolume: ReadonlyArray<unknown> | null
}

async function readKeyInfo(
  datatypeDir: string,
  stem: string,
  fs: PostPassFs
): Promise<{ keyInfo: KeyInfo; acqTime: number | null } | null> {
  const jsonPath = `${datatypeDir}/${stem}.json`
  let data: Record<string, unknown>
  try {
    const text = await fs.readTextFile(jsonPath)
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
  const shimSetting = data.ShimSetting
  const shims: ReadonlyArray<unknown> | null = Array.isArray(shimSetting) ? shimSetting : null
  let imagingVolume: ReadonlyArray<unknown> | null = null
  const bytes = await readNiftiHeaderBytes(jsonPath, fs)
  if (bytes !== null) {
    const hdr = parseNiftiHeader(bytes)
    if (hdr !== null) {
      const best = getBestAffine(hdr)
      if (best !== null) imagingVolume = serializeImagingVolume(best.affine, best.shape3)
    }
  }
  return {
    keyInfo: { shims, imagingVolume },
    acqTime: hmsSeconds(data.AcquisitionTime)
  }
}

function serializeImagingVolume(affine: Affine, shape3: Shape3): readonly [Affine, Shape3] {
  return [affine, shape3]
}

function paramsMatchByName(name: 'Shims' | 'ImagingVolume', a: KeyInfo, b: KeyInfo): boolean {
  if (name === 'Shims') return paramsMatch(a.shims, b.shims)
  return paramsMatch(a.imagingVolume, b.imagingVolume)
}

const MATCHING_PARAMETERS: ReadonlyArray<'ImagingVolume' | 'Shims'> = ['ImagingVolume', 'Shims']

/**
 * Walk a session directory, locate the fmap subfolder, and compute the
 * sidecar edits needed to wire B0FieldIdentifier (on used fmap groups)
 * and B0FieldSource (on matched targets). Returns the (possibly empty)
 * edit list.
 */
export async function planB0FieldEdits(sessionDir: string, fs: PostPassFs): Promise<SidecarEdit[]> {
  const fmapDir = `${sessionDir}/fmap`
  if (!(await fs.exists(fmapDir))) return []
  const fmapEntries = await fs.readDir(fmapDir)
  const fmapJsons = fmapEntries
    .filter((e) => e.isFile && e.name.endsWith('.json'))
    .map((e) => e.name.slice(0, -'.json'.length))
  if (fmapJsons.length === 0) return []

  const groups = findFmapGroups(fmapJsons)
  if (groups.size === 0) return []

  const fmapRepKeyInfo = new Map<string, KeyInfo>()
  for (const [prefix, members] of groups) {
    if (members.length === 0) continue
    const rep = members[0]
    const info = await readKeyInfo(fmapDir, rep, fs)
    if (info !== null) fmapRepKeyInfo.set(prefix, info.keyInfo)
  }

  const datatypeEntries = (await fs.readDir(sessionDir)).filter(
    (e) => e.isDirectory && e.name !== 'fmap'
  )

  interface TargetEntry {
    jsonPath: string
    stem: string
    keyInfo: KeyInfo
    acqTime: number | null
  }
  const targets: TargetEntry[] = []
  for (const dt of datatypeEntries) {
    const dtDir = `${sessionDir}/${dt.name}`
    let entries: Awaited<ReturnType<PostPassFs['readDir']>>
    try {
      entries = await fs.readDir(dtDir)
    } catch {
      continue
    }
    for (const e of entries) {
      if (!e.isFile || !e.name.endsWith('.json')) continue
      const stem = e.name.slice(0, -'.json'.length)
      if (!isTargetForFmaps(dt.name, stem)) continue
      const info = await readKeyInfo(dtDir, stem, fs)
      if (info === null) continue
      targets.push({
        jsonPath: `${dtDir}/${e.name}`,
        stem,
        keyInfo: info.keyInfo,
        acqTime: info.acqTime
      })
    }
  }
  if (targets.length === 0) return []

  const fmapGroupMeanAcq = new Map<string, number | null>()
  for (const [prefix, members] of groups) {
    const times: number[] = []
    for (const stem of members) {
      try {
        const text = await fs.readTextFile(`${fmapDir}/${stem}.json`)
        const data = JSON.parse(text) as Record<string, unknown>
        const t = hmsSeconds(data.AcquisitionTime)
        if (t !== null) times.push(t)
      } catch {
        // skip
      }
    }
    fmapGroupMeanAcq.set(
      prefix,
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null
    )
  }

  const selected = new Map<string, string | null>()
  for (const t of targets) {
    const compatible: string[] = []
    for (const [prefix] of groups) {
      const repKey = fmapRepKeyInfo.get(prefix)
      if (repKey === undefined) continue
      let ok = true
      for (const p of MATCHING_PARAMETERS) {
        if (!paramsMatchByName(p, t.keyInfo, repKey)) {
          ok = false
          break
        }
      }
      if (ok) compatible.push(prefix)
    }
    if (compatible.length === 0) {
      selected.set(t.stem, null)
      continue
    }
    if (compatible.length === 1) {
      selected.set(t.stem, compatible[0])
      continue
    }
    if (t.acqTime === null) {
      selected.set(t.stem, compatible[0])
      continue
    }
    let best = compatible[0]
    let bestDelta = Number.POSITIVE_INFINITY
    for (const c of compatible) {
      const mean = fmapGroupMeanAcq.get(c)
      if (mean === null || mean === undefined) continue
      const delta = Math.abs(mean - t.acqTime)
      if (delta < bestDelta) {
        best = c
        bestDelta = delta
      }
    }
    selected.set(t.stem, best)
  }

  const ids = new Map<string, string>()
  for (const prefix of groups.keys()) ids.set(prefix, b0Identifier(prefix))
  const usedGroups = new Set<string>()
  for (const sel of selected.values()) if (sel !== null) usedGroups.add(sel)

  const edits: SidecarEdit[] = []
  for (const [prefix, members] of groups) {
    if (!usedGroups.has(prefix)) continue
    const id = ids.get(prefix)
    if (id === undefined) continue
    for (const stem of members) {
      const path = `${fmapDir}/${stem}.json`
      const edited = await mutateSidecar(path, fs, (data) => {
        ;(data as Record<string, unknown>).B0FieldIdentifier = id
      })
      if (edited !== null) edits.push({ path, content: edited })
    }
  }
  for (const t of targets) {
    const sel = selected.get(t.stem)
    if (sel === undefined || sel === null) continue
    const id = ids.get(sel)
    if (id === undefined) continue
    const edited = await mutateSidecar(t.jsonPath, fs, (data) => {
      ;(data as Record<string, unknown>).B0FieldSource = id
    })
    if (edited !== null) edits.push({ path: t.jsonPath, content: edited })
  }
  return edits
}

async function mutateSidecar(
  path: string,
  fs: PostPassFs,
  mutate: (data: unknown) => void
): Promise<string | null> {
  let text: string
  try {
    text = await fs.readTextFile(path)
  } catch {
    return null
  }
  try {
    const parsed = parseSidecar(text)
    mutate(parsed.value)
    return serializeSidecar(parsed.value, parsed.format)
  } catch {
    return null
  }
}
