import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { join } from 'path'

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
