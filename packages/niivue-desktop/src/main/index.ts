import { app, shell, BrowserWindow, Menu, ipcMain } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { registerIpcHandlers } from './utils/ipcHandlers.js'
import icon from '../../resources/icons/app_icon.png?asset'
import { createMenu } from './utils/menu.js'
import { getPlatformIcon } from './utils/getPlatformIcon.js'

// Helper to check if in development mode
const isDev = !app.isPackaged

// CLI options interface
interface CLIOptions {
  headless: boolean
  input: string | null
  model: string | null
  output: string | null
}

// Parse CLI arguments
function parseCLIArgs(): CLIOptions {
  const args = process.argv.slice(isDev ? 2 : 1)
  const options: CLIOptions = {
    headless: false,
    input: null,
    model: null,
    output: null
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--headless':
        options.headless = true
        break
      case '--input':
        options.input = args[++i] || null
        break
      case '--model':
        options.model = args[++i] || null
        break
      case '--output':
        options.output = args[++i] || null
        break
    }
  }

  return options
}

const cliOptions = parseCLIArgs()

let mainWindow: BrowserWindow | null = null // Global variable to store the window instance
if (process.platform === 'darwin') {
  app.setName('NiiVue Desktop')
}

function createWindow(): void {
  const isHeadless = cliOptions.headless

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: !isHeadless,
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
    if (!isHeadless) {
      mainWindow!.show()
    } else {
      // Signal renderer to start headless processing
      mainWindow!.webContents.send('headless:start')
    }
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

// Headless mode IPC handlers
ipcMain.handle('headless:get-options', () => {
  return cliOptions
})

ipcMain.handle('headless:save-output', async (_event, data: string, outputPath: string) => {
  try {
    const ext = outputPath.toLowerCase().split('.').pop()
    if (ext === 'png') {
      // data is base64 PNG (with or without data URL prefix)
      const base64Data = data.replace(/^data:image\/png;base64,/, '')
      await fs.promises.writeFile(outputPath, Buffer.from(base64Data, 'base64'))
    } else {
      // data is JSON string for .nvd or other formats
      await fs.promises.writeFile(outputPath, data, 'utf-8')
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.on('headless:complete', () => {
  console.log('Headless operation completed successfully')
  app.quit()
})

ipcMain.on('headless:error', (_event, message: string) => {
  console.error('Headless operation failed:', message)
  process.exit(1)
})

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
