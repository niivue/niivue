import type { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      startTabDrag: (fileName: string, jsonStr: string) => void
      setZoomFactor: (factor: number) => void
      loadBrainchopModel: (modelPath: string) => Promise<{ modelJson: any; basePath: string }>
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
    }
  }
}

export {}
