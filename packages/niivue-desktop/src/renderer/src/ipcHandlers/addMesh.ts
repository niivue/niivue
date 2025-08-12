// src/ipcHandlers/loadMesh.ts
import React from 'react'
import { NVMesh, Niivue } from '@niivue/niivue'
import { MESH_EXTENSIONS } from '../../../common/extensions.js'

const electron = window.electron

export interface HandlerProps {
  nv: Niivue
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
}

export const registerAddMeshHandler = ({ nv, setMeshes }: HandlerProps): void => {
  // clear any existing listener
  electron.ipcRenderer.removeAllListeners('addMesh')

  electron.ipcRenderer.on('addMesh', async (_event, path: string) => {
    console.log('[Renderer] loadMesh received for path:', path)
    // fetch and parse the mesh file
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', path)
    const pathLower = path.toLowerCase()

    if (!MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
      alert(`File is not a mesh that Niivue can parse: ${path}`)
      throw new Error('File is not a mesh')
    }

    // load mesh
    const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
    const mesh = await NVMesh.loadFromFile({
      file: new File([arrayBuffer], path),
      gl: nv.gl,
      name: path
    })

    nv.addMesh(mesh)
    setMeshes(nv.meshes)
    nv.drawScene()
  })
}
