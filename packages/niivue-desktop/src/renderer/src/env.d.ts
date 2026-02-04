/// <reference types="vite/client" />

import { ElectronAPI } from '@electron-toolkit/preload'

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
      // Headless mode
      headlessGetOptions: () => Promise<{
        headless: boolean
        input: string | null
        model: string | null
        output: string | null
      }>
      headlessSaveOutput: (data: string, outputPath: string) => Promise<{ success: boolean; error?: string }>
      headlessComplete: () => void
      headlessError: (message: string) => void
      onHeadlessStart: (callback: () => void) => void
    }
  }
}
