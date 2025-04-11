import { loadFromFileHandler } from './loadFromFile.js'
import { loadStandardHandler } from './loadStandard.js'
import { openMeshFileDialog } from './openMeshFileDialog.js'
import { saveCompressedNVDHandler } from './saveFile.js'
import { dialog, ipcMain } from 'electron'
import { NVConfigOptions } from '@niivue/niivue'
import { store } from '../utils/appStore.js'

export const registerIpcHandlers = (): void => {
  ipcMain.handle('openMeshFileDialog', openMeshFileDialog)
  ipcMain.handle('loadFromFile', loadFromFileHandler)
  ipcMain.handle('loadStandard', loadStandardHandler)
  ipcMain.handle('saveCompressedNVD', saveCompressedNVDHandler)
  ipcMain.handle('getPreferences', () => {
    console.log('preferences called')
    return store.getPreferences()
  })

  ipcMain.handle(
    'setPreference',
    (_event, key: keyof NVConfigOptions, value: NVConfigOptions[keyof NVConfigOptions]) => {
      store.setPreference(key, value)
    }
  )

  ipcMain.handle('resetPreferences', () => {
    store.resetPreferences()
  })

  ipcMain.handle('dialog:openFile', async (_event, options) => {
    const { title = 'Open File', filters = [], properties = ['openFile'] } = options || {}
    const result = await dialog.showOpenDialog({
      title,
      properties,
      filters
    })
    return result.filePaths
  })
}
