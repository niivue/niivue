// src/ipcHandlers/loadVolume.ts
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

export const registerLoadVolumeHandler = ({ getTarget }: HandlerProps): void => {
  // Clear any existing listener
  electron.ipcRenderer.removeAllListeners('loadVolume')

  electron.ipcRenderer.on('loadVolume', async (_event, path: string) => {
    console.log('[Renderer] loadVolume received for path:', path)

    // Pick or create an appropriate document
    const { nvRef, setVolumes } = await getTarget()
    const nv = nvRef.current!

    // Load file data
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', path)
    const pathLower = path.toLowerCase()

    // Prevent loading meshes as volumes
    if (MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
      alert(`File is not a volume that Niivue can parse: ${path}`)
      throw new Error('File is not a volume')
    }

    // Load volume into Niivue
    const vol = await NVImage.loadFromBase64({ base64, name: path })
    console.log('[Renderer] volume loaded:', vol)
    nv.addVolume(vol)

    // Update React state
    setVolumes((prev) => [...prev, vol])

    // Redraw scene
    nv.drawScene()
  })
}
