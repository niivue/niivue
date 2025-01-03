import { dialog, BrowserWindow } from 'electron'

export const openMeshFileDialog = (): void => {
  const win = BrowserWindow.getAllWindows()[0]
  dialog
    .showOpenDialog(win, {
      title: 'Open Mesh Image',
      properties: ['openFile']
    })
    .then((result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        win.webContents.send('openMeshFileDialogResult', result.filePaths[0])
        console.log('result.filePaths[0]', result.filePaths[0])
        return result.filePaths[0]
      }
      console.log('no file selected')
      return ''
    })
    .catch((error) => {
      console.error(error)
    })
}
