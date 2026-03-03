export type BidsDatatype = 'anat' | 'func' | 'dwi' | 'fmap' | 'perf'

export type BidsSuffix =
  // anat
  | 'T1w'
  | 'T2w'
  | 'FLAIR'
  | 'T2star'
  | 'inplaneT1'
  | 'inplaneT2'
  | 'PDw'
  | 'angio'
  // func
  | 'bold'
  | 'sbref'
  // dwi
  | 'dwi'
  // fmap
  | 'phasediff'
  | 'phase1'
  | 'phase2'
  | 'magnitude1'
  | 'magnitude2'
  | 'fieldmap'
  | 'epi'
  // perf
  | 'asl'
  | 'm0scan'

export const SUFFIXES_BY_DATATYPE: Record<BidsDatatype, BidsSuffix[]> = {
  anat: ['T1w', 'T2w', 'FLAIR', 'T2star', 'inplaneT1', 'inplaneT2', 'PDw', 'angio'],
  func: ['bold', 'sbref'],
  dwi: ['dwi'],
  fmap: ['phasediff', 'phase1', 'phase2', 'magnitude1', 'magnitude2', 'fieldmap', 'epi'],
  perf: ['asl', 'm0scan']
}

export type BidsConfidence = 'high' | 'medium' | 'low'

export interface BidsSeriesMapping {
  /** Index within the batch (for ordering) */
  index: number
  /** Original dcm2niix series description */
  seriesDescription: string
  /** Path to the dcm2niix JSON sidecar */
  sidecarPath: string
  /** Path to the converted NIfTI file */
  niftiPath: string
  /** Proposed BIDS datatype */
  datatype: BidsDatatype
  /** Proposed BIDS suffix */
  suffix: BidsSuffix
  /** Custom BIDS labels */
  task: string
  acq: string
  run: number
  /** Subject label (without "sub-" prefix) */
  subject: string
  /** Session label (without "ses-" prefix, empty if unused) */
  session: string
  /** Confidence of the heuristic classification */
  confidence: BidsConfidence
  /** Human-readable reason for the classification */
  heuristicReason: string
  /** Whether this series is excluded from the BIDS output */
  excluded: boolean
}

export interface BidsDatasetConfig {
  name: string
  bidsVersion: string
  license: string
  authors: string[]
  outputDir: string
}

export interface BidsValidationIssue {
  severity: 'error' | 'warning'
  message: string
  file?: string
}

export interface BidsValidationResult {
  valid: boolean
  errors: BidsValidationIssue[]
  warnings: BidsValidationIssue[]
}

export interface BidsConvertAndClassifyPayload {
  dicomDir: string
  seriesNumbers: number[]
}

export interface BidsConvertAndClassifyResult {
  success: boolean
  mappings?: BidsSeriesMapping[]
  error?: string
}

export interface BidsWritePayload {
  config: BidsDatasetConfig
  mappings: BidsSeriesMapping[]
}

export interface BidsWriteResult {
  success: boolean
  outputDir?: string
  error?: string
}
