import { NVImage } from '@niivue/niivue'
import React from 'react'
import { MESH_EXTENSIONS } from '../../../common/extensions'
const electron = window.electron

interface HandlerProps {
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
}

export const registerLoadVolumeHandler = ({ setVolumes }: HandlerProps): void => {
  electron.ipcRenderer.on('loadVolume', async (_, path: string) => {
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', path)
    // if the file is a mesh, load it as a mesh, otherwise load it as a volume
    const pathLower = path.toLowerCase()
    if (MESH_EXTENSIONS.some((ext) => pathLower.endsWith(ext.toLowerCase()))) {
      alert(`File is not a volume that Niivue can parse: ${path}`)
      throw new Error('File is not a volume')
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
