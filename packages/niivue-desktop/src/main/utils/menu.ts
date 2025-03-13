import { app, Menu, dialog, systemPreferences } from 'electron'
import { sliceTypeMap } from '../../common/sliceTypes.js'
import { layouts } from '../../common/layouts.js'
import { orientationLabelMap } from '../../common/orientationLabels.js'
import { dragModeMap } from '../../common/dragMode.js'
import { DEFAULT_OPTIONS } from '@niivue/niivue'
import { store } from './appStore.js'
import { getMainWindow } from '../index.js'
import fs from 'fs' // ✅ Works in ES Module mode

const isMac = process.platform === 'darwin'

const getRecentFilesMenu = (win: Electron.BrowserWindow): Electron.MenuItemConstructorOptions[] => {
  const recentFiles = store.getRecentFiles()
  if (recentFiles.length === 0) {
    return [{ label: 'No Recent Files', enabled: false }]
  }
  return recentFiles.map((file) => ({
    label: file,
    click: (): void => {
      console.log('loading file', file)
      win.webContents.send('loadRecentFile', file)
    }
  }))
}

// Function to refresh menu dynamically
export const refreshMenu = (): void => {
  const win = getMainWindow()
  if (win) {
    const menu = createMenu(win)
    Menu.setApplicationMenu(menu)
  }
}

const createDragModeSubmenu = (
  win: Electron.BrowserWindow
): Electron.MenuItemConstructorOptions[] => {
  return Object.keys(dragModeMap).map((dragModeLabel) => {
    return {
      label: dragModeLabel,
      id: `dragMode_${dragModeLabel}`,
      type: 'radio',
      checked: dragModeMap[dragModeLabel] === DEFAULT_OPTIONS.dragMode, // default to this drag mode
      click: (): void => {
        // get the drag mode value from the DRAG_MODE object
        const menuItem = Menu.getApplicationMenu()?.getMenuItemById(`dragMode_${dragModeLabel}`)
        const state = menuItem ? menuItem.checked : false
        win.webContents.send(
          'setDragMode',
          state ? dragModeMap[dragModeLabel] : DEFAULT_OPTIONS.dragMode
        )
      }
    }
  })
}

const createSliceTypeSubmenu = (
  win: Electron.BrowserWindow
): Electron.MenuItemConstructorOptions[] => {
  return Object.keys(sliceTypeMap).map((sliceType) => {
    return {
      label: sliceType,
      id: sliceType,
      type: 'radio',
      checked: sliceType === 'Multiplanar', // default to this slice type
      click: (): void => {
        // get the slice type value from the sliceTypeMap object
        const menuItem = Menu.getApplicationMenu()?.getMenuItemById(sliceType)
        const state = menuItem ? menuItem.checked : false
        win.webContents.send('setSliceType', state ? sliceTypeMap[sliceType].name : 'multiplanar')
      }
    }
  })
}

const createLayoutSubmenu = (
  win: Electron.BrowserWindow
): Electron.MenuItemConstructorOptions[] => {
  return Object.keys(layouts).map((layout) => {
    return {
      label: layout,
      id: layout,
      type: 'radio',
      checked: layout === 'Auto', // default to this layout
      click: (): void => {
        // get the layout value from the layouts object
        const menuItem = Menu.getApplicationMenu()?.getMenuItemById(layout)
        const state = menuItem ? menuItem.checked : false
        win.webContents.send('setLayout', state ? layout : 'Auto')
      }
    }
  })
}

const createOrientationLabelHeightSubmenu = (
  win: Electron.BrowserWindow
): Electron.MenuItemConstructorOptions[] => {
  return Object.keys(orientationLabelMap).map((orientationLabel) => {
    return {
      label: orientationLabel,
      id: `labelHeight_${orientationLabel}`,
      type: 'radio',
      checked:
        orientationLabel ===
        Object.keys(orientationLabelMap).find(
          (key) => orientationLabelMap[key] === DEFAULT_OPTIONS.textHeight
        ),
      click: (): void => {
        // get the orientation label value from the orientationLabelMap object
        const menuItem = Menu.getApplicationMenu()?.getMenuItemById(
          `labelHeight_${orientationLabel}`
        )
        const state = menuItem ? menuItem.checked : false
        console.log('orientationLabel', orientationLabel)
        win.webContents.send('setOrientationLabelsHeight', state ? orientationLabel : 'small')
      }
    }
  })
}

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
          // TODO: implement recent file loading
          label: 'Open Recent',
          submenu: [
            ...getRecentFilesMenu(win),
            { type: 'separator' },
            {
              label: 'Clear Recent Files',
              click: (): void => {
                store.clearRecentFiles()
                refreshMenu()
              }
            }
          ]
        },
        // Open Volume Image
        {
          label: 'Open Volume Image',
          click: (): void => {
            dialog
              .showOpenDialog(win, {
                title: 'Open Volume Image',
                properties: ['openFile']
              })
              .then((result) => {
                if (!result.canceled && result.filePaths.length > 0) {
                  win.webContents.send('loadVolume', result.filePaths[0])
                }
              })
          }
        },
        // Open Mesh Image
        {
          label: 'Open Mesh Image',
          click: (): void => {
            dialog
              .showOpenDialog(win, {
                title: 'Open Mesh Image',
                properties: ['openFile']
              })
              .then((result) => {
                if (!result.canceled && result.filePaths.length > 0) {
                  win.webContents.send('loadMesh', result.filePaths[0])
                }
              })
          }
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
                    fs.writeFile(result.filePath, buffer, (err) => {
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

    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Drag mode (right click)',
          submenu: [...createDragModeSubmenu(win)]
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
        { type: 'separator' }
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        ...createSliceTypeSubmenu(win),
        // separator
        { type: 'separator' },
        {
          label: 'Layout',
          submenu: createLayoutSubmenu(win)
        },
        // separator
        { type: 'separator' },
        {
          label: 'Show crosshair',
          type: 'checkbox',
          id: 'crosshair',
          accelerator: 'Shift+CommandOrControl+X',
          checked: true,
          click: (): void => {
            // get the current state of this menu item checkbox and send it to the renderer.
            // Note that getApplicationMenu() is executed after the menu is built and attached to the window.
            const menuItem = Menu.getApplicationMenu()?.getMenuItemById('crosshair')
            const state = menuItem ? menuItem.checked : false
            win.webContents.send('setCrosshair', state)
          }
        },
        {
          label: 'Show 3D crosshair',
          type: 'checkbox',
          id: 'crosshair3D',
          checked: DEFAULT_OPTIONS.show3Dcrosshair,
          click: (): void => {
            const menuItem = Menu.getApplicationMenu()?.getMenuItemById('crosshair3D')
            const state = menuItem ? menuItem.checked : false
            win.webContents.send('setCrosshair3D', state)
          }
        },
        {
          label: 'Show 3D orientation cube',
          type: 'checkbox',
          id: 'orientationCube',
          checked: DEFAULT_OPTIONS.isOrientCube,
          click: (): void => {
            const menuItem = Menu.getApplicationMenu()?.getMenuItemById('orientationCube')
            const state = menuItem ? menuItem.checked : false
            win.webContents.send('setOrientationCube', state)
          }
        },
        {
          label: 'Orientation label size',
          submenu: createOrientationLabelHeightSubmenu(win)
        },
        {
          label: 'Orientation label position',
          submenu: [
            {
              label: 'Corner',
              type: 'radio',
              id: 'orientLabelCorner',
              checked: DEFAULT_OPTIONS.isCornerOrientationText,
              click: (): void => {
                const menuItem = Menu.getApplicationMenu()?.getMenuItemById('orientLabelCorner')
                const state = menuItem ? menuItem.checked : false
                win.webContents.send('setOrientationLabelsPosition', state ? 'corner' : 'centered')
              }
            },
            {
              label: 'Centered',
              type: 'radio',
              id: 'orientLabelCentered',
              checked: !DEFAULT_OPTIONS.isCornerOrientationText,
              click: (): void => {
                const menuItem = Menu.getApplicationMenu()?.getMenuItemById('orientLabelCentered')
                const state = menuItem ? menuItem.checked : false
                win.webContents.send('setOrientationLabelsPosition', state ? 'centered' : 'corner')
              }
            }
          ]
        },
        {
          label: 'Orientation Labels in Margin',
          type: 'checkbox',
          id: 'orientLabelsInMargin',
          checked: true,
          click: (): void => {
            const menuItem = Menu.getApplicationMenu()?.getMenuItemById('orientLabelsInMargin')
            const state = menuItem ? menuItem.checked : false
            win.webContents.send('setOrientationLabelsInMargin', state)
          }
        },
        // equal size tiles
        {
          label: 'Equal size tiles (multiplanar)',
          type: 'checkbox',
          id: 'multiplanarEqualSize',
          checked: true,
          click: (): void => {
            const menuItem = Menu.getApplicationMenu()?.getMenuItemById('multiplanarEqualSize')
            const state = menuItem ? menuItem.checked : false
            win.webContents.send('setMultiplanarEqualSize', state)
          }
        },
        {
          label: 'Show colorbar',
          type: 'checkbox',
          id: 'colorbar',
          checked: DEFAULT_OPTIONS.isColorbar,
          click: (): void => {
            const menuItem = Menu.getApplicationMenu()?.getMenuItemById('colorbar')
            const state = menuItem ? menuItem.checked : false
            win.webContents.send('setColorbar', state)
          }
        },
        {
          label: 'Show ruler',
          type: 'checkbox',
          id: 'ruler',
          checked: DEFAULT_OPTIONS.isRuler,
          click: (): void => {
            const menuItem = Menu.getApplicationMenu()?.getMenuItemById('ruler')
            const state = menuItem ? menuItem.checked : false
            win.webContents.send('setRuler', state)
          }
        }
      ]
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' },
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
  if (isMac) {
    systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
    systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)
  }
  return menu
}
