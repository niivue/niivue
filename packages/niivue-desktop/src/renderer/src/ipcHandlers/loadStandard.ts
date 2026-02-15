// src/ipcHandlers/loadStandard.ts
import React from 'react'
import { DocumentData, NVDocument, NVImage, NVMesh, Niivue } from '@niivue/niivue'
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
    id: string
    nvRef: React.RefObject<Niivue>
    setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
    setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  }>
  onDocumentLoaded?: (title: string, targetId: string) => void
}

console.log('[Renderer] registering loadStandard handler')

export const registerLoadStandardHandler = ({
  getTarget,
  onDocumentLoaded
}: HandlerProps): void => {
  electron.ipcRenderer.removeAllListeners('loadStandard')
  electron.ipcRenderer.on('loadStandard', async (_, path: string) => {
    console.log('[Renderer] loadStandard received for path:', path)

    // Determine the target Niivue instance (create new document if needed)
    const { id, nvRef, setVolumes, setMeshes } = await getTarget()
    const nv = nvRef.current!

    // Fetch file data
    const base64 = await electron.ipcRenderer.invoke('loadStandard', path)
    const pathLower = path.toLowerCase()
    // console.log('path lower', pathLower)
    if (pathLower.endsWith('.nvd')) {
      const json: DocumentData = isProbablyGzip(base64)
        ? await decompressGzipBase64ToJson(base64)
        : (base64ToJson(base64) as DocumentData)
      if (!json) throw new Error('Invalid .nvd content')

      // 3️⃣ Load into Niivue
      const doc = await NVDocument.loadFromJSON(json)
      await nv.loadDocument(doc)

      // 4️⃣ Sync React state
      if (nv.volumes.length) setVolumes(nv.volumes)
      if (nv.meshes.length) setMeshes(nv.meshes)

      // 5️⃣ Compute friendly title & notify
      if (onDocumentLoaded) {
        let title = json.title ?? ''
        if (!title || title === 'Untitled') {
          const fname = path.split('/').pop() || ''
          title = fname.replace(/\.nvd(\.gz)?$/i, '')
        }
        onDocumentLoaded(title, id)
      }

      // 6️⃣ Redraw scene
      nv.drawScene()
    } else if (MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
      // Mesh case
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
      const mesh = await NVMesh.loadFromFile({
        file: new File([arrayBuffer], path),
        gl: nv.gl,
        name: path
      })
      nv.addMesh(mesh)
      setMeshes((prev) => [...prev, mesh])
    } else {
      // Volume/image case
      const vol = await NVImage.loadFromBase64({ base64, name: path })
      nv.addVolume(vol)
      setVolumes((prev) => [...prev, vol])
    }

    nv.drawScene()
  })
}
