import { loadFromFileHandler } from './loadFromFile.js'
import { loadStandardHandler } from './loadStandard.js'
import { openMeshFileDialog } from './openMeshFileDialog.js'
import { saveCompressedNVDHandler } from './saveFile.js'
import { app, dialog, ipcMain, nativeImage, shell } from 'electron'
import { NVConfigOptions } from '@niivue/niivue'
import { store } from '../utils/appStore.js'
import { viewState, refreshMenu } from './menu.js'
import { sliceTypeMap } from '../../common/sliceTypes.js'
import { layouts } from '../../common/layouts.js'
import fs from 'fs'
import path from 'path'
import dragIconPath from '../../../resources/icons/file_icon_square.png?asset'

const emptyIcon = nativeImage.createEmpty().resize({ width: 64, height: 64 })
// const textfilePath = path.join(app.getPath('documents'), 'test.txt')
// fs.writeFileSync(textfilePath, 'test')

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
        const filePath = path.join(app.getPath('documents'), fileName)
        fs.writeFileSync(filePath, jsonStr, 'utf-8')
        console.log('[start-tab-drag] File written to:', filePath)

        const icon = nativeImage.createFromPath(dragIconPath)
        const finalIcon = icon.isEmpty()
          ? nativeImage.createEmpty().resize({ width: 64, height: 64 })
          : icon.resize({ width: 64, height: 64 })
        // console.log('icon resized')
        // console.log('icon size:', icon.getSize())
        // console.log('is empty:', icon.isEmpty())
        // console.log('toDataURL:', icon.toDataURL().substring(0, 100))
        event.sender.startDrag({
          file: filePath,
          icon: finalIcon
        })
        // console.log('drag started')
        // Optional fallback for Linux or debugging
        // if (process.platform === 'linux') {
        //   shell.showItemInFolder(filePath)
        // }

        // setTimeout(() => {
        //   console.log('[start-tab-drag] drag complete (timeout fallback)')
        // }, 500)
      } catch (err) {
        console.error('[start-tab-drag] Failed:', err)
      }
    }
  )
}
