// src/ipcHandlers/saveHTML.ts
import { Niivue } from '@niivue/niivue'
import { esm } from '@niivue/niivue/min'

const electron = window.electron

/**
 * @param nv       your Niivue instance
 * @param docId    the ID of this document (used for both canvas#… and tab tracking)
 * @param getTitle zero‑arg fn returning the React title for this doc
 */
export function registerSaveHTMLHandler(nv: Niivue, docId: string, getTitle: () => string): void {
  electron.ipcRenderer.on('saveHTML', async () => {
    try {
      // e.g. "MyScan.html"
      const friendlyName = `${(getTitle() || docId).replace(/\.html?$/i, '')}.html`

      // derive the canvas ID from the docId
      //   const canvasId = `gl-canvas-${docId}`

      // inline the bundled ESM module and point at the right canvas
      const rawEsmSource = decodeURIComponent(esm)
      const htmlStr = await nv.generateHTML('gl1', rawEsmSource)
      console.log('friendly name', friendlyName)
      console.log('html', htmlStr)
      console.log('friendly name')
      // ask main to show dialog & write the file
      const savedPath: string | undefined = await electron.ipcRenderer.invoke(
        'saveHTML',
        htmlStr,
        friendlyName
      )

      if (savedPath) {
        electron.ipcRenderer.send('document:saved', { id: docId, path: savedPath })
      }
    } catch (e) {
      console.error('Failed to save HTML export:', e)
      alert('Could not save HTML export.')
    }
  })
}
