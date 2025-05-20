// src/ipcHandlers/saveDocument.ts
import { Niivue } from '@niivue/niivue'

const electron = window.electron

/**
 * @param nv      your Niivue instance
 * @param docId   the ID of this document
 * @param getTitle  a zero‐arg function that returns the *React* title for this doc
 */
export function registerSaveCompressedDocumentHandler(
  nv: Niivue,
  docId: string,
  getTitle: () => string
): void {
  electron.ipcRenderer.on('saveCompressedDocument', async () => {
    try {
      const nvDoc = nv.document
      const jsonStr = JSON.stringify(nvDoc.json())

      // pull the *React* title, not nv.document.title
      const friendlyName = getTitle() || docId

      // pass that to the main process so the save‐dialog uses it
      const savedPath: string | undefined =
        await electron.ipcRenderer.invoke(
          'saveCompressedNVD',
          jsonStr,
          friendlyName
        )

      if (savedPath) {
        // notify your MainApp useEffect to update the tab title
        electron.ipcRenderer.send('document:saved', { id: docId, path: savedPath })
      }
    } catch (e) {
      console.error('Failed to compress and save:', e)
      alert('Could not save compressed document.')
    }
  })
}
