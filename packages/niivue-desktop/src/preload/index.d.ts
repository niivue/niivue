import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  BidsConvertAndClassifyPayload,
  BidsConvertAndClassifyResult,
  BidsWritePayload,
  BidsWriteResult,
  BidsValidationResult,
  BidsValidatePayload,
  BidsSeriesMapping,
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
      bidsValidate: (payload: BidsValidatePayload) => Promise<BidsValidationResult>
      bidsValidateWritten: (
        dirPath: string,
        mappings: BidsSeriesMapping[]
      ) => Promise<BidsValidationResult>
      bidsWrite: (payload: BidsWritePayload) => Promise<BidsWriteResult>
      bidsSelectOutputDir: () => Promise<string | null>
      bidsSuggestFieldmapMappings: (mappings: BidsSeriesMapping[]) => Promise<FieldmapIntendedFor[]>
      bidsSelectEventFile: () => Promise<string | null>
      bidsParseEventFile: (filePath: string) => Promise<ParseEventFileResult>
    }
    api: unknown
  }
}
