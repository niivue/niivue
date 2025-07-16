import { Niivue, NVImage, NVMesh } from '@niivue/niivue'
import { registerLoadStandardHandler } from './loadStandard.js'
import { registerLoadRecentFileHandler } from './loadRecentFiles.js'
import { registerSliceTypeHandler } from './menuHandlers.js'
import { registerLabelManagerDialogHandler } from './menuHandlers.js'
import { registerLoadMeshHandler } from './loadMesh.js'
import { registerLoadVolumeHandler } from './loadVolume.js'
import { LoadDocumentHandlerProps, registerLoadDocumentHandler } from './loadDocument.js'
import { registerResetPreferencesHandler } from './menuHandlers.js'
import { registerLoadDicomFolderHandler } from './loadDicomFolder.js'

const electron = window.electron

export const registerAllIpcHandlers = (
  nv: Niivue,
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>,
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>,
  setLabelDialogOpen: (v: boolean) => void,
  setLabelEditMode: (v: boolean) => void,
  onDocumentLoaded: (title: string) => void
): void => {
  console.log('[Renderer] registerAllIpcHandlers called')

  // 🧹 Clear previously registered listeners to avoid duplicates
  electron.ipcRenderer.removeAllListeners('loadStandard')
  electron.ipcRenderer.removeAllListeners('loadRecentFile')
  electron.ipcRenderer.removeAllListeners('loadVolume')
  electron.ipcRenderer.removeAllListeners('loadMesh')
  electron.ipcRenderer.removeAllListeners('loadDocument')
  electron.ipcRenderer.removeAllListeners('openLabelManagerDialog')
  electron.ipcRenderer.removeAllListeners('convertDICOM')

  registerLoadStandardHandler({ nv, setVolumes, setMeshes })
  console.log('[Renderer] registered loadStandard handler')

  registerLoadRecentFileHandler({ nv, setVolumes, setMeshes, onDocumentLoaded })
  console.log('[Renderer] registered loadRecentFile handler')

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
}
