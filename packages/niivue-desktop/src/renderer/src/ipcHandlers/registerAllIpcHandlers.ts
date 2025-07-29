// src/ipcHandlers/registerAllIpcHandlers.ts
import { Niivue, NVImage, NVMesh } from '@niivue/niivue'
import { registerLoadStandardHandler } from './loadStandard.js'
import { registerLoadRecentFileHandler } from './loadRecentFiles.js'
import {
  registerSliceTypeHandler,
  registerLabelManagerDialogHandler,
  registerResetPreferencesHandler
} from './menuHandlers.js'
import { registerLoadMeshHandler } from './loadMesh.js'
import { registerLoadVolumeHandler } from './loadVolume.js'
import { LoadDocumentHandlerProps, registerLoadDocumentHandler } from './loadDocument.js'
import { registerLoadDicomFolderHandler } from './loadDicomFolder.js'
import { registerRunNiimathHandler } from './runNiimathCommand.js'
import { registerSaveHTMLHandler } from './saveHTML.js' // ← new import
import { registerLoadOverlayHandler } from './loadOvewrlay.js'
import { registerDrawHandler } from './draw.js'

const electron = window.electron

export const registerAllIpcHandlers = (
  nv: Niivue,
  docId: string, // ← new parameter
  getTitle: () => string, // ← new parameter
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>,
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>,
  setLabelDialogOpen: (v: boolean) => void,
  setLabelEditMode: (v: boolean) => void,
  modeMap: Map<string, 'replace' | 'overlay'>,
  indexMap: Map<string, number>,
  onDocumentLoaded: (title: string) => void
): void => {
  console.log('[Renderer] registerAllIpcHandlers called')

  // 🧹 Remove all existing listeners
  electron.ipcRenderer.removeAllListeners('loadStandard')
  electron.ipcRenderer.removeAllListeners('loadRecentFile')
  electron.ipcRenderer.removeAllListeners('loadVolume')
  electron.ipcRenderer.removeAllListeners('loadMesh')
  electron.ipcRenderer.removeAllListeners('loadDocument')
  electron.ipcRenderer.removeAllListeners('openLabelManagerDialog')
  electron.ipcRenderer.removeAllListeners('convertDICOM')
  electron.ipcRenderer.removeAllListeners('runNiimath')
  electron.ipcRenderer.removeAllListeners('saveHTML')
  electron.ipcRenderer.removeAllListeners('loadOverlay')

  // 🔌 Register all the handlers you already had
  registerLoadStandardHandler({ nv, setVolumes, setMeshes })
  registerLoadRecentFileHandler({ nv, setVolumes, setMeshes, onDocumentLoaded })
  registerSliceTypeHandler(nv)
  registerLabelManagerDialogHandler(setLabelDialogOpen, setLabelEditMode)
  registerLoadMeshHandler({ nv, setMeshes })
  registerLoadVolumeHandler({ nv, setVolumes })
  registerLoadDocumentHandler({
    nv,
    setVolumes,
    setMeshes,
    onDocumentLoaded
  } as LoadDocumentHandlerProps)
  registerResetPreferencesHandler()
  registerLoadDicomFolderHandler({ nv, setVolumes })
  registerRunNiimathHandler(nv, setVolumes, modeMap, indexMap)

  // 💾 Finally, wire up Save→HTML
  registerSaveHTMLHandler(nv, docId, getTitle)
  registerLoadOverlayHandler(nv, setVolumes)
  registerDrawHandler(nv)
}
