import { app, shell, BrowserWindow, Menu } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './utils/ipcHandlers.js'
import icon from '../../resources/icons/app_icon.png?asset'
import { createMenu } from './utils/menu.js'
import { getPlatformIcon } from './utils/getPlatformIcon.js'

// Helper to check if in development mode
const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null // Global variable to store the window instance
if (process.platform === 'darwin') {
  app.setName('NiiVue Desktop')
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: true,
    icon: getPlatformIcon(),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: false,
      nodeIntegration: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    const menu = createMenu(mainWindow!)
    Menu.setApplicationMenu(menu)
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    const icon = getPlatformIcon()
    if (typeof icon !== 'string') {
      app.dock.setIcon(icon)
    }
  }
  // Set app user model id for windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.niivue.desktop')
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  if (isDev) {
    app.on('browser-window-created', (_, window) => {
      window.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') {
          window.webContents.toggleDevTools()
          event.preventDefault()
        }
      })
    })
  }

  // register all IPC events at once
  registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

// Function to get the main window instance safely
export const getMainWindow = (): BrowserWindow | null => mainWindow
