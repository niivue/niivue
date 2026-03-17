/// <reference types="vite/client" />

import { ElectronAPI } from '@electron-toolkit/preload'
import type { CLIOptions, ResolvedInput } from '../../common/cliTypes.js'
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
} from '../../common/bidsTypes.js'

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
      loadBrainchopPreview: (previewPath: string) => Promise<string | null>
      selectModelFolder: () => Promise<{
        folderPath: string
        modelJson: any
        hasLabels: boolean
        folderName: string
        settings: any | null
      } | null>
      selectColormapFile: () => Promise<string | null>
      // Headless mode - Subcommand architecture
      headlessGetOptions: () => Promise<CLIOptions>
      headlessResolveInput: (input: string) => Promise<ResolvedInput>
      headlessSaveOutput: (
        data: string,
        outputPath: string
      ) => Promise<{ success: boolean; error?: string }>
      headlessSaveNifti: (
        base64Data: string,
        outputPath: string
      ) => Promise<{ success: boolean; error?: string }>
      headlessWriteStdout: (base64Data: string) => Promise<void>
      headlessLoadLabelJson: (labelJsonPath: string) => Promise<unknown>
      headlessComplete: () => void
      headlessError: (message: string, exitCode?: number) => void
      onHeadlessStart: (callback: () => void) => void
      // niimath headless
      headlessNiimath: (
        inputBase64: string,
        inputName: string,
        operations: string
      ) => Promise<{ base64: string; success: boolean }>
      // dcm2niix headless
      headlessDcm2niixList: (dicomDir: string) => Promise<any[]>
      headlessDcm2niixConvert: (options: {
        dicomDir: string
        seriesNumbers: number[]
        outputDir?: string
        compress?: 'y' | 'n'
        bids?: 'y' | 'n'
      }) => Promise<
        { code: number; stdout: string; stderr: string; outDir: string; files: string[] }[]
      >
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
      bidsWrite: (payload: BidsWritePayload) => Promise<BidsWriteResult>
      bidsSelectOutputDir: () => Promise<string | null>
      bidsSuggestFieldmapMappings: (mappings: BidsSeriesMapping[]) => Promise<FieldmapIntendedFor[]>
      bidsSelectEventFile: () => Promise<string | null>
      bidsParseEventFile: (filePath: string) => Promise<ParseEventFileResult>
      // allineate headless
      headlessAllineate: (
        movingPath: string,
        stationaryPath: string,
        outputPath: string,
        opts: string[]
      ) => Promise<{
        success: boolean
        stdout: string
        stderr: string
        code: number
        outputPath: string
      }>
      // allineate registration
      allineateRun: (args: string[]) => Promise<{
        success: boolean
        stdout: string
        stderr: string
        code: number
        error?: string
      }>
      allineateRegister: (
        movingPath: string,
        stationaryPath: string,
        outputPath: string,
        opts?: string[]
      ) => Promise<{
        success: boolean
        stdout: string
        stderr: string
        code: number
        outputPath: string
        error?: string
      }>
    }
  }
}
