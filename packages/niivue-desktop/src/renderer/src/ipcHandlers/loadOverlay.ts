// src/ipcHandlers/loadOverlay.ts
import { Niivue, NVImage } from '@niivue/niivue'

const electron = window.electron

export function registerLoadOverlayHandler(
  nv: Niivue,
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
): void {
  electron.ipcRenderer.on('loadOverlay', async (_evt, paths: string[]) => {
    for (const filePath of paths) {
      const base64 = await electron.ipcRenderer.invoke('loadFromFile', filePath)
      const vol = await NVImage.loadFromBase64({ base64, name: filePath })
      nv.addVolume(vol)
    }
    setVolumes(nv.volumes)
    nv.updateGLVolume()
  })
}
