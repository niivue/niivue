export interface DicomSeries {
  seriesNumber?: number
  seriesInstanceUID?: string
  studyInstanceUID?: string
  patientId?: string
  manufacturer?: string
  acquisitionTime?: string
  protocolName?: string
  seriesDescription?: string
  echoNumber?: number
  images?: number
  modality?: string
  subjectId?: string
  sessionId?: string
  text: string
}

export interface ConvertSeriesOptions {
  outDir?: string
  pattern?: string
  compress?: 'y' | 'n'
  bids?: 'y' | 'n'
  merge?: number
  verbose?: number
  extra?: string[]
}

export interface ConvertSeriesResult {
  seriesNumber: number
  code: number
  stdout: string
  stderr: string
  outDir: string
}

export interface ListSeriesResponse {
  success: boolean
  series?: DicomSeries[]
  error?: string
}

export interface ConvertSeriesResponse {
  success: boolean
  results?: ConvertSeriesResult[]
  error?: string
}

export interface SeriesListEventPayload {
  folderPath: string
  series: DicomSeries[]
}

export interface LoadVolumeEventPayload {
  name: string // filename we’ll show in UI
  base64: string // NIfTI file contents, base64
}
