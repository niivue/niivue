import path from 'path'
import { app } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import type { DicomSeries, ConvertSeriesOptions } from '../../common/dcm2niixTypes.js'
import { spawnBinary } from './spawnBinary.js'
import { DRY_RUN_FORMAT, parseDicomSeriesOutput } from './dcm2niixParser.js'

const isDev = !app.isPackaged

function platformFolder(): 'darwin' | 'linux' | 'win32' {
  if (process.platform === 'darwin') return 'darwin'
  if (process.platform === 'linux') return 'linux'
  if (process.platform === 'win32') return 'win32'
  throw new Error(`Unsupported platform: ${process.platform}`)
}

export function getDcm2niixPath(): string {
  const exe = process.platform === 'win32' ? 'dcm2niix.exe' : 'dcm2niix'
  if (isDev) {
    const devRoot = path.resolve(__dirname, '../../')
    return path.join(devRoot, 'native-binaries', platformFolder(), exe)
  }
  return path.join(process.resourcesPath, 'native-binaries', 'dcm2niix', platformFolder(), exe)
}

export function spawnDcm2niix(
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number }> {
  const bin = getDcm2niixPath()
  return spawnBinary(bin, args)
}

export async function listDicomSeries(dicomDir: string): Promise<DicomSeries[]> {
  const { stdout, stderr, code } = await spawnDcm2niix(['-n', '-1', '-f', DRY_RUN_FORMAT, dicomDir])
  const text = [stdout, stderr].filter(Boolean).join('\n')
  if (code !== 0 && !text) throw new Error(`dcm2niix exited with code ${code}`)

  const folderName = path.basename(dicomDir)
  return parseDicomSeriesOutput(text, folderName)
}

export async function convertSeriesByNumber(
  dicomDir: string,
  seriesNumber: number,
  opts?: ConvertSeriesOptions
): Promise<{ code: number; stdout: string; stderr: string; outDir: string }> {
  const outDir = opts?.outDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'dcm2niix-'))
  const args: string[] = ['-n', String(seriesNumber)]
  if (opts?.pattern) args.push('-f', opts.pattern)
  if (opts?.compress) args.push('-z', opts.compress)
  if (opts?.bids) args.push('-b', opts.bids)
  if (typeof opts?.merge === 'number') args.push('-m', String(opts.merge))
  if (typeof opts?.verbose === 'number') args.push('-v', String(opts.verbose))
  args.push('-o', outDir)
  if (opts?.extra?.length) args.push(...opts.extra)
  args.push(dicomDir)

  const { stdout, stderr, code } = await spawnDcm2niix(args)
  return { code, stdout, stderr, outDir }
}
