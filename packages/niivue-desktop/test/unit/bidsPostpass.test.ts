import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import {
  acqIso,
  hmsSeconds,
  buildScansTsvContent,
  computeScansTsvPath
} from '../../src/main/utils/bidsPostpass/scansTsv.js'
import {
  stripFmapSuffix,
  findFmapGroups,
  b0Identifier
} from '../../src/main/utils/bidsPostpass/fmapPairing.js'
import { parseSidecar, serializeSidecar } from '../../src/main/utils/bidsPostpass/sidecarJson.js'
import { parseNiftiHeader } from '../../src/main/utils/bidsPostpass/niftiHeader.js'
import { runPostPass } from '../../src/main/utils/bidsPostpass/runPostPass.js'
import { nodePostPassFs } from '../../src/main/utils/bidsPostpass/nodeFs.js'

describe('bidsPostpass: pure helpers', () => {
  it('acqIso prefers AcquisitionDateTime', () => {
    expect(acqIso({ AcquisitionDateTime: '2024-01-02T03:04:05' })).toBe('2024-01-02T03:04:05')
  })

  it('acqIso falls back to AcquisitionDate + AcquisitionTime', () => {
    expect(acqIso({ AcquisitionDate: '20240102', AcquisitionTime: '03:04:05.000' })).toBe(
      '2024-01-02T03:04:05.000'
    )
  })

  it('acqIso returns null on missing fields', () => {
    expect(acqIso({})).toBeNull()
    expect(acqIso({ AcquisitionDate: 'oops' })).toBeNull()
  })

  it('hmsSeconds parses HH:MM:SS', () => {
    expect(hmsSeconds('01:02:03')).toBeCloseTo(3723)
    expect(hmsSeconds('00:00:00.5')).toBeCloseTo(0.5)
    expect(hmsSeconds(null)).toBeNull()
    expect(hmsSeconds('not-a-time')).toBeNull()
  })

  it('buildScansTsvContent sorts timestamped rows before n/a', () => {
    const tsv = buildScansTsvContent([
      { filename: 'anat/sub-01_T1w.nii.gz', acqTime: 'n/a' },
      { filename: 'anat/sub-01_T2w.nii.gz', acqTime: '2024-01-02T03:04:06' },
      { filename: 'anat/sub-01_FLAIR.nii.gz', acqTime: '2024-01-02T03:04:05' }
    ])
    const rows = tsv.split('\n').filter(Boolean)
    expect(rows[0]).toBe('filename\tacq_time')
    expect(rows[1]).toContain('FLAIR')
    expect(rows[2]).toContain('T2w')
    expect(rows[3]).toContain('T1w')
  })

  it('computeScansTsvPath handles sub- and ses- layouts', () => {
    expect(computeScansTsvPath('/root/sub-01')).toBe('/root/sub-01/sub-01_scans.tsv')
    expect(computeScansTsvPath('/root/sub-01/ses-02')).toBe(
      '/root/sub-01/ses-02/sub-01_ses-02_scans.tsv'
    )
  })

  it('stripFmapSuffix collapses fmap entity/suffix tokens', () => {
    expect(stripFmapSuffix('sub-01_dir-AP_epi')).toBe('sub-01_epi')
    expect(stripFmapSuffix('sub-01_phasediff')).toBe('sub-01')
    expect(stripFmapSuffix('sub-01_magnitude1')).toBe('sub-01')
  })

  it('findFmapGroups groups by stripped prefix', () => {
    const groups = findFmapGroups([
      'sub-01_dir-AP_epi',
      'sub-01_dir-PA_epi',
      'sub-01_magnitude1',
      'sub-01_magnitude2',
      'sub-01_phasediff'
    ])
    expect(groups.size).toBe(2)
    expect(groups.get('sub-01_epi')).toEqual(['sub-01_dir-AP_epi', 'sub-01_dir-PA_epi'])
    expect(groups.get('sub-01')).toEqual([
      'sub-01_magnitude1',
      'sub-01_magnitude2',
      'sub-01_phasediff'
    ])
  })

  it('b0Identifier strips sub-/ses- entities', () => {
    expect(b0Identifier('sub-01_ses-02_epi')).toBe('epi')
    expect(b0Identifier('sub-01')).toBe('sub-01')
  })
})

describe('bidsPostpass: order-preserving sidecar parser', () => {
  it('round-trips an unchanged sidecar verbatim', () => {
    const text = '{\n  "TaskName": "rest",\n  "RepetitionTime": 2.0e0\n}\n'
    const parsed = parseSidecar(text)
    expect(serializeSidecar(parsed.value, parsed.format)).toBe(text)
  })

  it('serializes edits with the detected indent', () => {
    const text = '{\n    "TaskName": "rest"\n}\n'
    const parsed = parseSidecar(text)
    ;(parsed.value as Record<string, unknown>).B0FieldSource = 'epi'
    const out = serializeSidecar(parsed.value, parsed.format)
    expect(out).toContain('    "B0FieldSource": "epi"')
    expect(out.endsWith('\n')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// runPostPass integration: synthesize a tiny BIDS root on disk and verify
// scans.tsv emission. Fmap pairing exercises a separate path (NIfTI header
// reads) that's covered by parseNiftiHeader's tests below.
// ---------------------------------------------------------------------------

function makeNiftiHeader(): Buffer {
  // Minimal LE NIfTI-1 header with sizeof_hdr=348 at offset 0 and qform_code=0
  // / sform_code=0 (so getBestAffine returns null and ImagingVolume is empty).
  const buf = Buffer.alloc(348)
  buf.writeInt32LE(348, 0)
  return buf
}

describe('bidsPostpass: NIfTI header parser', () => {
  it('returns null on short buffer', () => {
    expect(parseNiftiHeader(new Uint8Array(10))).toBeNull()
  })

  it('parses a minimal LE header', () => {
    const hdr = parseNiftiHeader(makeNiftiHeader())
    expect(hdr).not.toBeNull()
    expect(hdr!.endianness).toBe('le')
  })
})

describe('runPostPass: scans.tsv aggregation against a real tree', () => {
  let tmpRoot: string

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'postpass-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('writes <sub>_<ses>_scans.tsv with chronological order', async () => {
    const sesDir = path.join(tmpRoot, 'sub-01', 'ses-01', 'anat')
    fs.mkdirSync(sesDir, { recursive: true })
    fs.writeFileSync(
      path.join(sesDir, 'sub-01_ses-01_T1w.json'),
      JSON.stringify({ AcquisitionTime: '03:04:05' })
    )
    fs.writeFileSync(path.join(sesDir, 'sub-01_ses-01_T1w.nii.gz'), gzipSync(makeNiftiHeader()))
    fs.writeFileSync(
      path.join(sesDir, 'sub-01_ses-01_T2w.json'),
      JSON.stringify({ AcquisitionDateTime: '2024-01-02T03:04:00' })
    )
    fs.writeFileSync(path.join(sesDir, 'sub-01_ses-01_T2w.nii.gz'), gzipSync(makeNiftiHeader()))

    const writes: { path: string; content: string }[] = []
    const result = await runPostPass(
      tmpRoot,
      async (filePath, content) => {
        writes.push({ path: filePath, content })
        fs.writeFileSync(filePath, content)
      },
      nodePostPassFs
    )

    expect(result.sessionCount).toBe(1)
    expect(result.scansTsvWrites).toBe(1)
    expect(result.failures).toEqual([])
    const tsvPath = path.join(tmpRoot, 'sub-01', 'ses-01', 'sub-01_ses-01_scans.tsv')
    expect(fs.existsSync(tsvPath)).toBe(true)
    const lines = fs.readFileSync(tsvPath, 'utf-8').split('\n').filter(Boolean)
    expect(lines[0]).toBe('filename\tacq_time')
    expect(lines[1]).toMatch(/T2w/)
    expect(lines[2]).toMatch(/T1w/)
  })

  it('emits no scans.tsv when no sidecar/NIfTI pairs exist', async () => {
    fs.mkdirSync(path.join(tmpRoot, 'sub-01', 'anat'), { recursive: true })
    const result = await runPostPass(
      tmpRoot,
      async (filePath, content) => {
        fs.writeFileSync(filePath, content)
      },
      nodePostPassFs
    )
    expect(result.sessionCount).toBe(1)
    expect(result.scansTsvWrites).toBe(0)
  })
})
