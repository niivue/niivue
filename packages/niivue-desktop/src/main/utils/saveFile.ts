import { writeFile } from 'fs/promises'
import { gzip } from 'zlib'
import { promisify } from 'util'
import { dialog } from 'electron'
import { store } from './appStore.js'
import { refreshMenu } from './menu.js'
import path from 'path'

const gzipAsync = promisify(gzip)

export const saveCompressedNVDHandler = async (
  _: unknown,
  jsonStr: string,
  defaultName = 'document'
): Promise<string | undefined> => {
  try {
    const safeName = defaultName.replace(/\.nvd(\.gz)?$/, '')
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Compressed Niivue Document',
      defaultPath: `${safeName}.nvd`,
      filters: [{ name: 'Gzipped NVD', extensions: ['nvd', 'nvd.gz'] }]
    })

    if (canceled || !filePath) return

    const compressed = await gzipAsync(jsonStr)
    await writeFile(filePath, compressed)

    store.addRecentFile(filePath)
    refreshMenu()

    return path.basename(filePath)
  } catch (error) {
    console.error('Failed to save compressed NVD:', error)
    return undefined
  }
}
