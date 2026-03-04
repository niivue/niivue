import fs from 'node:fs'
import type {
  BidsDatatype,
  BidsSuffix,
  BidsSeriesMapping,
  BidsConfidence
} from '../../common/bidsTypes.js'

interface DcmSidecar {
  SeriesDescription?: string
  ProtocolName?: string
  ImageType?: string[]
  RepetitionTime?: number
  EchoTime?: number
  EchoTime1?: number
  EchoTime2?: number
  DiffusionDirectionality?: string
  PhaseEncodingDirection?: string
  NumberOfTemporalPositions?: number
  ArterialSpinLabelingType?: string
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

  return {
    index,
    seriesDescription: desc,
    sidecarPath,
    niftiPath,
    datatype,
    suffix,
    task,
    acq: '',
    run: 1,
    subject: '01',
    session: '',
    confidence,
    heuristicReason: reason,
    excluded: false
  }
}

export function classifyAll(sidecarPaths: string[]): BidsSeriesMapping[] {
  const mappings = sidecarPaths.map((p, i) => classifySeries(p, i))

  // Auto-assign run numbers for series with the same classification
  const groups = new Map<string, BidsSeriesMapping[]>()
  for (const m of mappings) {
    if (m.excluded) continue
    const key = `${m.datatype}_${m.suffix}_${m.task}_${m.acq}`
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

  return mappings
}
