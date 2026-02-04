import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import { readStdin } from './stdinReader.js'
import { type ResolvedInput, STANDARD_IMAGES } from '../../common/cliTypes.js'

const isDev = !app.isPackaged

/**
 * Get the path to bundled resources directory
 */
export function getResourcesPath(): string {
  if (isDev) {
    return path.resolve(__dirname, '../../resources')
  }
  return path.join(process.resourcesPath, 'resources')
}

/**
 * Get the path to a standard/bundled image
 */
export function getStandardImagePath(name: string): string {
  const resourcesPath = getResourcesPath()
  // Standard images are stored as .nii.gz in the images/standard directory
  return path.join(resourcesPath, 'images', 'standard', `${name}.nii.gz`)
}

/**
 * Check if a string is a valid URL
 */
function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://')
}

/**
 * Check if input is a standard/bundled image name
 */
function isStandardImage(input: string): boolean {
  return STANDARD_IMAGES.includes(input as (typeof STANDARD_IMAGES)[number])
}

/**
 * Check if input represents stdin
 */
function isStdin(input: string): boolean {
  return input === '-' || input.toLowerCase() === 'stdin'
}

/**
 * Download a file from a URL and return as Buffer
 */
async function downloadUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadUrl(response.headers.location).then(resolve).catch(reject)
        return
      }

      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`HTTP ${response.statusCode}: Failed to download ${url}`))
        return
      }

      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', reject)
    })

    request.on('error', reject)
    request.setTimeout(30000, () => {
      request.destroy()
      reject(new Error(`Timeout downloading ${url}`))
    })
  })
}

/**
 * Extract filename from a path or URL
 */
function extractFilename(input: string): string {
  if (isUrl(input)) {
    const url = new URL(input)
    const pathname = url.pathname
    return path.basename(pathname) || 'download.nii.gz'
  }
  return path.basename(input)
}

/**
 * Resolve input from various sources (file, URL, stdin, standard name)
 * and return base64-encoded data
 */
export async function resolveInput(input: string, cwd: string): Promise<ResolvedInput> {
  // Handle stdin
  if (isStdin(input)) {
    process.stderr.write('[niivue] Reading from stdin...\n')
    const data = await readStdin()
    return {
      type: 'stdin',
      originalPath: '-',
      base64: data,
      filename: 'stdin.nii.gz'
    }
  }

  // Handle URL
  if (isUrl(input)) {
    process.stderr.write(`[niivue] Downloading ${input}...\n`)
    const buffer = await downloadUrl(input)
    return {
      type: 'url',
      originalPath: input,
      base64: buffer.toString('base64'),
      filename: extractFilename(input)
    }
  }

  // Handle standard/bundled image name
  if (isStandardImage(input)) {
    const imagePath = getStandardImagePath(input)
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Standard image '${input}' not found at ${imagePath}`)
    }
    process.stderr.write(`[niivue] Loading standard image '${input}'...\n`)
    const buffer = await fs.promises.readFile(imagePath)
    return {
      type: 'standard',
      originalPath: input,
      base64: buffer.toString('base64'),
      filename: `${input}.nii.gz`
    }
  }

  // Handle local file path
  const resolvedPath = path.isAbsolute(input) ? input : path.resolve(cwd, input)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Input file not found: ${resolvedPath}`)
  }

  process.stderr.write(`[niivue] Loading ${resolvedPath}...\n`)
  const buffer = await fs.promises.readFile(resolvedPath)
  return {
    type: 'local-file',
    originalPath: input,
    base64: buffer.toString('base64'),
    filename: path.basename(resolvedPath)
  }
}

/**
 * Check if output path indicates stdout
 */
export function isStdoutOutput(output: string): boolean {
  return output === '-' || output.toLowerCase() === 'stdout'
}

/**
 * Determine output format based on file extension
 */
export function getOutputFormat(output: string): 'png' | 'nifti' | 'json' | 'nvd' {
  if (isStdoutOutput(output)) {
    return 'nifti' // Default to NIfTI for stdout
  }

  const ext = output.toLowerCase()
  if (ext.endsWith('.png')) return 'png'
  if (ext.endsWith('.json')) return 'json'
  if (ext.endsWith('.nvd')) return 'nvd'
  return 'nifti'
}
