import { NVImage, NVMesh, Niivue } from '@niivue/niivue'
import React from 'react'
import { MESH_EXTENSIONS } from '../../../common/extensions'

const electron = window.electron

interface HandlerProps {
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  nv: Niivue
}

export const registerLoadStandardHandler = ({ nv, setVolumes, setMeshes }: HandlerProps): void => {
  electron.ipcRenderer.on('loadStandard', async (_, path: string) => {
    const base64 = await electron.ipcRenderer.invoke('loadStandard', path)
    // if the file is a mesh, load it as a mesh, otherwise load it as a volume
    const pathLower = path.toLowerCase()
    if (MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
      const mesh = await NVMesh.loadFromFile({
        file: new File([arrayBuffer], path),
        gl: nv.gl,
        name: path
      })
      setMeshes((prev) => [...prev, mesh])
    } else {
      // assume it's a volume if it's not a mesh. NVImage will try to parse the volume if the file type is supported
      const vol = await NVImage.loadFromBase64({
        base64,
        name: path
      })
      setVolumes((prev) => [...prev, vol])
    }
  })
}
