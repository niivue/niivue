// src/ipcHandlers/registerAllIpcHandlers.ts
import React from 'react'
import { Niivue, NVImage, NVMesh } from '@niivue/niivue'
import { registerLoadStandardHandler } from './loadStandard.js'
import { registerLoadRecentFileHandler } from './loadRecentFiles.js'
import {
  registerSliceTypeHandler,
  registerLabelManagerDialogHandler,
  registerResetPreferencesHandler,
  registerDragModeHandler,
  registerToggleColorBarsHandler
} from './menuHandlers.js'
import { registerLoadMeshHandler } from './loadMesh.js'
import { registerLoadVolumeHandler } from './loadVolume.js'
import { registerLoadDocumentHandler } from './loadDocument.js'
import { registerRunNiimathHandler } from './runNiimathCommand.js'
import { registerSaveHTMLHandler } from './saveHTML.js'
import { registerLoadOverlayHandler } from './loadOverlay.js'
import { registerDrawHandler } from './draw.js'
import { registerAddMeshHandler } from './addMesh.js'
import { registerSegmentationHandlers } from './segmentation.js'

const electron = window.electron

export interface IpcHandlerProps {
  modeMap: Map<string, 'replace' | 'overlay'>
  indexMap: Map<string, number>
  nv: Niivue
  docId: string
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
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
  onDocumentLoaded: (title: string, targetId: string) => void
  onMosaicStringChange?: (sliceMosaicString: string) => void
  onToggleSegmentationPanel?: () => void
}

export const registerAllIpcHandlers = ({
  modeMap,
  indexMap,
  nv,
  docId,
  setVolumes,
  setMeshes,
  getTarget,
  getTitle,
  setLabelDialogOpen,
  setLabelEditMode,
  onDocumentLoaded,
  onMosaicStringChange,
  onToggleSegmentationPanel
}: IpcHandlerProps): void => {
  console.log('[Renderer] registerAllIpcHandlers called')

  // 🧹 Clear previous listeners
  electron.ipcRenderer.removeAllListeners('loadStandard')
  electron.ipcRenderer.removeAllListeners('loadRecentFile')
  electron.ipcRenderer.removeAllListeners('loadVolume')
  electron.ipcRenderer.removeAllListeners('loadMesh')
  electron.ipcRenderer.removeAllListeners('addMesh')
  electron.ipcRenderer.removeAllListeners('loadDocument')
  electron.ipcRenderer.removeAllListeners('openLabelManagerDialog')
  electron.ipcRenderer.removeAllListeners('runNiimath')
  electron.ipcRenderer.removeAllListeners('saveHTML')
  electron.ipcRenderer.removeAllListeners('loadOverlay')
  electron.ipcRenderer.removeAllListeners('draw-command')
  electron.ipcRenderer.removeAllListeners('setDragMode')
  electron.ipcRenderer.removeAllListeners('toggle-color-bars')

  // 🔌 Register core handlers (now all driven by getTarget)
  registerLoadStandardHandler({ getTarget, onDocumentLoaded })
  registerLoadRecentFileHandler({ getTarget, onDocumentLoaded })
  registerLoadMeshHandler({ getTarget })
  registerLoadVolumeHandler({ getTarget })
  registerLoadDocumentHandler({ getTarget, onDocumentLoaded })
  registerAddMeshHandler({ nv, setMeshes })

  // menu & misc
  registerSliceTypeHandler(nv, onMosaicStringChange)
  registerLabelManagerDialogHandler(setLabelDialogOpen, setLabelEditMode)
  registerResetPreferencesHandler()
  registerRunNiimathHandler(nv, setVolumes, modeMap, indexMap)

  // register the colorbar toggle handler so menu toggles update Niivue + optional UI
  registerToggleColorBarsHandler(nv)


  // 💾 Save → HTML
  registerSaveHTMLHandler(nv, docId, getTitle)

  // 📂 Load overlay (treat as additional volume)
  registerLoadOverlayHandler(nv, setVolumes)

  // ✍️ Drawing commands → updateDocument(opts)
  registerDrawHandler(nv)
  registerDragModeHandler(nv)

  // 🧠 Brain segmentation handlers
  registerSegmentationHandlers({
    nv,
    setVolumes,
    onTogglePanel: onToggleSegmentationPanel
  })
}
