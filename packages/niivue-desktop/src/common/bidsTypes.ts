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

/**
 * User-staged sidecar edits. The hot-path fields below are named for
 * autocomplete in tooling, but the BIDS Prep tree editor surfaces any
 * sidecar key for batch editing — the index signature keeps the type
 * open so {@link SeriesSidecarData}'s `{...original, ...overrides}` merge
 * in `bidsWriter` can carry arbitrary additions back out to disk.
 */
export interface EditableSidecarFields {
  RepetitionTime?: number
  EchoTime?: number
  FlipAngle?: number
  PhaseEncodingDirection?: string
  TotalReadoutTime?: number
  SliceTiming?: number[]
  [key: string]: unknown
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
  /** Sub-classification — for SIDECAR_KEY_* issues this is the JSON field name. */
  subCode?: string
  /** Schema rule path that fired the issue, e.g. rules.sidecars.mri.MRISequenceSpecifics. */
  rule?: string
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

/** A single field-level fix the user can apply to a BIDS JSON sidecar */
export interface SidecarFieldSuggestion {
  /** JSON key, e.g. "RepetitionTime" */
  field: string
  /** Value currently stored in the sidecar (may be undefined) */
  currentValue: unknown
  /** Proposed value — used to prefill the form */
  suggestedValue: unknown
  /** Expected data shape for form rendering */
  kind: 'string' | 'number' | 'array-number' | 'array-string' | 'enum'
  /** For kind === 'enum' */
  options?: string[]
  /** Human-readable reason derived from validator output */
  reason: string
  /** Validator issue codes that triggered this suggestion */
  issueCodes: string[]
}

/** A single JSON sidecar that needs editing, with its associated issues */
export interface SidecarFixProposal {
  /** Absolute path on disk to the JSON file */
  sidecarPath: string
  /** Path relative to dataset root (what the user sees) */
  relativePath: string
  /** Full current JSON content */
  content: Record<string, unknown>
  /** Field-level editors to render — always at least one entry */
  suggestions: SidecarFieldSuggestion[]
  /** Validator issues this sidecar is implicated in */
  issues: BidsValidationIssue[]
}

export interface BidsFixAnalysisResult {
  success: boolean
  proposals?: SidecarFixProposal[]
  error?: string
}

export interface SidecarUpdateResult {
  ok: boolean
  content?: Record<string, unknown>
  error?: string
}

/** A single auto-applied fix from the bids-fix-sidecars pass */
export interface SidecarAutoFixRecord {
  sidecarPath: string
  relativePath: string
  field: string
  oldValue: unknown
  newValue: unknown
  reason: string
}

/** Combined result of the auto-fix + re-validate pipeline */
export interface BidsAutoFixResult {
  success: boolean
  fixesApplied?: SidecarAutoFixRecord[]
  validation?: BidsValidationResult
  proposals?: SidecarFixProposal[]
  error?: string
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
  /** Non-fatal note (e.g. some requested series produced no output) shown alongside successful results. */
  warning?: string
}

export interface BidsWritePayload {
  config: BidsDatasetConfig
  mappings: BidsSeriesMapping[]
  demographics?: ParticipantDemographics
  allDemographics?: Record<string, ParticipantDemographics>
  fieldmapIntendedFor?: FieldmapIntendedFor[]
  /** Per-series original (pre-skull-strip) NIfTI paths. When present for a
   *  series, the writer emits both the raw original at the canonical BIDS path
   *  and the stripped derivative with `_desc-brain` inserted before the suffix. */
  originalPaths?: Record<number, string>
}

export interface BidsWriteResult {
  success: boolean
  outputDir?: string
  error?: string
}

export interface QualityMetrics {
  volumeIndex: number
  snr: number
  motionMeanFD?: number
  motionMaxFD?: number
  artifactFlags: string[]
  pass: boolean
}

/**
 * One row in the on-disk BIDS tree, returned by `bids:read-tree`. Mirrors
 * the renderer-side TreeFile shape but uses absolute disk paths for the
 * `key`, since the renderer needs to round-trip edits back to specific
 * files on disk.
 *
 * Covers both NIfTI scans (which carry an editable JSON sidecar) and
 * tabular files (`participants.tsv`, `sessions.tsv`, `scans.tsv`,
 * `events.tsv`) so that validator errors about those files surface in the
 * tree. TSV rows are read-only in the inspector for now.
 */
export interface BidsDiskFile {
  /** Discriminates the row type. `nifti` is the editable case; `tsv` is
   *  visible-only and lets us point the validator panel at the file. */
  kind: 'nifti' | 'tsv'
  /** Absolute path to the data file on disk (NIfTI for `nifti` rows, the
   *  TSV file itself for `tsv` rows) — also the row's stable key. Named
   *  `niftiPath` for historical reasons. */
  niftiPath: string
  /** Absolute path to the JSON sidecar, or null if no sidecar exists. */
  sidecarPath: string | null
  /** Path relative to the dataset root (e.g. `sub-01/anat/sub-01_T1w.nii.gz`). */
  bidsPath: string
  /** Empty string for dataset-level files like `participants.tsv`. */
  subject: string
  session: string
  /** Empty string for subject- and session-level files (e.g. `scans.tsv`)
   *  and dataset-level files. Renderer surfaces those under a synthetic
   *  "top-level files" group. */
  datatype: string
  filename: string
  /** Parsed sidecar JSON, or `{}` if no sidecar exists. */
  sidecar: Record<string, unknown>
}

/** A single staged sidecar edit, addressed by absolute JSON path. */
export interface SidecarStagedEdit {
  sidecarPath: string
  field: string
  /** `undefined`/`null` deletes the key; matches updateSidecar semantics. */
  value: unknown
}

export interface BidsApplyEditsResult {
  applied: number
  failed: { sidecarPath: string; field: string; error: string }[]
}

/**
 * Per-field source attribution for a BIDS sidecar value.
 *
 * Five kinds capture where a value actually came from:
 * - `dicom`    — emitted by dcm2niix from the original DICOM headers
 * - `step`     — produced by a workflow step (skull-strip, register, etc.)
 * - `carried`  — copied forward from an upstream sidecar (resample, reorient)
 * - `inferred` — derived from filename entities or value-range heuristics
 * - `user`     — set explicitly via the BIDS editor / sidecar fix UI
 *
 * The autofix layer uses `kind` to decide overwrite precedence: a `step`
 * claim outranks an `inferred` value; a `carried` value with a missing
 * `fromFile` is stale and should be re-resolved.
 */
export type BidsProvenanceSourceKind = 'dicom' | 'step' | 'carried' | 'inferred' | 'user'

export interface BidsProvenanceSource {
  kind: BidsProvenanceSourceKind
  /** DICOM tag in "GGGG,EEEE" form when known (kind = "dicom"). */
  tag?: string
  /** Workflow step that wrote this value (kind = "step" | "inferred"). */
  stepName?: string
  /** Underlying executor — e.g. "dcm2niix", "afni:3dSkullStrip". */
  executor?: string
  /** Executor version string when available. */
  version?: string
  /** Inferrer rule name (kind = "inferred"), e.g. "filename-entity:task". */
  rule?: string
  /** Upstream sidecar this value was copied from (kind = "carried"),
   *  relative to dataset root. */
  fromFile?: string
  /** Carrier tool — e.g. "dcm2niix", "afni:3dresample" (kind = "carried"). */
  via?: string
  /** UI surface that set the value (kind = "user"), e.g. "bids-editor". */
  actor?: string
  /** ISO-8601 timestamp the entry was written. */
  ts?: string
}

export interface BidsProvenanceField {
  value: unknown
  source: BidsProvenanceSource
}

export interface BidsProvenanceHistoryEntry {
  stepName: string
  executor: string
  version?: string
  ts: string
  inputs?: string[]
}

/**
 * Per-output-file provenance record. Lives next to the BIDS sidecar as
 * `<basename>.prov.json` and is excluded from BIDS validation via
 * `.bidsignore`. The schema is intentionally small for v1 — future kinds
 * (`Sources`, `SpatialReference`, etc.) plug in via additional `fields`
 * entries without a version bump.
 */
export interface BidsProvenance {
  schemaVersion: '1'
  /** Path relative to dataset root, e.g. `sub-01/anat/sub-01_T1w.nii.gz`. */
  outputFile: string
  fields: Record<string, BidsProvenanceField>
  history: BidsProvenanceHistoryEntry[]
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
