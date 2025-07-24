import { app } from 'electron'
import { spawn } from 'child_process'
import { extname, join, resolve } from 'path'
import fs from 'fs'
import os from 'os'

// DEV flag
const isDev = !app.isPackaged

/**
 * Resolve the path to the bundled niimath binary for the current platform.
 */
export function getNiimathPath(): string {
  if (isDev) {
    // __dirname (in out/main/utils) → go up three levels into packages/niivue-desktop
    const devRoot = resolve(__dirname, '../../')
    switch (process.platform) {
      case 'darwin':
        return join(devRoot, 'native-binaries', 'darwin', 'niimath')
      case 'linux':
        return join(devRoot, 'native-binaries', 'linux', 'niimath')
      case 'win32':
        return join(devRoot, 'native-binaries', 'win32', 'niimath.exe')
      default:
        throw new Error(`Unsupported platform: ${process.platform}`)
    }
  }

  // PACKAGED lookup (inside .app / resources folder)
  const base = app.isPackaged ? process.resourcesPath : join(__dirname, '..', '..', 'resources')

  switch (process.platform) {
    case 'darwin':
      return join(base, 'native', 'niimath-macos')
    case 'linux':
      return join(base, 'native', 'niimath-linux')
    case 'win32':
      return join(base, 'native', 'niimath.exe')
    default:
      throw new Error(`Unsupported platform: ${process.platform}`)
  }
}

/**
 * Spawn the `niimath` CLI with the given arguments and collect its output.
 *
 * @param args - An array of command-line arguments to pass to the `niimath` binary.
 *               For example `['--version']` or `['compute', 'input.nii', 'output.nii']`.
 * @returns A promise that resolves with:
 *          - `stdout`: the accumulated standard output.
 *          - `stderr`: the accumulated standard error.
 *          - `code`:   the exit code of the process (zero on success).
 *
 * @example
 * ```ts
 * const result = await runNiimath(['--version'])
 * console.log(result.stdout) // e.g. "niimath version 1.0.0"
 * ```
 */
export function runNiimath(args: string[]): Promise<{
  stdout: string
  stderr: string
  code: number
}> {
  console.log('running niimath', args)
  return new Promise((resolve, reject) => {
    const bin = getNiimathPath()
    const proc = spawn(bin, args)

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
 * Start a Niimath job, writing the Base64‐encoded input to disk,
 * streaming logs back to the renderer, and sending the Base64‐encoded output.
 *
 * @param webContents  The WebContents to send IPC events on.
 * @param requestId    Unique ID to tag all outgoing events.
 * @param cmdArgs      CLI flags/options for niimath (excluding I/O paths).
 * @param input        Contains { base64, name } for the input volume.
 */
export async function startNiimathJob(
  requestId: string,
  cmdArgs: string[],
  input: { base64: string; name: string }
): Promise<{
  stdout: string
  stderr: string
  code: number
  file: string
  base64: string
}> {
  console.log(`Starting Niimath job ${requestId}`)

  // 1) Write input to temp file
  const tempDir = os.tmpdir()
  // preserve .nii.gz if present
  const inExt = input.name.toLowerCase().endsWith('.nii.gz')
    ? '.nii.gz'
    : extname(input.name) || '.nii'
  const baseName = input.name.replace(/.*[/]/, '')
  const inputFilename = `${baseName}-${requestId}${inExt}`
  const inputPath = join(tempDir, inputFilename)
  fs.writeFileSync(inputPath, Buffer.from(input.base64, 'base64'))

  // 2) Prepare output path
  const outputFilename = `niimath-out-${requestId}${inExt}`
  const outputPath = join(tempDir, outputFilename)

  // 3) Build args
  const args = [inputPath, ...cmdArgs, outputPath]
  console.log('niimath args', args)

  // 4) Run process
  const { stdout, stderr, code } = await new Promise<{
    stdout: string
    stderr: string
    code: number
  }>((resolve, reject) => {
    const proc = spawn(getNiimathPath(), args)
    let out = ''
    let err = ''
    proc.stdout?.on('data', (chunk) => {
      out += chunk.toString()
      console.log(chunk.toString())
    })
    proc.stderr?.on('data', (chunk) => {
      err += chunk.toString()
      console.log('Err', chunk.toString())
    })
    proc.on('error', reject)
    proc.on('close', (c) => resolve({ stdout: out, stderr: err, code: c ?? 0 }))
  })

  if (code !== 0) {
    throw new Error(`niimath exited with code ${code}: ${stderr}`)
  }

  // 5) Read output
  const bufOut = fs.readFileSync(outputPath)
  const outBase64 = bufOut.toString('base64')
  console.log('finished processing')
  return { stdout, stderr, code, file: outputPath, base64: outBase64 }
}
