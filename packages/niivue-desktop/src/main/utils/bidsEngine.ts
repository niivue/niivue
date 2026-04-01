import fs from 'node:fs'
import zlib from 'node:zlib'
import type {
  BidsDatatype,
  BidsSuffix,
  BidsSeriesMapping,
  BidsConfidence,
  ParticipantDemographics,
  SeriesSidecarData,
  DetectedSubject,
  DetectedSession,
  FieldmapIntendedFor,
  ParseEventFileResult
} from '../../common/bidsTypes.js'
import { SUFFIXES_BY_DATATYPE } from '../../common/bidsTypes.js'
import { INTERNAL_SIDECAR_FIELDS } from './bidsWriter.js'

interface DcmSidecar {
  SeriesDescription?: string
  ProtocolName?: string
  ImageType?: string[]
  RepetitionTime?: number
  EchoTime?: number
  EchoTime1?: number
  EchoTime2?: number
  EchoNumber?: number
  DiffusionDirectionality?: string
  PhaseEncodingDirection?: string
  NumberOfTemporalPositions?: number
  ArterialSpinLabelingType?: string
  ContrastBolusAgent?: string
  PatientID?: string
  PatientName?: string
  PatientAge?: string
  PatientSex?: string
  AcquisitionDate?: string
  AcquisitionDateTime?: string
  StudyDate?: string
  BidsGuess?: string[] | { datatype?: string; suffix?: string; entities?: Record<string, string>; filename_suffix?: string }
  [key: string]: unknown
}

interface Classification {
  datatype: BidsDatatype
  suffix: BidsSuffix
  confidence: BidsConfidence
  reason: string
  task: string
}

const SERIES_RULES: { pattern: RegExp; datatype: BidsDatatype; suffix: BidsSuffix }[] = [
  { pattern: /t1w|mprage|bravo|spgr|ir[-_]?fspgr|3d.*t1|t1.*3d/i, datatype: 'anat', suffix: 'T1w' },
  { pattern: /flair/i, datatype: 'anat', suffix: 'FLAIR' },
  { pattern: /t2w|t2_/i, datatype: 'anat', suffix: 'T2w' },
  { pattern: /t2\*|t2star/i, datatype: 'anat', suffix: 'T2star' },
  { pattern: /sbref/i, datatype: 'func', suffix: 'sbref' },
  { pattern: /bold|fmri|func|rest(?:ing)?|task/i, datatype: 'func', suffix: 'bold' },
  { pattern: /dwi|dti|diff(?:usion)?|hardi/i, datatype: 'dwi', suffix: 'dwi' },
  { pattern: /phasediff/i, datatype: 'fmap', suffix: 'phasediff' },
  { pattern: /magnitude1/i, datatype: 'fmap', suffix: 'magnitude1' },
  { pattern: /magnitude2/i, datatype: 'fmap', suffix: 'magnitude2' },
  { pattern: /fieldmap|field_map/i, datatype: 'fmap', suffix: 'fieldmap' },
  { pattern: /spin[-_]?echo.*field|se[-_]?fmap|pepolar/i, datatype: 'fmap', suffix: 'epi' },
  { pattern: /^fmap[-_]/i, datatype: 'fmap', suffix: 'fieldmap' },
  { pattern: /asl|pcasl|pasl|casl/i, datatype: 'perf', suffix: 'asl' },
  { pattern: /m0scan|m0/i, datatype: 'perf', suffix: 'm0scan' }
]

export function classifyByDescription(desc: string): Classification | null {
  for (const rule of SERIES_RULES) {
    if (rule.pattern.test(desc)) {
      let task = ''
      let suffix = rule.suffix

      if (rule.datatype === 'func' && rule.suffix === 'bold') {
        if (/rest(?:ing)?/i.test(desc)) {
          task = 'rest'
        } else {
          // Match task label: only capture alphanumeric chars (stop at _ or -)
          const taskMatch = /task[-_]?([a-zA-Z0-9]+)/i.exec(desc)
          if (taskMatch) {
            task = taskMatch[1].toLowerCase()
          }
        }
      }

      // Refine generic fmap match with REPROIN cues
      if (rule.datatype === 'fmap' && /^fmap[-_]/i.test(desc)) {
        // fmap_dir{XX} → EPI fieldmap (phase-encoding direction present)
        if (/fmap[-_]dir/i.test(desc)) {
          suffix = 'epi' as BidsSuffix
        }
        // fmap_acq{XX} → keep as fieldmap (magnitude/fieldmap pair)
      }

      return {
        datatype: rule.datatype,
        suffix,
        confidence: 'medium',
        reason: `SeriesDescription matches "${rule.pattern.source}"`,
        task
      }
    }
  }
  return null
}

export function classifyBySidecar(sidecar: DcmSidecar): Classification | null {
  // DWI: DiffusionDirectionality present
  if (sidecar.DiffusionDirectionality) {
    return {
      datatype: 'dwi',
      suffix: 'dwi',
      confidence: 'medium',
      reason: 'DiffusionDirectionality field present in sidecar',
      task: ''
    }
  }

  // Fieldmap: dual echo times
  if (sidecar.EchoTime1 != null && sidecar.EchoTime2 != null) {
    return {
      datatype: 'fmap',
      suffix: 'phasediff',
      confidence: 'medium',
      reason: 'EchoTime1 and EchoTime2 present in sidecar',
      task: ''
    }
  }

  // ASL
  if (sidecar.ArterialSpinLabelingType) {
    return {
      datatype: 'perf',
      suffix: 'asl',
      confidence: 'medium',
      reason: 'ArterialSpinLabelingType field present in sidecar',
      task: ''
    }
  }

  // Functional: high volume count + moderate TR
  if (
    sidecar.RepetitionTime != null &&
    sidecar.RepetitionTime > 0 &&
    sidecar.RepetitionTime <= 5 &&
    sidecar.NumberOfTemporalPositions != null &&
    sidecar.NumberOfTemporalPositions > 10
  ) {
    return {
      datatype: 'func',
      suffix: 'bold',
      confidence: 'medium',
      reason: `TR=${sidecar.RepetitionTime}s with ${sidecar.NumberOfTemporalPositions} volumes suggests functional`,
      task: ''
    }
  }

  return null
}

const VALID_DATATYPES = new Set<string>(['anat', 'func', 'dwi', 'fmap', 'perf'])
const VALID_SUFFIXES = new Set<string>(Object.values(SUFFIXES_BY_DATATYPE).flat())

interface BidsGuessEntities {
  task: string
  acq: string
  [key: string]: string
}

export function parseBidsGuessSuffix(suffixStr: string): { suffix: string; entities: BidsGuessEntities } {
  const entities: BidsGuessEntities = { task: '', acq: '' }
  // Remove leading underscore
  const str = suffixStr.replace(/^_/, '')
  // Split on underscore to get segments like "task-rest", "acq-tse2", "bold"
  const segments = str.split('_')
  // Last segment is the BIDS suffix
  const suffix = segments.pop() || ''
  // Remaining segments are entity key-value pairs
  for (const seg of segments) {
    const dashIdx = seg.indexOf('-')
    if (dashIdx > 0) {
      const key = seg.slice(0, dashIdx)
      const val = seg.slice(dashIdx + 1)
      entities[key] = val
    }
  }
  return { suffix, entities }
}

export function classifyByBidsGuess(sidecar: DcmSidecar): (Classification & { entities: BidsGuessEntities }) | null {
  const guess = sidecar.BidsGuess
  if (!guess) return null

  let datatype: string | undefined
  let suffix: string | undefined
  let entities: BidsGuessEntities = { task: '', acq: '' }

  if (Array.isArray(guess)) {
    // Array format: ["func", "_task-rest_bold"]
    if (guess.length < 2) return null
    datatype = guess[0]
    const parsed = parseBidsGuessSuffix(guess[1])
    suffix = parsed.suffix
    entities = parsed.entities
  } else if (typeof guess === 'object') {
    // Object format
    datatype = guess.datatype
    suffix = guess.suffix
    if (guess.entities) {
      entities = { task: '', acq: '', ...guess.entities }
    }
    // Fall back to parsing filename_suffix if suffix not directly provided
    if (!suffix && guess.filename_suffix) {
      const parsed = parseBidsGuessSuffix(guess.filename_suffix)
      suffix = parsed.suffix
      if (!entities.task && parsed.entities.task) entities.task = parsed.entities.task
      if (!entities.acq && parsed.entities.acq) entities.acq = parsed.entities.acq
    }
  } else {
    return null
  }

  if (!datatype || !suffix) return null
  if (!VALID_DATATYPES.has(datatype)) return null
  if (!VALID_SUFFIXES.has(suffix)) return null

  return {
    datatype: datatype as BidsDatatype,
    suffix: suffix as BidsSuffix,
    confidence: 'medium',
    reason: `dcm2niix BidsGuess: ${datatype}/${suffix}`,
    task: entities.task || '',
    entities
  }
}

const PHASE_DIR_MAP: Record<string, string> = {
  j: 'AP', 'j-': 'PA',
  i: 'LR', 'i-': 'RL',
  k: 'IS', 'k-': 'SI'
}

interface ExtractedEntities {
  ce: string
  rec: string
  dir: string
  acq: string
  echo: number
}

export function extractEntities(sidecar: DcmSidecar, desc: string): ExtractedEntities {
  const entities: ExtractedEntities = { ce: '', rec: '', dir: '', acq: '', echo: 0 }

  // Phase encoding direction
  if (sidecar.PhaseEncodingDirection) {
    const ped = String(sidecar.PhaseEncodingDirection)
    entities.dir = PHASE_DIR_MAP[ped] || ''
  }

  // Echo number
  if (sidecar.EchoNumber != null && Number(sidecar.EchoNumber) > 0) {
    entities.echo = Number(sidecar.EchoNumber)
  }

  // Contrast enhanced
  if (sidecar.ContrastBolusAgent) {
    entities.ce = 'enhanced'
  } else if (/\+C|post[-_]?contrast|gad/i.test(desc)) {
    entities.ce = 'enhanced'
  }

  // REPROIN-style entities from description
  // Extract acq label: _acq(\w+) or -acq(\w+)
  const acqMatch = /[-_]acq[-_]?(\w+)/i.exec(desc)
  if (acqMatch) {
    entities.acq = acqMatch[1]
  }

  // Extract dir label from description: _dir(\w+) or -dir(\w+)
  const dirMatch = /[-_]dir[-_]?([A-Za-z]+)/i.exec(desc)
  if (dirMatch && !entities.dir) {
    entities.dir = dirMatch[1].toUpperCase()
  }

  return entities
}

export function stripPiiFields(sidecar: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(sidecar)) {
    if (!INTERNAL_SIDECAR_FIELDS.has(key)) {
      cleaned[key] = val
    }
  }
  return cleaned
}

export function classifySeries(sidecarPath: string, index: number): BidsSeriesMapping {
  const raw = fs.readFileSync(sidecarPath, 'utf-8')
  const sidecar: DcmSidecar = JSON.parse(raw)
  const desc = sidecar.SeriesDescription || sidecar.ProtocolName || ''

  // Determine NIfTI path from sidecar path (dcm2niix names them the same minus extension)
  const base = sidecarPath.replace(/\.json$/, '')
  let niftiPath = base + '.nii.gz'
  if (!fs.existsSync(niftiPath)) {
    niftiPath = base + '.nii'
  }

  const descResult = classifyByDescription(desc)
  const sidecarResult = classifyBySidecar(sidecar)
  const guessResult = classifyByBidsGuess(sidecar)

  let datatype: BidsDatatype = 'anat'
  let suffix: BidsSuffix = 'T1w'
  let confidence: BidsConfidence = 'low'
  let reason = 'No matching heuristic — defaulting to anat/T1w'
  let task = ''

  // Combine classification signals: BidsGuess takes priority when present
  const heuristicResult = descResult || sidecarResult
  if (guessResult && heuristicResult) {
    // Both BidsGuess and heuristic available
    if (guessResult.datatype === heuristicResult.datatype && guessResult.suffix === heuristicResult.suffix) {
      // Agreement → high confidence
      datatype = guessResult.datatype
      suffix = guessResult.suffix
      confidence = 'high'
      reason = `BidsGuess and heuristic agree: ${guessResult.reason}`
    } else {
      // Disagreement → prefer BidsGuess (dcm2niix has deeper DICOM knowledge)
      datatype = guessResult.datatype
      suffix = guessResult.suffix
      confidence = 'medium'
      reason = `${guessResult.reason} (overrides heuristic: ${heuristicResult.datatype}/${heuristicResult.suffix})`
    }
    task = guessResult.task || heuristicResult.task
  } else if (guessResult) {
    // Only BidsGuess
    datatype = guessResult.datatype
    suffix = guessResult.suffix
    confidence = guessResult.confidence
    reason = guessResult.reason
    task = guessResult.task
  } else if (descResult && sidecarResult) {
    // No BidsGuess — original logic
    if (descResult.datatype === sidecarResult.datatype && descResult.suffix === sidecarResult.suffix) {
      confidence = 'high'
      reason = `Both signals agree: ${descResult.reason}`
    } else {
      confidence = 'medium'
      reason = descResult.reason
    }
    datatype = descResult.datatype
    suffix = descResult.suffix
    task = descResult.task || sidecarResult.task
  } else if (descResult) {
    datatype = descResult.datatype
    suffix = descResult.suffix
    confidence = descResult.confidence
    reason = descResult.reason
    task = descResult.task
  } else if (sidecarResult) {
    datatype = sidecarResult.datatype
    suffix = sidecarResult.suffix
    confidence = sidecarResult.confidence
    reason = sidecarResult.reason
    task = sidecarResult.task
  }

  const entities = extractEntities(sidecar, desc)

  // Use BidsGuess entities as fallbacks
  if (guessResult) {
    if (!task && guessResult.entities.task) task = guessResult.entities.task
    if (!entities.ce && guessResult.entities.ce) entities.ce = guessResult.entities.ce
  }

  // Only populate dir for fmap series
  if (datatype !== 'fmap') {
    entities.dir = ''
  }
  const sidecarData: SeriesSidecarData = {
    original: stripPiiFields(sidecar as Record<string, unknown>),
    overrides: {}
  }

  return {
    index,
    seriesDescription: desc,
    sidecarPath,
    niftiPath,
    datatype,
    suffix,
    task,
    acq: guessResult?.entities.acq || entities.acq || '',
    ce: entities.ce,
    rec: entities.rec,
    dir: entities.dir,
    run: 0,
    echo: entities.echo,
    subject: '01',
    session: '',
    confidence,
    heuristicReason: reason,
    excluded: false,
    sidecarData
  }
}

export function extractDemographics(sidecarPath: string): ParticipantDemographics {
  const demographics: ParticipantDemographics = { age: '', sex: '', handedness: '', group: '' }
  try {
    const raw = fs.readFileSync(sidecarPath, 'utf-8')
    const sidecar = JSON.parse(raw)

    // Parse PatientAge: DICOM format like "025Y", "030M", "003W", "010D" or plain number
    if (sidecar.PatientAge) {
      const ageStr = String(sidecar.PatientAge).trim()
      const match = /^(\d+)([YMWD]?)$/i.exec(ageStr)
      if (match) {
        const num = parseInt(match[1], 10)
        const unit = (match[2] || 'Y').toUpperCase()
        if (unit === 'Y') demographics.age = String(num)
        else if (unit === 'M') demographics.age = String(Math.round(num / 12))
        else if (unit === 'W') demographics.age = String(Math.round(num / 52))
        else if (unit === 'D') demographics.age = String(Math.round(num / 365))
      }
    }

    // Parse PatientSex: "M" → "male", "F" → "female", "O" → "other"
    if (sidecar.PatientSex) {
      const s = String(sidecar.PatientSex).toUpperCase().trim()
      if (s === 'M') demographics.sex = 'M'
      else if (s === 'F') demographics.sex = 'F'
      else if (s === 'O') demographics.sex = 'O'
    }
  } catch {
    // If sidecar can't be read, return empty demographics
  }
  return demographics
}

export function detectSubjectsAndSessions(
  sidecarPaths: string[],
  mappings: BidsSeriesMapping[]
): DetectedSubject[] {
  // Parse PatientID and AcquisitionDate from each sidecar
  const subjectMap = new Map<string, { indices: number[]; dates: Map<string, number[]>; sidecarPath: string }>()

  for (let i = 0; i < sidecarPaths.length; i++) {
    try {
      const raw = fs.readFileSync(sidecarPaths[i], 'utf-8')
      const sidecar: DcmSidecar = JSON.parse(raw)
      const patientId = String(sidecar.PatientID || sidecar.PatientName || 'unknown').trim()
      const acqDate = String(sidecar.AcquisitionDate || sidecar.AcquisitionDateTime || sidecar.StudyDate || '').trim()

      if (!subjectMap.has(patientId)) {
        subjectMap.set(patientId, { indices: [], dates: new Map(), sidecarPath: sidecarPaths[i] })
      }
      const entry = subjectMap.get(patientId)!
      entry.indices.push(i)

      const dateKey = acqDate || 'nodate'
      if (!entry.dates.has(dateKey)) {
        entry.dates.set(dateKey, [])
      }
      entry.dates.get(dateKey)!.push(i)
    } catch {
      // Skip unreadable sidecars
    }
  }

  const subjects: DetectedSubject[] = []
  let subjectIndex = 1

  for (const [rawId, entry] of subjectMap) {
    const label = String(subjectIndex).padStart(2, '0')
    const demographics = extractDemographics(entry.sidecarPath)
    const hasMultipleSessions = entry.dates.size > 1

    const sessions: DetectedSession[] = []
    let sessionIndex = 1
    for (const [rawDate, indices] of entry.dates) {
      sessions.push({
        rawDate: rawDate === 'nodate' ? '' : rawDate,
        label: hasMultipleSessions ? String(sessionIndex).padStart(2, '0') : '',
        seriesIndices: indices
      })
      sessionIndex++
    }

    // Apply subject/session to mappings
    for (const session of sessions) {
      for (const idx of session.seriesIndices) {
        if (idx < mappings.length) {
          mappings[idx].subject = label
          mappings[idx].session = session.label
        }
      }
    }

    subjects.push({ rawId, label, demographics, sessions })
    subjectIndex++
  }

  return subjects
}

function readNiftiVolumeCount(niftiPath: string): number {
  try {
    let headerBuf: Buffer
    if (niftiPath.endsWith('.nii.gz')) {
      const compressed = fs.readFileSync(niftiPath)
      const decompressed = zlib.gunzipSync(compressed)
      headerBuf = Buffer.from(decompressed.buffer, decompressed.byteOffset, Math.min(decompressed.length, 352))
    } else {
      const fd = fs.openSync(niftiPath, 'r')
      headerBuf = Buffer.alloc(352)
      fs.readSync(fd, headerBuf, 0, 352, 0)
      fs.closeSync(fd)
    }
    // dim[4] is at byte offset 42 (dim[0] at 40, each dim is 2 bytes as int16)
    // NIfTI-1 header: dim array starts at offset 40, dim[4] = offset 40 + 4*2 = 48
    const dim4 = headerBuf.readInt16LE(48)
    return dim4 > 0 ? dim4 : 1
  } catch {
    return 1
  }
}

export function classifyAll(sidecarPaths: string[]): { mappings: BidsSeriesMapping[]; detectedSubjects: DetectedSubject[] } {
  const mappings = sidecarPaths.map((p, i) => classifySeries(p, i))

  // Auto-exclude low-volume functional series
  for (const m of mappings) {
    if (m.datatype === 'func' && m.suffix === 'bold' && !m.excluded && fs.existsSync(m.niftiPath)) {
      const volumes = readNiftiVolumeCount(m.niftiPath)
      if (volumes < 75) {
        m.excluded = true
        m.exclusionReason = `Too few volumes (${volumes} < 75)`
      }
    }
  }

  // Detect subjects and sessions
  const detectedSubjects = detectSubjectsAndSessions(sidecarPaths, mappings)

  // Auto-assign run numbers for series with the same classification
  const groups = new Map<string, BidsSeriesMapping[]>()
  for (const m of mappings) {
    if (m.excluded) continue
    const key = `${m.subject}_${m.session}_${m.datatype}_${m.suffix}_${m.task}_${m.acq}_${m.ce}_${m.rec}_${m.dir}_${m.echo}`
    const group = groups.get(key)
    if (group) {
      group.push(m)
    } else {
      groups.set(key, [m])
    }
  }

  for (const group of groups.values()) {
    if (group.length > 1) {
      group.forEach((m, i) => {
        m.run = i + 1
      })
    }
  }

  return { mappings, detectedSubjects }
}

export function suggestFieldmapMappings(mappings: BidsSeriesMapping[]): FieldmapIntendedFor[] {
  const fmaps = mappings.filter(m => !m.excluded && m.datatype === 'fmap')
  const targets = mappings.filter(m => !m.excluded && (m.datatype === 'func' || m.datatype === 'dwi'))

  if (fmaps.length === 0 || targets.length === 0) return []

  const result: FieldmapIntendedFor[] = []

  for (const fm of fmaps) {
    // Match by same subject, preferring same session but falling back to same subject only
    let eligible = targets.filter(t => t.subject === fm.subject && t.session === fm.session)
    if (eligible.length === 0) {
      eligible = targets.filter(t => t.subject === fm.subject)
    }
    if (eligible.length === 0) continue

    // If fmap has PhaseEncodingDirection, try to match opposite polarity EPI targets
    const fmPE = fm.sidecarData?.original?.PhaseEncodingDirection as string | undefined
    let matched = eligible

    if (fmPE && fm.suffix === 'epi') {
      // Opposite polarity: j vs j-, i vs i-
      const opposite = fmPE.endsWith('-') ? fmPE.slice(0, -1) : fmPE + '-'
      const peMatched = eligible.filter(t => {
        const tPE = t.sidecarData?.original?.PhaseEncodingDirection as string | undefined
        return tPE === opposite
      })
      if (peMatched.length > 0) {
        matched = peMatched
      }
    }

    result.push({
      fmapIndex: fm.index,
      targetIndices: matched.map(t => t.index)
    })
  }

  return result
}

export function parseEventFile(filePath: string): ParseEventFileResult {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '')
    if (lines.length === 0) {
      return { success: false, columns: [], previewRows: [], detectedDelimiter: '\t', error: 'File is empty' }
    }

    // Auto-detect delimiter
    let delimiter = '\t'
    const firstLine = lines[0]
    if (firstLine.includes('\t')) {
      delimiter = '\t'
    } else if (firstLine.includes(',')) {
      delimiter = ','
    } else if (/\s{2,}/.test(firstLine) || firstLine.includes(' ')) {
      delimiter = 'whitespace'
    }

    const splitLine = (line: string): string[] => {
      if (delimiter === 'whitespace') {
        return line.trim().split(/\s+/)
      }
      return line.split(delimiter)
    }

    const columns = splitLine(lines[0]).map(c => c.trim())
    const previewRows: string[][] = []
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      previewRows.push(splitLine(lines[i]).map(c => c.trim()))
    }

    return {
      success: true,
      columns,
      previewRows,
      detectedDelimiter: delimiter
    }
  } catch (err) {
    return {
      success: false,
      columns: [],
      previewRows: [],
      detectedDelimiter: '\t',
      error: err instanceof Error ? err.message : String(err)
    }
  }
}
