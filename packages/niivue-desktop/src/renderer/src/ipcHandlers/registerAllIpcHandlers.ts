// src/ipcHandlers/registerAllIpcHandlers.ts

import { Niivue } from '@niivue/niivue'
import { registerLoadStandardHandler } from './loadStandard'
import { registerLoadRecentFileHandler } from './loadRecentFiles'
import { registerSliceTypeHandler } from './menuHandlers'
import { registerLabelManagerDialogHandler } from './menuHandlers'
import { registerLoadMeshHandler } from './loadMesh'
import { registerLoadVolumeHandler } from './loadVolume'
import { registerLoadDocumentHandler } from './loadDocument'
import { registerSaveCompressedDocumentHandler } from './saveDocument'
import { registerResetPreferencesHandler } from './menuHandlers'

export const registerAllIpcHandlers = (
  nv: Niivue,
  setVolumes: React.Dispatch<React.SetStateAction<any[]>>,
  setMeshes: React.Dispatch<React.SetStateAction<any[]>>,
  setLabelDialogOpen: (v: boolean) => void,
  setLabelEditMode: (v: boolean) => void
): void => {
  console.log('[Renderer] registerAllIpcHandlers called')

  registerLoadStandardHandler({ nv, setVolumes, setMeshes })
  console.log('[Renderer] registered loadStandard handler')

  registerLoadRecentFileHandler({ nv, setVolumes, setMeshes })
  console.log('[Renderer] registered loadRecentFile handler')

  registerSliceTypeHandler(nv)
  registerLabelManagerDialogHandler(setLabelDialogOpen, setLabelEditMode)
  registerLoadMeshHandler({ nv, setMeshes })
  registerLoadVolumeHandler({ setVolumes })
  registerLoadDocumentHandler({ nv, setVolumes, setMeshes })
  registerSaveCompressedDocumentHandler(nv)
  registerResetPreferencesHandler()
}
