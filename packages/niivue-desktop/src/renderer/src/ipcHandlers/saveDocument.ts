import { Niivue } from '@niivue/niivue'

const electron = window.electron

export const registerSaveCompressedDocumentHandler = (nv: Niivue, docId: string, updateTitle: (title: string) => void): void => {
  electron.ipcRenderer.on('saveCompressedDocument', async () => {
    try {
      const doc = nv.document
      const jsonStr = JSON.stringify(doc.json())
      const fileName = await electron.ipcRenderer.invoke('saveCompressedNVD', jsonStr)

      if (fileName) {
        console.log('filename', fileName)
        const title = fileName.split('/').pop()?.replace(/\.nvd$/, '') || 'Untitled'
        updateTitle(title)
      }
    } catch (e) {
      console.error('Failed to compress and save:', e)
      alert('Could not save compressed document.')
    }
  })
}
