import { NVImage, NVMesh, Niivue, NVDocument } from '@niivue/niivue'
import React from 'react'
import { MESH_EXTENSIONS } from '../../../common/extensions'
import { base64ToJson, decompressGzipBase64ToJson, isProbablyGzip } from '@renderer/utils/base64ToJSON'

const electron = window.electron

interface HandlerProps {
  nv: Niivue
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  /** Called when an .nvd document is successfully loaded */
  onDocumentLoaded?: (title: string) => void
}


export const registerLoadRecentFileHandler = ({
  nv,
  setVolumes,
  setMeshes,
  onDocumentLoaded
}: HandlerProps): void => {
  electron.ipcRenderer.on('loadRecentFile', async (_, filePath: string) => {
    console.log('[Renderer] loadRecentFile received for path:', filePath)
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', filePath)

    // Check if the file is a mesh or a volume
    const pathLower = filePath.toLowerCase()
    if(pathLower.endsWith('.nvd')) {
      const json = isProbablyGzip(base64)
      ? await decompressGzipBase64ToJson(base64)
      : base64ToJson(base64)
      if (!json) throw new Error('Invalid .nvd content')
      const doc = NVDocument.loadFromJSON(json)
      await nv.loadDocument(doc)
      // sync volumes & meshes into React state
      setVolumes(nv.volumes)
      setMeshes(nv.meshes)

      // derive a friendly title and notify
      if (onDocumentLoaded) {
        const fileName = filePath.split('/').pop()!
        // strip both `.nvd` and optional `.gz`
        const friendly = fileName.replace(/\.nvd(\.gz)?$/i, '')
        console.log('friendly name', friendly)
        onDocumentLoaded(friendly)
      }
      return
    }
    else if (MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
      const mesh = await NVMesh.loadFromFile({
        file: new File([arrayBuffer], filePath),
        gl: nv.gl,
        name: filePath
      })
      nv.addMesh(mesh)
      setMeshes((prev) => [...prev, mesh])
    } else {
      // Assume it's a volume
      const vol = await NVImage.loadFromBase64({
        base64,
        name: filePath
      })
      console.log('image loaded', vol)
      nv.addVolume(vol)
      setVolumes((prev) => [...prev, vol])
    }
  })
}
