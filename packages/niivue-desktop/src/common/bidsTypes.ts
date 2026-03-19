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

export interface EditableSidecarFields {
  RepetitionTime?: number
  EchoTime?: number
  FlipAngle?: number
  PhaseEncodingDirection?: string
  TotalReadoutTime?: number
  SliceTiming?: number[]
}

export interface SeriesSidecarData {
  /** All sidecar fields from dcm2niix (PII stripped) */
  original: Record<string, unknown>
  /** User edits — merged on top of original when writing */
  overrides: EditableSidecarFields
}

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
  ce: string
  rec: string
  dir: string
  run: number
  echo: number
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
  /** Reason for exclusion (e.g. too few volumes) */
  exclusionReason?: string
  /** Sidecar JSON data for metadata editing */
  sidecarData?: SeriesSidecarData
  /** BIDS-relative IntendedFor paths (only for fmap series) */
  intendedFor?: string[]
  /** Event file configuration (only for func/bold series) */
  eventFile?: EventFileConfig
}

export interface FieldmapIntendedFor {
  fmapIndex: number
  targetIndices: number[]
}

export interface EventColumnMapping {
  sourceColumn: string
  bidsColumn: string // 'onset' | 'duration' | 'trial_type' | custom | 'skip'
}

export interface EventFileConfig {
  sourcePath: string
  filename: string
  delimiter: string
  convertMsToSeconds: boolean
  columnMappings: EventColumnMapping[]
  detectedColumns: string[]
  previewRows?: string[][]
}

export interface ParseEventFileResult {
  success: boolean
  columns: string[]
  previewRows: string[][]
  detectedDelimiter: string
  error?: string
}

export interface BidsDatasetConfig {
  name: string
  bidsVersion: string
  license: string
  authors: string[]
  readme: string
  outputDir: string
}

export interface BidsValidationIssue {
  severity: 'error' | 'warning'
  message: string
  file?: string
  seriesIndex?: number
  targetStep?: number
  code?: string
}

export interface BidsValidatePayload {
  config: BidsDatasetConfig
  mappings: BidsSeriesMapping[]
  fieldmapIntendedFor?: FieldmapIntendedFor[]
  demographics?: ParticipantDemographics
  allDemographics?: Record<string, ParticipantDemographics>
}

export interface BidsValidationResult {
  valid: boolean
  errors: BidsValidationIssue[]
  warnings: BidsValidationIssue[]
}

export interface ParticipantDemographics {
  age: string
  sex: string
  handedness: string
  group: string
}

export interface DetectedSession {
  rawDate: string
  label: string
  seriesIndices: number[]
  excluded?: boolean
}

export interface DetectedSubject {
  rawId: string
  label: string
  demographics: ParticipantDemographics
  sessions: DetectedSession[]
  excluded?: boolean
}

export interface BidsConvertAndClassifyPayload {
  dicomDir: string
  seriesNumbers: number[]
}

export interface BidsConvertAndClassifyResult {
  success: boolean
  mappings?: BidsSeriesMapping[]
  demographics?: ParticipantDemographics
  detectedSubjects?: DetectedSubject[]
  error?: string
}

export interface BidsWritePayload {
  config: BidsDatasetConfig
  mappings: BidsSeriesMapping[]
  demographics?: ParticipantDemographics
  allDemographics?: Record<string, ParticipantDemographics>
  fieldmapIntendedFor?: FieldmapIntendedFor[]
}

export interface BidsWriteResult {
  success: boolean
  outputDir?: string
  error?: string
}

/** Persistable BIDS wizard state for save/restore via NVDocument.customData */
export interface BidsWizardState {
  mappings: BidsSeriesMapping[]
  fieldmapIntendedFor: FieldmapIntendedFor[]
  demographics: ParticipantDemographics
  detectedSubjects: DetectedSubject[]
  config: BidsDatasetConfig
  subject: string
  session: string
  step: number
  dicomDir: string
}
