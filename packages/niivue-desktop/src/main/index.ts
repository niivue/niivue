import { app, shell, BrowserWindow, Menu, ipcMain } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { registerIpcHandlers } from './utils/ipcHandlers.js'
import icon from '../../resources/icons/app_icon.png?asset'
import { createMenu } from './utils/menu.js'
import { getPlatformIcon } from './utils/getPlatformIcon.js'
import {
  type CLIOptions,
  getDefaultCLIOptions,
  EXIT_CODES,
  AVAILABLE_MODELS
} from '../common/cliTypes.js'

// Helper to check if in development mode
const isDev = !app.isPackaged

// Valid subcommands
const VALID_SUBCOMMANDS = ['view', 'segment', 'extract', 'dcm2niix', 'niimath'] as const

// Parse CLI arguments with subcommand architecture
function parseCLIArgs(): CLIOptions {
  const args = process.argv.slice(isDev ? 2 : 1)
  const options = getDefaultCLIOptions()

  // Check if first arg is a subcommand (not starting with -)
  if (args.length > 0 && !args[0].startsWith('-')) {
    const cmd = args[0]
    if (VALID_SUBCOMMANDS.includes(cmd as (typeof VALID_SUBCOMMANDS)[number])) {
      options.subcommand = cmd as CLIOptions['subcommand']

      // dcm2niix has a second-level subcommand (list/convert)
      if (cmd === 'dcm2niix' && args[1] && !args[1].startsWith('-')) {
        options.subcommandMode = args[1]
      }
    }
  }

  // Parse flags
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      // Legacy support for --headless flag (maps to view command if no subcommand)
      case '--headless':
        if (!options.subcommand) {
          options.subcommand = 'view'
        }
        break

      // Universal options
      case '--input':
      case '-i':
        options.input = args[++i] || null
        break
      case '--output':
      case '-o':
        options.output = args[++i] || null
        break
      case '--help':
      case '-h':
        options.help = true
        break

      // Segment options
      case '--model':
      case '-m':
        options.model = args[++i] || null
        break

      // niimath options
      case '--ops':
        options.ops = args[++i] || null
        break

      // dcm2niix options
      case '--series':
      case '-s':
        options.series = args[++i] || null
        break
      case '--compress':
      case '-z':
        options.compress = (args[++i] as 'y' | 'n') || 'y'
        break
      case '--bids':
      case '-b':
        options.bids = (args[++i] as 'y' | 'n') || 'y'
        break

      // Extract options
      case '--labels':
      case '-l':
        options.labels = args[++i] || null
        break
      case '--values':
      case '-v':
        options.values = args[++i] || null
        break
      case '--range':
      case '-r':
        options.range.push(args[++i] || '')
        break
      case '--invert':
        options.invert = true
        break
      case '--binarize':
        options.binarize = true
        break
      case '--label-json':
      case '-j':
        options.labelJson = args[++i] || null
        break
      case '--label-names':
      case '-n':
        options.labelNames = args[++i] || null
        break
    }
  }

  return options
}

// Print help text
function printHelp(subcommand?: string): void {
  if (subcommand === 'view') {
    console.log(`
niivue-desktop view - Load and render a volume

Usage:
  niivue-desktop view --input <path|url|name|-> --output <path|->

Options:
  --input, -i     Input file, URL, standard name (mni152, chris_t1), or "-" for stdin
  --output, -o    Output file (.png for screenshot, .nii.gz for volume) or "-" for stdout

Examples:
  niivue-desktop view --input brain.nii.gz --output screenshot.png
  niivue-desktop view --input https://example.com/brain.nii.gz --output local.nii.gz
  niivue-desktop view --input mni152 --output - | niivue-desktop segment --input - ...
`)
  } else if (subcommand === 'segment') {
    console.log(`
niivue-desktop segment - Run brain segmentation model

Usage:
  niivue-desktop segment --input <path|url|-> --model <name> --output <path|->

Options:
  --input, -i     Input volume (file, URL, or "-" for stdin base64)
  --output, -o    Output segmentation (.nii.gz or "-" for stdout base64)
  --model, -m     Model name: ${AVAILABLE_MODELS.join(', ')}

Examples:
  niivue-desktop segment --input brain.nii.gz --model tissue-seg-light --output seg.nii.gz
  niivue-desktop view --input mni152 --output - | niivue-desktop segment --input - --model parcellation-104 --output parcels.nii.gz
`)
  } else if (subcommand === 'extract') {
    console.log(`
niivue-desktop extract - Extract subvolume using label mask

Usage:
  niivue-desktop extract --input <volume> --labels <labels|-> --values <n,n,...> --output <path|->
  niivue-desktop extract --input <volume> --labels <labels> --label-json <json> --label-names <names> --output <path>

Options:
  --input, -i         Base volume to extract from (file, URL)
  --labels, -l        Label/mask volume (file, URL, or "-" for stdin base64)
  --output, -o        Output extracted volume (file or "-" for stdout base64)
  --values, -v        Comma-separated label values (e.g., "1,2,3")
  --range, -r         Label range (e.g., "10-20"), can be used multiple times
  --label-json, -j    Path to label.json file for named label lookup
  --label-names, -n   Comma-separated label names (requires --label-json)
  --invert            Invert selection (exclude specified labels)
  --binarize          Output as binary mask (0/1)

Examples:
  # Extract by numeric label values
  niivue-desktop extract --input brain.nii.gz --labels parcels.nii.gz --values 17,53 --output hippocampus.nii.gz

  # Extract by label names using label.json
  niivue-desktop extract --input brain.nii.gz --labels tissue_seg.nii.gz \\
    --label-json tissue-seg-light/labels.json --label-names "Gray Matter,White Matter" \\
    --output gm_wm.nii.gz

  # Pipeline: segment then extract by value
  niivue-desktop segment --input brain.nii.gz --model tissue-seg-light --output - | \\
    niivue-desktop extract --input brain.nii.gz --labels - --values 2 --output gray_matter.nii.gz
`)
  } else if (subcommand === 'dcm2niix') {
    console.log(`
niivue-desktop dcm2niix - Convert DICOM to NIfTI

Usage:
  niivue-desktop dcm2niix list --input <dicom-dir>
  niivue-desktop dcm2niix convert --input <dicom-dir> --series <n|all> --output <dir|->

Subcommands:
  list            List available DICOM series (JSON output)
  convert         Convert DICOM series to NIfTI

Options:
  --input, -i     DICOM directory path
  --output, -o    Output directory, file, or "-" for stdout (single series)
  --series, -s    Series number(s): "1", "1,2,3", or "all"
  --compress, -z  Compress output: y/n (default: y)
  --bids, -b      BIDS sidecar: y/n (default: y)

Examples:
  niivue-desktop dcm2niix list --input /path/to/dicom
  niivue-desktop dcm2niix convert --input /dicom --series 1 --output /output/
  niivue-desktop dcm2niix convert --input /dicom --series 1 --output - | niivue-desktop segment --input - ...
`)
  } else if (subcommand === 'niimath') {
    console.log(`
niivue-desktop niimath - Apply niimath operations

Usage:
  niivue-desktop niimath --input <path|-> --ops "<operations>" --output <path|->

Options:
  --input, -i     Input volume (file or "-" for stdin base64)
  --output, -o    Output volume (file or "-" for stdout base64)
  --ops           niimath operations string (e.g., "-s 2 -thr 100")

Common operations:
  -s <sigma>      Gaussian smoothing with sigma in mm
  -thr <value>    Threshold below value (set to 0)
  -bin            Binarize (non-zero becomes 1)
  -add <value>    Add value to all voxels
  -mul <value>    Multiply all voxels by value

Examples:
  niivue-desktop niimath --input brain.nii.gz --ops "-s 2" --output smooth.nii.gz
  niivue-desktop niimath --input brain.nii.gz --ops "-s 2 -thr 100 -bin" --output mask.nii.gz
  niivue-desktop view --input mni152 --output - | niivue-desktop niimath --input - --ops "-s 3" --output smooth.nii.gz
`)
  } else {
    console.log(`
NiiVue Desktop - Neuroimaging visualization and processing

Usage:
  niivue-desktop <subcommand> [options]
  niivue-desktop                        Launch GUI application

Subcommands:
  view        Load and render a volume (screenshot or pass-through)
  segment     Run brain segmentation model
  extract     Extract subvolume using label mask
  dcm2niix    Convert DICOM to NIfTI
  niimath     Apply niimath operations

Universal Options:
  --input, -i     Input file, URL, standard name, or "-" for stdin
  --output, -o    Output file or "-" for stdout
  --help, -h      Show help (use with subcommand for details)

Examples:
  # Launch GUI
  niivue-desktop

  # Take a screenshot
  niivue-desktop view --input brain.nii.gz --output screenshot.png

  # Run segmentation
  niivue-desktop segment --input brain.nii.gz --model tissue-seg-light --output seg.nii.gz

  # Pipeline: segment then extract gray matter
  niivue-desktop segment --input brain.nii.gz --model tissue-seg-light --output - | \\
    niivue-desktop extract --input brain.nii.gz --labels - --values 2 --output gray_matter.nii.gz

For subcommand help:
  niivue-desktop <subcommand> --help
`)
  }
}

const cliOptions = parseCLIArgs()

// Handle help flag before app ready
if (cliOptions.help) {
  printHelp(cliOptions.subcommand ?? undefined)
  process.exit(EXIT_CODES.SUCCESS)
}

// Determine if running in headless mode (any subcommand = headless)
const isHeadless = cliOptions.subcommand !== null

let mainWindow: BrowserWindow | null = null // Global variable to store the window instance
if (process.platform === 'darwin') {
  app.setName('NiiVue Desktop')
}

function createWindow(): void {

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

ipcMain.handle('headless:resolve-input', async (_event, input: string) => {
  const { resolveInput } = await import('./utils/inputResolver.js')
  return resolveInput(input, process.cwd())
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

ipcMain.handle('headless:save-nifti', async (_event, base64Data: string, outputPath: string) => {
  try {
    await fs.promises.writeFile(outputPath, Buffer.from(base64Data, 'base64'))
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('headless:load-label-json', async (_event, labelJsonPath: string) => {
  const { resolveInput } = await import('./utils/inputResolver.js')
  const resolved = await resolveInput(labelJsonPath, process.cwd())
  const jsonStr = Buffer.from(resolved.base64, 'base64').toString('utf-8')
  return JSON.parse(jsonStr)
})

ipcMain.handle('headless:write-stdout', async (_event, base64Data: string) => {
  const { writeBase64ToStdout } = await import('./utils/stdoutWriter.js')
  writeBase64ToStdout(base64Data)
})

ipcMain.handle('headless:niimath', async (_event, inputBase64: string, inputName: string, operations: string) => {
  const { startNiimathJob } = await import('./utils/runNiimath.js')
  const args = operations.trim().split(/\s+/)
  const result = await startNiimathJob(`headless-${Date.now()}`, args, { base64: inputBase64, name: inputName })
  return { base64: result.base64, success: true }
})

ipcMain.handle('headless:dcm2niix-list', async (_event, dicomDir: string) => {
  const { listDicomSeries } = await import('./utils/runDcm2niix.js')
  return listDicomSeries(dicomDir)
})

ipcMain.handle(
  'headless:dcm2niix-convert',
  async (
    _event,
    options: {
      dicomDir: string
      seriesNumbers: number[]
      outputDir?: string
      compress?: 'y' | 'n'
      bids?: 'y' | 'n'
    }
  ) => {
    const { convertSeriesByNumber } = await import('./utils/runDcm2niix.js')
    const results: { code: number; stdout: string; stderr: string; outDir: string; files: string[] }[] = []
    for (const seriesNum of options.seriesNumbers) {
      const result = await convertSeriesByNumber(options.dicomDir, seriesNum, {
        outDir: options.outputDir,
        compress: options.compress,
        bids: options.bids
      })
      // Get list of generated files
      const files = await fs.promises.readdir(result.outDir)
      const niftiFiles = files.filter((f) => f.endsWith('.nii') || f.endsWith('.nii.gz'))
      results.push({ ...result, files: niftiFiles })
    }
    return results
  }
)

ipcMain.on('headless:complete', () => {
  process.stderr.write('[niivue] Completed successfully\n')
  app.quit()
})

ipcMain.on('headless:error', (_event, message: string, exitCode?: number) => {
  process.stderr.write(`[niivue] ERROR: ${message}\n`)
  process.exit(exitCode ?? EXIT_CODES.GENERAL_ERROR)
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
