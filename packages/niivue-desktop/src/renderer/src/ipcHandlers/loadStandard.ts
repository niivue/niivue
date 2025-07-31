// src/ipcHandlers/loadStandard.ts
import React from 'react'
import { NVImage, NVMesh, Niivue } from '@niivue/niivue'
import { MESH_EXTENSIONS } from '../../../common/extensions.js'

const electron = window.electron

export interface HandlerProps {
  /** returns the proper Niivue instance or creates a new doc if it’s non-empty */
  getTarget: () => Promise<{
    nvRef: React.RefObject<Niivue>
    setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
    setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  }>
}

console.log('[Renderer] registering loadStandard handler')

export const registerLoadStandardHandler = ({ getTarget }: HandlerProps): void => {
  electron.ipcRenderer.removeAllListeners('loadStandard')
  electron.ipcRenderer.on('loadStandard', async (_, path: string) => {
    console.log('[Renderer] loadStandard received for path:', path)

    // Determine the target Niivue instance (create new document if needed)
    const { nvRef, setVolumes, setMeshes } = await getTarget()
    const nv = nvRef.current!

    // Fetch file data
    const base64 = await electron.ipcRenderer.invoke('loadStandard', path)
    const pathLower = path.toLowerCase()

    if (MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
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
