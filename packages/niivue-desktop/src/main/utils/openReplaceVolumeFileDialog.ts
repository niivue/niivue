import { dialog, BrowserWindow } from 'electron'

export const openReplaceVolumeFileDialog = (index: number): void => {
  const win = BrowserWindow.getAllWindows()[0]
  dialog
    .showOpenDialog(win, {
      title: 'Select Replacement Volume',
      properties: ['openFile'],
      filters: [{ name: 'NIfTI files', extensions: ['nii', 'nii.gz'] }]
    })
    .then((result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        const path = result.filePaths[0]
        win.webContents.send('replaceVolumeFileDialogResult', { index, path })
        return path
      }
      win.webContents.send('replaceVolumeFileDialogResult', { index, path: '' })
      return ''
    })
    .catch((error) => {
      console.error('openReplaceVolumeFileDialog error:', error)
    })
}
