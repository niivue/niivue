/// <reference types="vite/client" />

import { ElectronAPI } from '@electron-toolkit/preload'
import type { CLIOptions, ResolvedInput } from '../../common/cliTypes.js'

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
      headlessSaveOutput: (data: string, outputPath: string) => Promise<{ success: boolean; error?: string }>
      headlessSaveNifti: (base64Data: string, outputPath: string) => Promise<{ success: boolean; error?: string }>
      headlessWriteStdout: (base64Data: string) => Promise<void>
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
      }) => Promise<{ code: number; stdout: string; stderr: string; outDir: string; files: string[] }[]>
    }
  }
}
