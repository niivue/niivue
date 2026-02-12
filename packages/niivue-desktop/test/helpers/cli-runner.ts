import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface CLIResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Run the niivue-desktop CLI with the given arguments
 * @param args - CLI arguments to pass
 * @param options - Optional configuration
 * @returns Promise resolving to CLI output and exit code
 */
export async function runCLI(
  args: string[],
  options?: {
    stdin?: string | Buffer
    timeout?: number
    cwd?: string
  }
): Promise<CLIResult> {
  // Get electron path - we need to find it in node_modules
  const electronPath = await getElectronPath()
  // Use the package directory (.) as the entry point - electron-vite will use package.json main field
  const packageDir = path.resolve(__dirname, '../..')

  return new Promise((resolve, reject) => {
    // Create a copy of the environment without ELECTRON_RUN_AS_NODE
    // Setting to undefined doesn't work - we need to actually delete the key
    const env = { ...process.env }
    delete env.ELECTRON_RUN_AS_NODE

    const proc = spawn(electronPath, [packageDir, ...args], {
      cwd: packageDir,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    // Write stdin if provided
    if (options?.stdin) {
      proc.stdin.write(options.stdin)
      proc.stdin.end()
    } else {
      proc.stdin.end()
    }

    const timeout = options?.timeout || 120000
    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      reject(new Error(`CLI timeout after ${timeout}ms`))
    }, timeout)

    proc.on('close', (code: number | null) => {
      clearTimeout(timer)
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1
      })
    })

    proc.on('error', (err: Error) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

/**
 * Get the electron executable path
 */
async function getElectronPath(): Promise<string> {
  // Try to import electron to get its path
  try {
    const electron = await import('electron')
    // electron's default export is the path to the executable
    return electron.default as unknown as string
  } catch {
    // Fallback to node_modules path
    const electronPath = path.resolve(__dirname, '../../node_modules/.bin/electron')
    return electronPath
  }
}

/**
 * Exit codes from cliTypes.ts
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGUMENTS: 2,
  INPUT_NOT_FOUND: 3,
  OUTPUT_WRITE_FAILED: 4,
  MODEL_NOT_FOUND: 5,
  DCM2NIIX_ERROR: 6,
  NIIMATH_ERROR: 7,
  STDIN_TIMEOUT: 8,
  URL_FETCH_ERROR: 9
} as const

/**
 * Standard test images bundled with the app
 */
export const STANDARD_IMAGES = ['mni152', 'chris_t1'] as const

/**
 * Available segmentation models
 */
export const AVAILABLE_MODELS = [
  'tissue-seg-light',
  'tissue-seg-full',
  'brain-extract-full',
  'subcortical-mini',
  'subcortical-full',
  'parcellation-50',
  'parcellation-104'
] as const
