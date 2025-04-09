import { writeFile } from 'fs/promises'
import { gzip } from 'zlib'
import { promisify } from 'util'
import { dialog } from 'electron'
import { store } from './appStore.js'
import { refreshMenu } from './menu.js'

const gzipAsync = promisify(gzip)

export const saveCompressedNVDHandler = async (_: unknown, jsonStr: string): Promise<void> => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Compressed Niivue Document',
      defaultPath: 'document.nvd',
      filters: [{ name: 'Gzipped NVD', extensions: ['nvd', 'nvd.gz'] }]
    })

    if (canceled || !filePath) return

    const compressed = await gzipAsync(jsonStr)
    await writeFile(filePath, compressed)

    store.addRecentFile(filePath)
    refreshMenu()
  } catch (error) {
    console.error('Failed to save compressed NVD:', error)
  }
}
