import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer that expose some electron main process functionality
const api = {
  // load a file from disk given a path, return base64 encoded string (data must be serializable)
  loadFromFile: async (path: string): Promise<string> => {
    const base64 = await ipcRenderer.invoke('loadFromFile', path)
    return base64
  },
  loadStandard: async (path: string): Promise<string> => {
    const base64 = await ipcRenderer.invoke('loadStandard', path)
    return base64
  },
  onToggleCrosshair: (callback: (state: boolean) => void): void => {
    ipcRenderer.on('toggleCrosshair', (_, state) => callback(state))
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
