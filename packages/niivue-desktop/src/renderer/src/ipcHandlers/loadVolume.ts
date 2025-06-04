import { NVImage, Niivue } from '@niivue/niivue'
import React from 'react'
import { MESH_EXTENSIONS } from '../../../common/extensions'

const electron = window.electron

interface HandlerProps {
  nv: Niivue
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
}

export const registerLoadVolumeHandler = ({ nv, setVolumes }: HandlerProps): void => {
  electron.ipcRenderer.on('loadVolume', async (_, path: string) => {
    console.log('[Renderer] loadVolume received for path:', path)

    const base64 = await electron.ipcRenderer.invoke('loadFromFile', path)
    const pathLower = path.toLowerCase()

    if (MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
      alert(`File is not a volume that Niivue can parse: ${path}`)
      throw new Error('File is not a volume')
    } else {
      const vol = await NVImage.loadFromBase64({
        base64,
        name: path
      })
      console.log('[Renderer] volume loaded:', vol)

      // Add to Niivue
      nv.addVolume(vol)
      nv.drawScene()

      // Add to React state
      setVolumes((prev) => [...prev, vol])
    }
  })
}
