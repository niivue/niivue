// src/ipcHandlers/loadDicomFolder.ts
import React from 'react'
import { dicomLoader } from '@niivue/dicom-loader'
import { Niivue, NVImage, NVMesh } from '@niivue/niivue'
import { base64ToArrayBuffer } from '@renderer/utils/base64ToJSON.js'
import { IpcRendererEvent } from 'electron'

export interface HandlerProps {
  /**
   * Returns the proper Niivue instance or creates a new document if it’s non-empty
   */
  getTarget: () => Promise<{
    nvRef: React.RefObject<Niivue>
    setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
    setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
    id: string
  }>
}

export const registerLoadDicomFolderHandler = ({ getTarget }: HandlerProps): void => {
  const electron = window.electron
  electron.ipcRenderer.removeAllListeners('convertDICOM')
  electron.ipcRenderer.on('convertDICOM', async (_: IpcRendererEvent, folderPath: string) => {
    console.log('[Renderer] loadDicomFolder received for folder:', folderPath)
    if (!folderPath) return

    // Determine the target Niivue instance (create new document if needed)
    const { nvRef, setVolumes } = await getTarget()
    const nv = nvRef.current!

    // 1️⃣ List and filter files
    const files: string[] = await electron.ipcRenderer.invoke('read-dir', folderPath)
    const paths = files
      .filter((name) => !name.startsWith('.'))
      .map((name) => `${folderPath}/${name}`)

    if (!paths.length) {
      console.error('[loadDicomFolder] No files found in', folderPath)
      return
    }

    // 2️⃣ Read all as ArrayBuffer
    const dicomInputs = await Promise.all(
      paths.map(async (path) => {
        const base64: string = await electron.ipcRenderer.invoke('read-file-as-base64', path)
        const arrayBuffer = base64ToArrayBuffer(base64)
        return { name: path, data: arrayBuffer }
      })
    )

    // 3️⃣ Convert DICOMs to Niivue-compatible volumes
    const converted = await dicomLoader(dicomInputs)

    // 4️⃣ Load into Niivue instance
    for (const file of converted) {
      await nv.loadFromArrayBuffer(file.data, file.name)
    }

    nv.drawScene()

    // 5️⃣ Update React state with new volumes
    if (nv.volumes.length) setVolumes(nv.volumes)
  })
}
