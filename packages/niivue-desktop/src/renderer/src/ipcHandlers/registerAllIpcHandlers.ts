// src/ipcHandlers/registerAllIpcHandlers.ts
import React from 'react'
import { Niivue, NVImage, NVMesh } from '@niivue/niivue'
import { registerLoadStandardHandler } from './loadStandard.js'
import { registerLoadRecentFileHandler } from './loadRecentFiles.js'
import {
  registerSliceTypeHandler,
  registerLabelManagerDialogHandler,
  registerResetPreferencesHandler,
  registerDragModeHandler
} from './menuHandlers.js'
import { registerLoadMeshHandler } from './loadMesh.js'
import { registerLoadVolumeHandler } from './loadVolume.js'
import { registerLoadDocumentHandler } from './loadDocument.js'
import { registerLoadDicomFolderHandler } from './loadDicomFolder.js'
import { registerRunNiimathHandler } from './runNiimathCommand.js'
import { registerSaveHTMLHandler } from './saveHTML.js'
import { registerLoadOverlayHandler } from './loadOverlay.js'
import { registerDrawHandler } from './draw.js'

const electron = window.electron

export interface IpcHandlerProps {
  modeMap: Map<string, 'replace' | 'overlay'>
  indexMap: Map<string, number>
  nv: Niivue
  docId: string
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  /** returns the proper Niivue instance or creates a new doc if it’s non-empty */
  getTarget: () => Promise<{
    nvRef: React.RefObject<Niivue>
    setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
    setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
    id: string
  }>
  getTitle: () => string
  setLabelDialogOpen: (v: boolean) => void
  setLabelEditMode: (v: boolean) => void
  onDocumentLoaded: (title: string) => void
  onMosaicStringChange?: (sliceMosaicString: string) => void
}

export const registerAllIpcHandlers = ({
  modeMap,
  indexMap,
  nv,
  docId,
  setVolumes,
  getTarget,
  getTitle,
  setLabelDialogOpen,
  setLabelEditMode,
  onDocumentLoaded,
  onMosaicStringChange
}: IpcHandlerProps): void => {
  console.log('[Renderer] registerAllIpcHandlers called')

  // 🧹 Clear previous listeners
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
  electron.ipcRenderer.removeAllListeners('draw-command')
  electron.ipcRenderer.removeAllListeners('setDragMode')

  // 🔌 Register core handlers (now all driven by getTarget)
  registerLoadStandardHandler({ getTarget })
  registerLoadRecentFileHandler({ getTarget, onDocumentLoaded })
  registerLoadMeshHandler({ getTarget })
  registerLoadVolumeHandler({ getTarget })
  registerLoadDocumentHandler({ getTarget, onDocumentLoaded })
  registerLoadDicomFolderHandler({ getTarget })

  // menu & misc
  registerSliceTypeHandler(nv, onMosaicStringChange)
  registerLabelManagerDialogHandler(setLabelDialogOpen, setLabelEditMode)
  registerResetPreferencesHandler()
  registerRunNiimathHandler(nv, setVolumes, modeMap, indexMap)

  // 💾 Save → HTML
  registerSaveHTMLHandler(nv, docId, getTitle)

  // 📂 Load overlay (treat as additional volume)
  registerLoadOverlayHandler(nv, setVolumes)

  // ✍️ Drawing commands → updateDocument(opts)
  registerDrawHandler(nv)
  registerDragModeHandler(nv)
}
