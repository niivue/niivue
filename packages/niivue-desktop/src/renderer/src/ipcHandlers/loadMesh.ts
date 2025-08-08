// src/ipcHandlers/loadMesh.ts
import React from 'react'
import { NVImage, NVMesh, Niivue } from '@niivue/niivue'
import { MESH_EXTENSIONS } from '../../../common/extensions.js'

const electron = window.electron

export interface HandlerProps {
  /**
   * Returns the proper Niivue instance or creates a new doc if it’s non-empty
   */
  getTarget: () => Promise<{
    nvRef: React.RefObject<Niivue>
    setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
    setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
    id: string
  }>
}

export const registerLoadMeshHandler = ({ getTarget }: HandlerProps): void => {
  // clear any existing listener
  electron.ipcRenderer.removeAllListeners('loadMesh')

  electron.ipcRenderer.on('loadMesh', async (_event, path: string) => {
    console.log('[Renderer] loadMesh received for path:', path)

    // pick or create an appropriate document
    const { nvRef, setMeshes } = await getTarget()
    const nv = nvRef.current!

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
    setMeshes((prev) => [...prev, mesh])
    nv.drawScene()
  })
}
