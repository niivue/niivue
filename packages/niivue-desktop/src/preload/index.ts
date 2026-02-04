import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { join } from 'path'
import type { CLIOptions, ResolvedInput } from '../common/cliTypes.js'

const api = {
  ...electronAPI,
  startTabDrag: (fileName: string, jsonStr: string): void => {
    ipcRenderer.send('start-tab-drag', { fileName, jsonStr })
  },
  setZoomFactor: (factor: number): void => webFrame.setZoomFactor(factor),
  // Expose resourcesPath for loading bundled models and assets
  resourcesPath: process.resourcesPath,
  // Helper to get the resources directory (works in dev and production)
  getResourcesPath: (): string => {
    // In production, process.resourcesPath is defined and points to app.asar.unpacked/resources
    // In development, we need to construct the path to the resources directory
    if (process.resourcesPath) {
      return process.resourcesPath
    }
    // Development mode: go up from preload directory to project root, then into resources
    return join(__dirname, '..', '..', 'resources')
  },
  // Brainchop model loading via IPC
  loadBrainchopModel: (modelPath: string): Promise<{ modelJson: any; basePath: string }> => {
    return ipcRenderer.invoke('load-brainchop-model', modelPath)
  },
  loadBrainchopWeights: (weightPath: string): Promise<ArrayBuffer> => {
    return ipcRenderer.invoke('load-brainchop-weights', weightPath)
  },
  loadBrainchopLabels: (labelsPath: string): Promise<any> => {
    return ipcRenderer.invoke('load-brainchop-labels', labelsPath)
  },
  loadBrainchopPreview: (previewPath: string): Promise<string | null> => {
    return ipcRenderer.invoke('load-brainchop-preview', previewPath)
  },
  selectModelFolder: (): Promise<{
    folderPath: string
    modelJson: any
    hasLabels: boolean
    folderName: string
  } | null> => {
    return ipcRenderer.invoke('select-model-folder')
  },
  selectColormapFile: (): Promise<string | null> => {
    return ipcRenderer.invoke('select-colormap-file')
  },
  // Headless mode methods - Updated for subcommand architecture
  headlessGetOptions: (): Promise<CLIOptions> => {
    return ipcRenderer.invoke('headless:get-options')
  },
  headlessResolveInput: (input: string): Promise<ResolvedInput> => {
    return ipcRenderer.invoke('headless:resolve-input', input)
  },
  headlessSaveOutput: (data: string, outputPath: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('headless:save-output', data, outputPath)
  },
  headlessSaveNifti: (base64Data: string, outputPath: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('headless:save-nifti', base64Data, outputPath)
  },
  headlessWriteStdout: (base64Data: string): Promise<void> => {
    return ipcRenderer.invoke('headless:write-stdout', base64Data)
  },
  headlessComplete: (): void => {
    ipcRenderer.send('headless:complete')
  },
  headlessError: (message: string, exitCode?: number): void => {
    ipcRenderer.send('headless:error', message, exitCode)
  },
  onHeadlessStart: (callback: () => void): void => {
    ipcRenderer.on('headless:start', callback)
  },
  // niimath headless operations
  headlessNiimath: (
    inputBase64: string,
    inputName: string,
    operations: string
  ): Promise<{ base64: string; success: boolean }> => {
    return ipcRenderer.invoke('headless:niimath', inputBase64, inputName, operations)
  },
  // dcm2niix headless operations
  headlessDcm2niixList: (dicomDir: string): Promise<any[]> => {
    return ipcRenderer.invoke('headless:dcm2niix-list', dicomDir)
  },
  headlessDcm2niixConvert: (options: {
    dicomDir: string
    seriesNumbers: number[]
    outputDir?: string
    compress?: 'y' | 'n'
    bids?: 'y' | 'n'
  }): Promise<{ code: number; stdout: string; stderr: string; outDir: string; files: string[] }[]> => {
    return ipcRenderer.invoke('headless:dcm2niix-convert', options)
  }
} as const
// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // this is all we need. We mostly use the window.electron.ipcRenderer methods
    contextBridge.exposeInMainWorld('electron', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = api
}
