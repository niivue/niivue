import { app } from 'electron'
import { spawn } from 'child_process'
import { join, resolve } from 'path'
import fs from 'fs'
import os from 'os'

const isDev = !app.isPackaged

/**
 * Resolve the path to the bundled allineate binary for the current platform.
 */
export function getAllineatePath(): string {
  if (isDev) {
    const devRoot = resolve(__dirname, '../../')
    switch (process.platform) {
      case 'darwin':
        return join(devRoot, 'native-binaries', 'darwin', 'allineate')
      case 'linux':
        return join(devRoot, 'native-binaries', 'linux', 'allineate')
      case 'win32':
        return join(devRoot, 'native-binaries', 'win32', 'allineate.exe')
      default:
        throw new Error(`Unsupported platform: ${process.platform}`)
    }
  }

  const base = process.resourcesPath
  switch (process.platform) {
    case 'darwin':
      return join(base, 'native', 'allineate-macos')
    case 'linux':
      return join(base, 'native', 'allineate-linux')
    case 'win32':
      return join(base, 'native', 'allineate.exe')
    default:
      throw new Error(`Unsupported platform: ${process.platform}`)
  }
}

/**
 * Spawn the `allineate` CLI with the given arguments and collect its output.
 */
export function runAllineate(args: string[]): Promise<{
  stdout: string
  stderr: string
  code: number
}> {
  console.log('running allineate', args)
  return new Promise((resolve, reject) => {
    const bin = getAllineatePath()
    if (!fs.existsSync(bin)) {
      return reject(
        new Error(`allineate not found at ${bin}. Place the binary in native-binaries/${process.platform}/`)
      )
    }
    const proc = spawn(bin, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    proc.on('error', (err) => reject(err))
    proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }))
  })
}

/**
 * Run an allineate registration job.
 *
 * @param movingPath    Path to the moving NIfTI image (or '-' for stdin)
 * @param stationaryPath Path to the stationary/target NIfTI image
 * @param outputPath    Path for the output NIfTI image (or '-' for stdout)
 * @param opts          Additional CLI options (e.g. ['-cost', 'lpc', '-cmass'])
 */
export async function runAllineateJob(
  movingPath: string,
  stationaryPath: string,
  outputPath: string,
  opts: string[] = []
): Promise<{
  stdout: string
  stderr: string
  code: number
  outputPath: string
}> {
  const args = [movingPath, stationaryPath, ...opts, outputPath]
  const { stdout, stderr, code } = await runAllineate(args)

  if (code !== 0) {
    throw new Error(`allineate exited with code ${code}: ${stderr}`)
  }

  return { stdout, stderr, code, outputPath }
}

/**
 * Run an allineate job with base64-encoded input, similar to startNiimathJob.
 *
 * @param requestId  Unique ID for temp file naming
 * @param moving     Base64-encoded moving image { base64, name }
 * @param stationaryPath  Path to the stationary/target image on disk
 * @param opts       Additional CLI options
 */
export async function startAllineateJob(
  requestId: string,
  moving: { base64: string; name: string },
  stationaryPath: string,
  opts: string[] = []
): Promise<{
  stdout: string
  stderr: string
  code: number
  file: string
  base64: string
}> {
  console.log(`Starting allineate job ${requestId}`)

  const tempDir = os.tmpdir()

  const inputFilename = `allineate-in-${requestId}.nii.gz`
  const inputPath = join(tempDir, inputFilename)
  fs.writeFileSync(inputPath, Buffer.from(moving.base64, 'base64'))

  const outputFilename = `allineate-out-${requestId}.nii.gz`
  const outputPath = join(tempDir, outputFilename)

  const { stdout, stderr, code } = await runAllineateJob(
    inputPath,
    stationaryPath,
    outputPath,
    opts
  )

  const bufOut = fs.readFileSync(outputPath)
  const outBase64 = bufOut.toString('base64')

  // Clean up temp input
  try { fs.unlinkSync(inputPath) } catch { /* ignore */ }

  return { stdout, stderr, code, file: outputPath, base64: outBase64 }
}
