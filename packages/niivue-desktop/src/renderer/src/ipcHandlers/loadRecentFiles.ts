import { NVImage, NVMesh, Niivue } from '@niivue/niivue'
import React from 'react'
import { MESH_EXTENSIONS } from '../../../common/extensions'

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
    if (MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
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
