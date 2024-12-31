import { loadFromFileHandler } from './loadFromFile'
import { loadStandardHandler } from './loadStandard'
import { ipcMain } from 'electron'

export const registerIpcHandlers = (): void => {
  ipcMain.handle('loadFromFile', loadFromFileHandler)
  ipcMain.handle('loadStandard', loadStandardHandler)
}
