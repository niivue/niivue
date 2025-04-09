import { Niivue } from "@niivue/niivue"

const electron = window.electron

export const registerSaveCompressedDocumentHandler = (nv: Niivue): void => {
  electron.ipcRenderer.on('saveCompressedDocument', async () => {
    try {
      const doc = nv.document
      const jsonStr = JSON.stringify(doc.json())
      await electron.ipcRenderer.invoke('saveCompressedNVD', jsonStr)
    } catch (e) {
      console.error('Failed to compress and save:', e)
      alert('Could not save compressed document.')
    }
  })
}
