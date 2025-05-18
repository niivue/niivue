import { Niivue, NVDocument, NVImage, NVMesh } from '@niivue/niivue'
import React from 'react'
import { base64ToJson, decompressGzipBase64ToJson, isProbablyGzip } from '@renderer/utils/base64ToJSON'

const electron = window.electron

export interface LoadDocumentHandlerProps {
  nv: Niivue
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  onDocumentLoaded?: (title: string) => void
}

export const registerLoadDocumentHandler = ({
  nv,
  setVolumes,
  setMeshes,
  onDocumentLoaded
}: LoadDocumentHandlerProps): void => {
  const listener = async (_: any, filePath: string) => {
    // 1️⃣ read file
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', filePath)
    const json = isProbablyGzip(base64)
      ? await decompressGzipBase64ToJson(base64)
      : base64ToJson(base64)
    if (!json) throw new Error('Invalid .nvd content')

    // 2️⃣ load it into Niivue
    const doc = NVDocument.loadFromJSON(json)
    await nv.loadDocument(doc)

    // 3️⃣ sync volumes/meshes
    if (nv.volumes.length) setVolumes(nv.volumes)
    if (nv.meshes.length)  setMeshes(nv.meshes)

    // 4️⃣ determine new tab title
    let newTitle = json.title as string | undefined
    // if title is missing or the default “Untitled”, fallback to filename
    if (!newTitle || newTitle === 'Untitled') {
      const fname = filePath.split('/').pop() || ''
      newTitle = fname.replace(/\.nvd(\.gz)?$/, '')
    }
    console.log('newTitle', newTitle)
    // 5️⃣ notify caller to update the tab
    onDocumentLoaded?.(newTitle)
  }

  electron.ipcRenderer.on('loadDocument', listener)
  
}