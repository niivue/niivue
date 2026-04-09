import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  BidsConvertAndClassifyPayload,
  BidsConvertAndClassifyResult,
  BidsWritePayload,
  BidsWriteResult,
  BidsValidationResult,
  BidsValidatePayload,
  BidsSeriesMapping,
  BidsFixAnalysisResult,
  BidsAutoFixResult,
  SidecarUpdateResult,
  FieldmapIntendedFor,
  ParseEventFileResult
} from '../common/bidsTypes.js'

declare global {
  interface Window {
    electron: ElectronAPI & {
      startTabDrag: (fileName: string, jsonStr: string) => void
      setZoomFactor: (factor: number) => void
      resourcesPath: string
      getResourcesPath: () => string
      loadBrainchopModel: (modelPath: string) => Promise<{
        modelJson: any
        basePath: string
      }>
      loadBrainchopWeights: (weightPath: string) => Promise<ArrayBuffer>
      loadBrainchopLabels: (labelsPath: string) => Promise<any>
      selectModelFolder: () => Promise<{
        folderPath: string
        modelJson: any
        hasLabels: boolean
        folderName: string
        settings: any | null
      } | null>
      selectColormapFile: () => Promise<string | null>
      // BIDS wizard
      bidsConvertAndClassify: (
        payload: BidsConvertAndClassifyPayload
      ) => Promise<BidsConvertAndClassifyResult>
      bidsImportNiftiDir: (dirPath: string) => Promise<BidsConvertAndClassifyResult>
      bidsValidate: (payload: BidsValidatePayload) => Promise<BidsValidationResult>
      bidsValidateWritten: (
        dirPath: string,
        mappings: BidsSeriesMapping[]
      ) => Promise<BidsValidationResult>
      bidsAnalyzeFixes: (
        dirPath: string,
        result: BidsValidationResult
      ) => Promise<BidsFixAnalysisResult>
      bidsReadSidecar: (sidecarPath: string) => Promise<Record<string, unknown> | null>
      bidsUpdateSidecar: (
        sidecarPath: string,
        updates: Record<string, unknown>
      ) => Promise<SidecarUpdateResult>
      bidsAutoFixSidecars: (
        dirPath: string,
        mappings?: BidsSeriesMapping[]
      ) => Promise<BidsAutoFixResult>
      bidsWrite: (payload: BidsWritePayload) => Promise<BidsWriteResult>
      bidsSelectOutputDir: () => Promise<string | null>
      bidsSuggestFieldmapMappings: (mappings: BidsSeriesMapping[]) => Promise<FieldmapIntendedFor[]>
      bidsSelectEventFile: () => Promise<string | null>
      bidsParseEventFile: (filePath: string) => Promise<ParseEventFileResult>
    }
    api: unknown
  }
}
