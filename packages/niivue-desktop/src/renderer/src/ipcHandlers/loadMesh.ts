import { NVMesh, Niivue } from '@niivue/niivue'
import React from 'react'
import { MESH_EXTENSIONS } from '../../../common/extensions'

const electron = window.electron

interface HandlerProps {
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  nv: Niivue
}

export const registerLoadMeshHandler = ({ nv, setMeshes }: HandlerProps): void => {
  electron.ipcRenderer.on('loadMesh', async (_, path: string) => {
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', path)
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
      alert(`File is not a mesh that Niivue can parse: ${path}`)
      throw new Error('File is not a mesh')
    }
  })
}
