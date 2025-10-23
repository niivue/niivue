// src/ipcHandlers/loadDocument.ts
import React from 'react'
import type { IpcRendererEvent } from 'electron'
import { DocumentData, NVDocument, NVImage, NVMesh, Niivue } from '@niivue/niivue'
import {
  base64ToJson,
  decompressGzipBase64ToJson,
  isProbablyGzip
} from '@renderer/utils/base64ToJSON.js'

const electron = window.electron

export interface HandlerProps {
  /**
   * Returns the proper Niivue instance or creates a new doc if it’s non-empty
   */
  getTarget: () => Promise<{
    id: string
    nvRef: React.RefObject<Niivue>
    setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
    setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  }>
  /**
   * Called when an .nvd document is successfully loaded into the given document
   */
  onDocumentLoaded?: (title: string, targetId: string) => void
}

console.log('[Renderer] registering loadDocument handler')

export const registerLoadDocumentHandler = ({
  getTarget,
  onDocumentLoaded
}: HandlerProps): void => {
  // Clear any existing listener
  electron.ipcRenderer.removeAllListeners('loadDocument')

  electron.ipcRenderer.on('loadDocument', async (_evt: IpcRendererEvent, filePath: string) => {
    console.log('[Renderer] loadDocument received for path:', filePath)

    // 1️⃣ Pick or create the Niivue instance
    const { id, nvRef, setVolumes, setMeshes } = await getTarget()
    const nv = nvRef.current!

    // 2️⃣ Read & parse the .nvd JSON (gzip‐aware)
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', filePath)
    const json: DocumentData = isProbablyGzip(base64)
      ? await decompressGzipBase64ToJson(base64)
      : (base64ToJson(base64) as DocumentData)
    if (!json) throw new Error('Invalid .nvd content')

    // 3️⃣ Load into Niivue
    const doc = NVDocument.loadFromJSON(json)
    await nv.loadDocument(doc)

    // 4️⃣ Sync React state
    if (nv.volumes.length) setVolumes(nv.volumes)
    if (nv.meshes.length) setMeshes(nv.meshes)

    // 5️⃣ Compute friendly title & notify
    if (onDocumentLoaded) {
      let title = json.title ?? ''
      if (!title || title === 'Untitled') {
        const fname = filePath.split('/').pop() || ''
        title = fname.replace(/\.nvd(\.gz)?$/i, '')
      }
      onDocumentLoaded(title, id)
    }

    // 6️⃣ Redraw scene
    nv.drawScene()
  })
}
