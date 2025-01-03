import { loadFromFileHandler } from './loadFromFile'
import { loadStandardHandler } from './loadStandard'
import { openMeshFileDialog } from './openMeshFileDialog'
import { ipcMain } from 'electron'

export const registerIpcHandlers = (): void => {
  ipcMain.handle('openMeshFileDialog', openMeshFileDialog)
  ipcMain.handle('loadFromFile', loadFromFileHandler)
  ipcMain.handle('loadStandard', loadStandardHandler)
}
