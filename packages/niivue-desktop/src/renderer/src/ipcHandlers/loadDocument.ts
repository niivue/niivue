// src/ipcHandlers/loadDocument.ts
import React from 'react'
import { DocumentData, NVDocument, NVImage, NVMesh, Niivue } from '@niivue/niivue'
import {
  base64ToJson,
  decompressGzipBase64ToJson,
  isProbablyGzip
} from '@renderer/utils/base64ToJSON.js'
import type { IpcRendererEvent } from 'electron'

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
  onDocumentLoaded?: (title: string) => void
}

console.log('[Renderer] registering loadDocument handler')

export const registerLoadDocumentHandler = ({
  getTarget,
  onDocumentLoaded
}: HandlerProps): void => {
  electron.ipcRenderer.removeAllListeners('loadDocument')
  electron.ipcRenderer.on('loadDocument', async (_: IpcRendererEvent, filePath: string) => {
    console.log('[Renderer] loadDocument received for path:', filePath)

    // Determine the target Niivue instance (create new document if needed)
    const { nvRef, setVolumes, setMeshes } = await getTarget()
    const nv = nvRef.current!

    // 1️⃣ Read and parse document JSON
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', filePath)
    const json = isProbablyGzip(base64)
      ? ((await decompressGzipBase64ToJson(base64)) as DocumentData)
      : (base64ToJson(base64) as DocumentData)
    if (!json) throw new Error('Invalid .nvd content')

    // 2️⃣ Load into Niivue
    const doc = NVDocument.loadFromJSON(json)
    await nv.loadDocument(doc)

    // 3️⃣ Sync volumes & meshes state
    if (nv.volumes.length) setVolumes(nv.volumes)
    if (nv.meshes.length) setMeshes(nv.meshes)

    // 4️⃣ Determine friendly title
    let newTitle = json.title as string | undefined
    if (!newTitle || newTitle === 'Untitled') {
      const fname = filePath.split('/').pop() || ''
      newTitle = fname.replace(/\.nvd(\.gz)?$/i, '')
    }
    console.log('newTitle', newTitle)

    // 5️⃣ Notify caller
    onDocumentLoaded?.(newTitle)

    // 6️⃣ Redraw scene
    nv.drawScene()
  })
}
