import { NVImage, NVMesh, Niivue, NVDocument } from '@niivue/niivue'
import React from 'react'
import { MESH_EXTENSIONS } from '../../../common/extensions'
import { base64ToJson } from '@renderer/utils/base64ToJSON'

const electron = window.electron

interface HandlerProps {
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  nv: Niivue
}


export const registerLoadRecentFileHandler = ({
  nv,
  setVolumes,
  setMeshes
}: HandlerProps): void => {
  electron.ipcRenderer.on('loadRecentFile', async (_, filePath: string) => {
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', filePath)

    // Check if the file is a mesh or a volume
    const pathLower = filePath.toLowerCase()
    if(pathLower.endsWith('.nvd')) {
      const json = base64ToJson(base64)
      if (!json) throw new Error('Invalid .nvd content')
      const doc = NVDocument.loadFromJSON(json)
      await nv.loadDocument(doc)
      if(nv.meshes.length > 0) {
        setMeshes(nv.meshes)
      }

      if(nv.volumes.length > 0) {
        setVolumes(nv.volumes)
      }
    }
    else if (MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
      const mesh = await NVMesh.loadFromFile({
        file: new File([arrayBuffer], filePath),
        gl: nv.gl,
        name: filePath
      })
      setMeshes((prev) => [...prev, mesh])
    } else {
      // Assume it's a volume
      const vol = await NVImage.loadFromBase64({
        base64,
        name: filePath
      })
      setVolumes((prev) => [...prev, vol])
    }
  })
}
