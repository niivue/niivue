import path from 'path'
import { app } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import type { DicomSeries, ConvertSeriesOptions } from '../../common/dcm2niixTypes.js'

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
  return new Promise((resolve, reject) => {
    const bin = getDcm2niixPath()
    if (!fs.existsSync(bin)) {
      return reject(
        new Error(`dcm2niix not found at ${bin}. Did you run "npm run ensure-dcm2niix"?`)
      )
    }
    const child = spawn(bin, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => {
      out += String(d)
    })
    child.stderr.on('data', (d) => {
      err += String(d)
    })
    child.on('error', reject)
    child.on('close', (code) => resolve({ stdout: out, stderr: err, code: code ?? -1 }))
  })
}

export async function listDicomSeries(dicomDir: string): Promise<DicomSeries[]> {
  const { stdout, stderr, code } = await spawnDcm2niix(['-n', '-1', '-f', '%f_%p_%t_%s', dicomDir])
  const text = [stdout, stderr].filter(Boolean).join('\n')
  if (code !== 0 && !text) throw new Error(`dcm2niix exited with code ${code}`)

  // keep only lines that start with a digit (CRC prefix)
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => /^\d/.test(l))

  // group by numeric series number; fallback to label if no number
  type Group = { baseLabel: string; images?: number; count: number; sn?: number }
  const groups = new Map<string, Group>()

  for (const line of lines) {
    // "CRC  rest-of-label"
    const m = /^(\d+)\s+(.+)$/.exec(line)
    if (!m) continue
    const raw = m[2]

    // strip any directory pieces (usually not present, but safe)
    const labelFull = raw.replace(/^.*[\\/]/, '')

    // %s may come out like "15", or "15a"/"15b" when disambiguating.
    // capture digits + optional single trailing letter
    const snm = /_(\d+)([a-z])?$/i.exec(labelFull)
    const seriesNumber = snm ? Number(snm[1]) : undefined

    // display label WITHOUT the trailing letter so we show one row per series
    const baseLabel = snm ? labelFull.replace(/_(\d+)[a-z]?$/i, '_$1') : labelFull

    // optionally parse image count from the line if present
    const imgMatch = /Images:\s*(\d+)/i.exec(line)
    const images = imgMatch ? Number(imgMatch[1]) : undefined

    // grouping key: numeric series number if present, else the label itself
    const key = typeof seriesNumber === 'number' ? String(seriesNumber) : baseLabel
    const g = groups.get(key)

    if (!g) {
      groups.set(key, {
        baseLabel,
        images,
        count: 1,
        sn: seriesNumber
      })
    } else {
      // track max image count across variants
      if (typeof images === 'number') {
        const prev = g.images ?? 0
        if (images > prev) g.images = images
      }
      g.count++
    }
  }

  // build final list; you can append a "×N" hint if there were variants
  const series: DicomSeries[] = Array.from(groups.values()).map((g) => {
    const text = g.count > 1 ? `${g.baseLabel} ×${g.count}` : g.baseLabel
    return {
      text, // shown to the user
      seriesNumber: g.sn, // numeric only, letters removed
      seriesDescription: g.baseLabel,
      images: g.images
    }
  })

  // sort by numeric series number (unknowns at end)
  series.sort((a, b) => {
    const an = a.seriesNumber ?? Number.MAX_SAFE_INTEGER
    const bn = b.seriesNumber ?? Number.MAX_SAFE_INTEGER
    return an - bn
  })

  return series
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
