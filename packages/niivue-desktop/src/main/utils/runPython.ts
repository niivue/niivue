import { app } from 'electron'
import { spawn } from 'child_process'
import { join, resolve } from 'path'

// DEV flag
const isDev = !app.isPackaged

/**
 * Resolve the path to the bundled Python binary for the current platform.
 */
export function getPythonPath(): string {
  if (isDev) {
    // __dirname (in out/main/utils) -> go up three levels into packages/niivue-desktop
    const devRoot = resolve(__dirname, '../../')
    const pythonDir = join(devRoot, 'native-binaries', platformDir(), 'python')
    return join(pythonDir, 'install', 'bin', pythonExe())
  }

  // PACKAGED lookup (inside .app / resources folder)
  const base = app.isPackaged ? process.resourcesPath : join(__dirname, '..', '..', 'resources')
  return join(base, 'native', 'python', 'install', 'bin', pythonExe())
}

function platformDir(): string {
  switch (process.platform) {
    case 'darwin':
      return 'darwin'
    case 'linux':
      return 'linux'
    case 'win32':
      return 'win32'
    default:
      throw new Error(`Unsupported platform: ${process.platform}`)
  }
}

function pythonExe(): string {
  return process.platform === 'win32' ? 'python.exe' : 'python3'
}

/**
 * Run a Python script using the bundled interpreter.
 * stdio is inherited so the script can interact with the terminal.
 *
 * @param args - Arguments to pass to the Python interpreter (e.g., ['script.py', '--arg'])
 * @returns Exit code of the Python process
 */
export function runPythonScript(args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const bin = getPythonPath()
    console.log(`[Python] Running: ${bin} ${args.join(' ')}`)
    const proc = spawn(bin, args, {
      stdio: 'inherit',
      env: { ...process.env }
    })

    proc.on('error', (err) => reject(err))
    proc.on('close', (code) => resolve(code ?? 1))
  })
}
