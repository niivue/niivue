import { dicomLoader } from '@niivue/dicom-loader'

import { Niivue, NVImage } from '@niivue/niivue'
import { base64ToArrayBuffer } from '@renderer/utils/base64ToJSON.js'
import { IpcRendererEvent } from 'electron'

export const registerLoadDicomFolderHandler = ({
  nv,
  setVolumes
}: {
  nv: Niivue
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
}): void => {
  const electron = window.electron

  const listener = async (_: IpcRendererEvent, folderPath: string): Promise<void> => {
    console.log('load dicom folder')
    if (!folderPath) return
    console.log('folder is ', folderPath)
    // 1️⃣ List all files in folder
    const files = await electron.ipcRenderer.invoke('read-dir', folderPath)
    const paths = files
      .filter((name) => !name.startsWith('.'))
      .map((name) => `${folderPath}/${name}`)

    if (!paths.length) {
      console.error('[loadDicomFolder] No files')
      return
    }

    // 2️⃣ Read all as base64 + decode to ArrayBuffer
    const dicomInputs = await Promise.all(
      paths.map(async (path) => {
        const base64 = await electron.ipcRenderer.invoke('read-file-as-base64', path)
        const arrayBuffer = base64ToArrayBuffer(base64)
        return { name: path, data: arrayBuffer }
      })
    )

    // 3️⃣ Convert
    const converted = await dicomLoader(dicomInputs)

    // 4️⃣ Load into Niivue
    for (const file of converted) {
      await nv.loadFromArrayBuffer(file.data, file.name)
    }

    await nv.drawScene()
    if (nv.volumes.length) setVolumes(nv.volumes)
  }

  electron.ipcRenderer.on('convertDICOM', listener)
}
