import { loadFromFileHandler } from './loadFromFile.js'
import { loadStandardHandler } from './loadStandard.js'
import { openMeshFileDialog } from './openMeshFileDialog.js'
import { saveCompressedNVDHandler } from './saveFile.js'
import { app, dialog, ipcMain, nativeImage } from 'electron'
import { NVConfigOptions } from '@niivue/niivue'
import { store } from '../utils/appStore.js'
import { viewState, refreshMenu } from './menu.js'
import { sliceTypeMap } from '../../common/sliceTypes.js'
import { layouts } from '../../common/layouts.js'
import fs from 'fs'
import path from 'path'

const isDev = !app.isPackaged
const RESOURCES_DIR = isDev
  ? path.join(__dirname, '..', '..', 'resources')
  : path.join(process.resourcesPath)

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

  ipcMain.on('renderer:layout-changed', (_evt, newLayout: string) => {
    if (layouts[newLayout]) {
      viewState.layout = newLayout
      refreshMenu()
    }
  })

  // And when it changes the sliceType…
  ipcMain.on('renderer:sliceType-changed', (_evt, newSliceType: string) => {
    if (sliceTypeMap[newSliceType]) {
      viewState.sliceType = newSliceType
      refreshMenu()
    }
  })

  ipcMain.on(
    'start-tab-drag',
    (event, { fileName, jsonStr }: { fileName: string; jsonStr: string }) => {
      try {
        // const filePath = path.join(app.getPath('documents'), fileName)
        const tmpDir = app.getPath('temp')
        const filePath = path.join(tmpDir, fileName)
        fs.writeFileSync(filePath, jsonStr, 'utf-8')
        console.log('[start-tab-drag] File written to:', filePath)

        // const iconPath = path.join(process.resourcesPath, 'icons', 'file_icon.png')
        const iconPath = path.join(RESOURCES_DIR, 'icons', 'file_icon.png')
        // const iconPath = path.join(process.resourcesPath, 'icons', 'file_icon.png')
        console.log('[start-tab-drag] loading icon from:', iconPath)
        // const icon = nativeImage.createFromPath(dragIconPath)
        const icon = nativeImage.createFromPath(iconPath)
        if (icon.isEmpty()) {
          console.log('icon is empty')
        }

        const finalIcon = icon.isEmpty()
          ? nativeImage.createEmpty().resize({ width: 64, height: 64 })
          : icon.resize({ width: 64, height: 96 })

        event.sender.startDrag({
          file: filePath,
          icon: finalIcon
        })
      } catch (err) {
        console.error('[start-tab-drag] Failed:', err)
      }
    }
  )

  /**
   * Prompt user to select a directory
   * Returns the selected folder path as string, or null if cancelled
   */
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select DICOM Folder',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  /**
   * Read all file names in a directory
   * arg: dirPath (string)
   * returns: string[]
   */
  ipcMain.handle('read-dir', async (_event, dirPath) => {
    try {
      return fs.readdirSync(dirPath)
    } catch (err) {
      console.error('read-dir error:', err)
      return []
    }
  })

  /**
   * Read a single file as a Buffer
   * arg: filePath (string)
   * returns: Buffer
   */
  ipcMain.handle('read-file-as-buffer', async (_event, filePath) => {
    try {
      return fs.readFileSync(filePath)
    } catch (err) {
      console.error('read-file-as-buffer error:', err)
      return null
    }
  })

  ipcMain.handle('read-file-as-base64', async (_event, path) => {
    const buffer = fs.readFileSync(path)
    return buffer.toString('base64')
  })
}
