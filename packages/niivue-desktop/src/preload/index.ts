import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  ...electronAPI,
  startTabDrag: (fileName: string, jsonStr: string): void => {
    ipcRenderer.send('start-tab-drag', { fileName, jsonStr })
  },
  setZoomFactor: (factor: number): void => webFrame.setZoomFactor(factor)
}
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
