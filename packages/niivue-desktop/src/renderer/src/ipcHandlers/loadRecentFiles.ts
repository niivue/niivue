// src/ipcHandlers/loadRecentFiles.ts
import React from 'react'
import { NVImage, NVMesh, Niivue, NVDocument, DocumentData } from '@niivue/niivue'
import { MESH_EXTENSIONS } from '../../../common/extensions.js'
import {
  base64ToJson,
  decompressGzipBase64ToJson,
  isProbablyGzip
} from '@renderer/utils/base64ToJSON.js'

const electron = window.electron

export interface HandlerProps {
  /** returns the proper Niivue instance or creates a new doc if it’s non-empty */
  getTarget: () => Promise<{
    nvRef: React.RefObject<Niivue>
    setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
    setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
    id: string
  }>
  /** Called when an .nvd document is successfully loaded */
  onDocumentLoaded?: (title: string, targetId: string) => void
}

console.log('[Renderer] registering loadRecentFile handler')

export const registerLoadRecentFileHandler = ({
  getTarget,
  onDocumentLoaded
}: HandlerProps): void => {
  electron.ipcRenderer.removeAllListeners('loadRecentFile')
  electron.ipcRenderer.on('loadRecentFile', async (_, filePath: string) => {
    console.log('[Renderer] loadRecentFile received for path:', filePath)

    // Determine the target Niivue instance (create new doc if needed)
    const { nvRef, setVolumes, setMeshes, id } = await getTarget()
    const nv = nvRef.current!

    // Load file data
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', filePath)
    const pathLower = filePath.toLowerCase()

    if (pathLower.endsWith('.nvd')) {
      // Document case
      const json = isProbablyGzip(base64)
        ? ((await decompressGzipBase64ToJson(base64)) as DocumentData)
        : (base64ToJson(base64) as DocumentData)
      if (!json) throw new Error('Invalid .nvd content')
      const doc = NVDocument.loadFromJSON(json)
      await nv.loadDocument(doc)
      // Sync state
      setVolumes(nv.volumes)
      setMeshes(nv.meshes)

      // Notify
      if (onDocumentLoaded) {
        const fileName = filePath.split('/').pop()!
        const friendly = fileName.replace(/\.nvd(\.gz)?$/i, '')
        onDocumentLoaded(friendly, id)
      }
    } else if (MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
      // Mesh case
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
      const mesh = await NVMesh.loadFromFile({
        file: new File([arrayBuffer], filePath),
        gl: nv.gl,
        name: filePath
      })
      nv.addMesh(mesh)
      setMeshes((prev) => [...prev, mesh])
    } else {
      // Volume/image case
      const vol = await NVImage.loadFromBase64({ base64, name: filePath })
      nv.addVolume(vol)
      setVolumes((prev) => [...prev, vol])
    }

    nv.drawScene()
  })
}
