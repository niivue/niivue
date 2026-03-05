import fs from 'node:fs'
import type {
  BidsDatatype,
  BidsSuffix,
  BidsSeriesMapping,
  BidsConfidence,
  ParticipantDemographics,
  SeriesSidecarData,
  DetectedSubject,
  DetectedSession
} from '../../common/bidsTypes.js'
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
  { pattern: /asl|pcasl|pasl|casl/i, datatype: 'perf', suffix: 'asl' },
  { pattern: /m0scan|m0/i, datatype: 'perf', suffix: 'm0scan' }
]

function classifyByDescription(desc: string): Classification | null {
  for (const rule of SERIES_RULES) {
    if (rule.pattern.test(desc)) {
      let task = ''
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
      return {
        datatype: rule.datatype,
        suffix: rule.suffix,
        confidence: 'medium',
        reason: `SeriesDescription matches "${rule.pattern.source}"`,
        task
      }
    }
  }
  return null
}

function classifyBySidecar(sidecar: DcmSidecar): Classification | null {
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

const PHASE_DIR_MAP: Record<string, string> = {
  j: 'AP', 'j-': 'PA',
  i: 'LR', 'i-': 'RL',
  k: 'IS', 'k-': 'SI'
}

interface ExtractedEntities {
  ce: string
  rec: string
  dir: string
  echo: number
}

function extractEntities(sidecar: DcmSidecar, desc: string): ExtractedEntities {
  const entities: ExtractedEntities = { ce: '', rec: '', dir: '', echo: 0 }

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

  // Reconstruction label
  if (Array.isArray(sidecar.ImageType)) {
    const types = sidecar.ImageType.map((t) => String(t).toUpperCase())
    if (types.includes('NORM')) entities.rec = 'NORM'
    else if (types.includes('ND')) entities.rec = 'ND'
  }

  return entities
}

function stripPiiFields(sidecar: Record<string, unknown>): Record<string, unknown> {
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

  let datatype: BidsDatatype = 'anat'
  let suffix: BidsSuffix = 'T1w'
  let confidence: BidsConfidence = 'low'
  let reason = 'No matching heuristic — defaulting to anat/T1w'
  let task = ''

  if (descResult && sidecarResult) {
    // Both agree
    if (descResult.datatype === sidecarResult.datatype && descResult.suffix === sidecarResult.suffix) {
      confidence = 'high'
      reason = `Both signals agree: ${descResult.reason}`
    } else {
      // Prefer description match
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
    acq: '',
    ce: entities.ce,
    rec: entities.rec,
    dir: entities.dir,
    run: 1,
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
      if (s === 'M') demographics.sex = 'male'
      else if (s === 'F') demographics.sex = 'female'
      else if (s === 'O') demographics.sex = 'other'
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

export function classifyAll(sidecarPaths: string[]): { mappings: BidsSeriesMapping[]; detectedSubjects: DetectedSubject[] } {
  const mappings = sidecarPaths.map((p, i) => classifySeries(p, i))

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
