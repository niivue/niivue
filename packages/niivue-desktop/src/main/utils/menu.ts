import { app, Menu, dialog } from 'electron'
import { readStandardFile } from './loadStandard'

const isMac = process.platform === 'darwin'

export const createMenu = (win: Electron.BrowserWindow): Electron.Menu => {
  const template = [
    // { role: 'appMenu' }
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' },
        {
          label: 'Open Recent',
          role: 'recentdocuments',
          submenu: [
            {
              label: 'Clear Recent',
              role: 'clearrecentdocuments'
            }
          ]
        },
        // Open standard images with submenu
        {
          label: 'Open Standard',
          submenu: [
            {
              label: 'mni152.nii.gz',
              click: (): void => {
                win.webContents.send('loadStandard', 'mni152.nii.gz')
              }
            },
            {
              label: 'aal.mz3',
              click: (): void => {
                win.webContents.send('loadStandard', 'aal.mz3')
              }
            }
          ]
        },
        // Open FSL
        {
          label: 'Open FSL',
          submenu: [
            {
              label: 'mni152 1mm',
              click: (): void => {
                // TODO: implement this
                win.webContents.send('loadFSL', 'mni152_1mm')
              }
            }
          ]
        },
        // Open AFNI
        {
          label: 'Open AFNI',
          submenu: [
            {
              label: 'mni152',
              click: (): void => {
                // TODO: implement this
                win.webContents.send('loadAFNI', 'mni152')
              }
            }
          ]
        },
        // Add atlas
        {
          label: 'Add Atlas',
          submenu: [
            {
              label: 'aal',
              click: (): void => {
                // TODO: implement this
                win.webContents.send('loadAtlas', 'aal')
              }
            }
          ]
        },
        // Save screenshot
        {
          label: 'Save Screenshot',
          // TODO: make IPC call to get canvas rect, and use the x, y, width, height to capture just the canvas.
          // This is preferred over the default niivue screenshot method because we can use the native save file dialog.
          click: (): void => {
            win.webContents.capturePage().then((image) => {
              dialog
                .showSaveDialog(win, {
                  title: 'Save Screenshot',
                  defaultPath: 'screenshot.png',
                  filters: [{ name: 'PNG', extensions: ['png'] }]
                })
                .then((result) => {
                  if (!result.canceled && result.filePath) {
                    const base64 = image.toDataURL().replace(/^data:image\/png;base64,/, '')
                    const buffer = Buffer.from(base64, 'base64')
                    require('fs').writeFile(result.filePath, buffer, (err) => {
                      if (err) {
                        console.error(err)
                      }
                    })
                  }
                })
            })
          }
        },
        // Save volume
        {
          label: 'Save Volume',
          click: (): void => {
            dialog
              .showSaveDialog(win, {
                title: 'Save Volume',
                defaultPath: 'volume.nii.gz',
                filters: [{ name: 'NIfTI', extensions: ['nii.gz'] }]
              })
              .then((result) => {
                if (!result.canceled && result.filePath) {
                  // TODO: implement this
                  win.webContents.send('saveVolume', result.filePath)
                }
              })
          }
        }
      ]
    },
    // import menu
    {
      label: 'Import',
      submenu: [
        {
          label: 'Convert DICOM to NIfTI',
          click: (): void => {
            dialog
              .showOpenDialog(win, {
                title: 'Select DICOM directory',
                properties: ['openDirectory']
              })
              .then((result) => {
                if (!result.canceled && result.filePaths.length > 0) {
                  // TODO: implement this
                  win.webContents.send('convertDICOM', result.filePaths[0])
                }
              })
          }
        }
      ]
    },
    // Draw menu
    {
      label: 'Draw',
      submenu: [
        // open drawing
        {
          label: 'Open Drawing',
          click: (): void => {
            dialog.showMessageBox(win, {
              title: 'Open Drawing',
              message: 'This feature is not implemented yet.'
            })
          }
        },
        // save drawing
        {
          label: 'Save Drawing',
          click: (): void => {
            dialog.showMessageBox(win, {
              title: 'Save Drawing',
              message: 'This feature is not implemented yet.'
            })
          }
        },
        // Close drawing
        {
          label: 'Close Drawing',
          click: (): void => {
            dialog.showMessageBox(win, {
              title: 'Close Drawing',
              message: 'This feature is not implemented yet.'
            })
          }
        },
        // separator
        { type: 'separator' },
        // undo draw
        {
          label: 'Undo',
          click: (): void => {
            dialog.showMessageBox(win, {
              title: 'Undo',
              message: 'This feature is not implemented yet.'
            })
          }
        },
        // transparency
        {
          label: 'Transparency',
          submenu: [
            {
              label: '0%',
              click: (): void => {
                dialog.showMessageBox(win, {
                  title: 'Transparency',
                  message: 'This feature is not implemented yet.'
                })
              }
            },
            {
              label: '25%',
              click: (): void => {
                dialog.showMessageBox(win, {
                  title: 'Transparency',
                  message: 'This feature is not implemented yet.'
                })
              }
            },
            {
              label: '50%',
              click: (): void => {
                dialog.showMessageBox(win, {
                  title: 'Transparency',
                  message: 'This feature is not implemented yet.'
                })
              }
            },
            {
              label: '90%',
              click: (): void => {
                dialog.showMessageBox(win, {
                  title: 'Transparency',
                  message: 'This feature is not implemented yet.'
                })
              }
            }
          ]
        },
        // Draw color
        {
          label: 'Color',
          submenu: [
            {
              label: 'Red',
              click: (): void => {
                dialog.showMessageBox(win, {
                  title: 'Color',
                  message: 'This feature is not implemented yet.'
                })
              }
            },
            {
              label: 'Green',
              click: (): void => {
                dialog.showMessageBox(win, {
                  title: 'Color',
                  message: 'This feature is not implemented yet.'
                })
              }
            },
            {
              label: 'Blue',
              click: (): void => {
                dialog.showMessageBox(win, {
                  title: 'Color',
                  message: 'This feature is not implemented yet.'
                })
              }
            },
            {
              label: 'Yellow',
              click: (): void => {
                dialog.showMessageBox(win, {
                  title: 'Color',
                  message: 'This feature is not implemented yet.'
                })
              }
            }
          ]
        },
        // Draw pen
        {
          label: 'Pen',
          submenu: [
            {
              label: 'Filled',
              click: (): void => {
                dialog.showMessageBox(win, {
                  title: 'Pen',
                  message: 'This feature is not implemented yet.'
                })
              }
            },
            {
              label: 'Overwrite existing colors',
              click: (): void => {
                dialog.showMessageBox(win, {
                  title: 'Pen',
                  message: 'This feature is not implemented yet.'
                })
              }
            }
          ]
        }
      ]
    },
    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }]
              }
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }])
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        { label: '3D Render' },
        { label: 'Axial' },
        { label: 'Coronal' },
        { label: 'Sagittal' },
        { label: 'Sagittal (nose left)' },
        { label: 'Multiplanar' },
        { label: 'Multiplanar + 3D render' },
        { label: 'Mosaic' },
        // separator
        { type: 'separator' },
        {
          label: 'Show crosshair',
          type: 'checkbox',
          id: 'crosshair',
          checked: true,
          click: (): void => {
            // get the current state of this menu item checkbox and send it to the renderer.
            // Note that getApplicationMenu() is executed after the menu is built and attached to the window.
            const menuItem = Menu.getApplicationMenu()?.getMenuItemById('crosshair')
            const state = menuItem ? menuItem.checked : false
            win.webContents.send('toggleCrosshair', state)
          }
        },
        { label: 'Show 3D orientation cube' },
        { label: 'Show orientation labels' },
        { label: 'Show colorbar' },
        { label: 'Show ruler' },
        // separator
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }])
      ]
    },
    {
      role: 'help'
    }
  ]

  const menu = Menu.buildFromTemplate(template as Electron.MenuItemConstructorOptions[])
  return menu
}
