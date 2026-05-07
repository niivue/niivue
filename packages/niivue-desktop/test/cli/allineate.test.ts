import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { runCLI, EXIT_CODES } from '../helpers/cli-runner.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Read a NIfTI-1 sform from a buffer.
 * NIfTI-1 header offsets (float32, little-endian):
 *   srow_x: bytes 280-295 (4 floats)
 *   srow_y: bytes 296-311 (4 floats)
 *   srow_z: bytes 312-327 (4 floats)
 */
function readSform(header: Buffer): { srow_x: number[]; srow_y: number[]; srow_z: number[] } {
  return {
    srow_x: [header.readFloatLE(280), header.readFloatLE(284), header.readFloatLE(288), header.readFloatLE(292)],
    srow_y: [header.readFloatLE(296), header.readFloatLE(300), header.readFloatLE(304), header.readFloatLE(308)],
    srow_z: [header.readFloatLE(312), header.readFloatLE(316), header.readFloatLE(320), header.readFloatLE(324)]
  }
}

/**
 * Create a copy of a .nii.gz file with modified sform and qform translations.
 * Adds the given offsets (in mm) to the translation column.
 */
function createShiftedNifti(
  inputPath: string,
  outputPath: string,
  shiftMm: [number, number, number]
): void {
  const compressed = fs.readFileSync(inputPath)
  const data = zlib.gunzipSync(compressed)

  // Verify NIfTI-1 magic
  const headerSize = data.readInt32LE(0)
  if (headerSize !== 348) {
    throw new Error(`Unexpected NIfTI header size: ${headerSize}`)
  }

  // Modify sform translation (4th float in each srow at offsets 292, 308, 324)
  data.writeFloatLE(data.readFloatLE(292) + shiftMm[0], 292)
  data.writeFloatLE(data.readFloatLE(308) + shiftMm[1], 308)
  data.writeFloatLE(data.readFloatLE(324) + shiftMm[2], 324)

  // Also update qform offset if present (qoffset_x/y/z at offsets 268/272/276)
  const qformCode = data.readInt16LE(252)
  if (qformCode > 0) {
    data.writeFloatLE(data.readFloatLE(268) + shiftMm[0], 268)
    data.writeFloatLE(data.readFloatLE(272) + shiftMm[1], 272)
    data.writeFloatLE(data.readFloatLE(276) + shiftMm[2], 276)
  }

  fs.writeFileSync(outputPath, zlib.gzipSync(data))
}

/**
 * Read the sform from a .nii.gz file
 */
function readSformFromFile(filePath: string): { srow_x: number[]; srow_y: number[]; srow_z: number[] } {
  const data = zlib.gunzipSync(fs.readFileSync(filePath))
  return readSform(data)
}

/**
 * Downsample a NIfTI to 2mm isotropic by halving each dimension.
 * This is a quick-and-dirty subsample (take every other voxel) to speed up tests.
 */
function downsampleNifti(inputPath: string, outputPath: string): void {
  const compressed = fs.readFileSync(inputPath)
  const data = zlib.gunzipSync(compressed)

  const headerSize = data.readInt32LE(0)
  if (headerSize !== 348) throw new Error(`Unexpected NIfTI header size: ${headerSize}`)

  // Read dimensions
  const nx = data.readInt16LE(42)
  const ny = data.readInt16LE(44)
  const nz = data.readInt16LE(46)

  const nx2 = Math.floor(nx / 2)
  const ny2 = Math.floor(ny / 2)
  const nz2 = Math.floor(nz / 2)

  // Read voxel sizes
  const dx = data.readFloatLE(80)
  const dy = data.readFloatLE(84)
  const dz = data.readFloatLE(88)

  // Read datatype and bitpix
  const datatype = data.readInt16LE(70)
  const bitpix = data.readInt16LE(72)
  const bytesPerVoxel = bitpix / 8

  // Get vox_offset (where image data starts)
  const voxOffset = data.readFloatLE(108)
  const dataStart = Math.round(voxOffset)

  // Create new buffer: same header + subsampled data
  const newDataSize = nx2 * ny2 * nz2 * bytesPerVoxel
  const newBuf = Buffer.alloc(dataStart + newDataSize)

  // Copy header
  data.copy(newBuf, 0, 0, dataStart)

  // Update dimensions
  newBuf.writeInt16LE(nx2, 42)
  newBuf.writeInt16LE(ny2, 44)
  newBuf.writeInt16LE(nz2, 46)

  // Update voxel sizes (double them)
  newBuf.writeFloatLE(dx * 2, 80)
  newBuf.writeFloatLE(dy * 2, 84)
  newBuf.writeFloatLE(dz * 2, 88)

  // Update sform to reflect 2x voxel size
  // Scale the rotation/scale columns by 2
  for (const rowOffset of [280, 296, 312]) {
    for (let col = 0; col < 3; col++) {
      const off = rowOffset + col * 4
      newBuf.writeFloatLE(data.readFloatLE(off) * 2, off)
    }
    // Translation stays the same
    const transOff = rowOffset + 12
    newBuf.writeFloatLE(data.readFloatLE(transOff), transOff)
  }

  // Update qform pixdim if present
  const qformCode = data.readInt16LE(252)
  if (qformCode > 0) {
    newBuf.writeFloatLE(dx * 2, 80)
    newBuf.writeFloatLE(dy * 2, 84)
    newBuf.writeFloatLE(dz * 2, 88)
  }

  // Subsample image data (take every other voxel)
  for (let z = 0; z < nz2; z++) {
    for (let y = 0; y < ny2; y++) {
      for (let x = 0; x < nx2; x++) {
        const srcIdx = ((z * 2) * ny * nx + (y * 2) * nx + (x * 2)) * bytesPerVoxel
        const dstIdx = (z * ny2 * nx2 + y * nx2 + x) * bytesPerVoxel
        data.copy(newBuf, dataStart + dstIdx, dataStart + srcIdx, dataStart + srcIdx + bytesPerVoxel)
      }
    }
  }

  fs.writeFileSync(outputPath, zlib.gzipSync(newBuf))
}

describe('CLI allineate subcommand', () => {
  let tempDir: string
  let mni2mmPath: string
  let shifted2mmPath: string
  const mniPath = path.resolve(__dirname, '../../resources/images/standard/mni152.nii.gz')

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-allineate-test-'))

    // Create 2mm versions for fast testing
    mni2mmPath = path.join(tempDir, 'mni152_2mm.nii.gz')
    downsampleNifti(mniPath, mni2mmPath)

    // Create a shifted 2mm copy (translate by 10mm in X, 15mm in Y, -5mm in Z)
    shifted2mmPath = path.join(tempDir, 'mni152_2mm_shifted.nii.gz')
    createShiftedNifti(mni2mmPath, shifted2mmPath, [10, 15, -5])

    // Log the sform values
    const origSform = readSformFromFile(mni2mmPath)
    const shiftedSform = readSformFromFile(shifted2mmPath)
    console.log('Original 2mm sform translation:', origSform.srow_x[3], origSform.srow_y[3], origSform.srow_z[3])
    console.log('Shifted 2mm sform translation:', shiftedSform.srow_x[3], shiftedSform.srow_y[3], shiftedSform.srow_z[3])
  })

  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should register shifted image back to original and correct sform', async () => {
    const outputPath = path.join(tempDir, 'registered.nii.gz')

    const result = await runCLI([
      'allineate',
      '--input', shifted2mmPath,
      '--stationary', mni2mmPath,
      '--cost', 'ls',
      '--output', outputPath
    ])

    expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
    expect(fs.existsSync(outputPath)).toBe(true)

    // Verify output is valid gzipped NIfTI
    const fileBuffer = fs.readFileSync(outputPath)
    expect(fileBuffer.length).toBeGreaterThan(0)
    expect(fileBuffer[0]).toBe(0x1f) // gzip magic
    expect(fileBuffer[1]).toBe(0x8b)

    // The registered output sform should match the stationary (original MNI 2mm)
    const origSform = readSformFromFile(mni2mmPath)
    const regSform = readSformFromFile(outputPath)

    console.log('Registered sform translation:', regSform.srow_x[3], regSform.srow_y[3], regSform.srow_z[3])

    // Sform rotation/scale should match the stationary image
    const tolScale = 0.1
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(regSform.srow_x[i] - origSform.srow_x[i])).toBeLessThan(tolScale)
      expect(Math.abs(regSform.srow_y[i] - origSform.srow_y[i])).toBeLessThan(tolScale)
      expect(Math.abs(regSform.srow_z[i] - origSform.srow_z[i])).toBeLessThan(tolScale)
    }

    // Sform translation should be close to original (within 2mm)
    const tolTrans = 2.0
    expect(Math.abs(regSform.srow_x[3] - origSform.srow_x[3])).toBeLessThan(tolTrans)
    expect(Math.abs(regSform.srow_y[3] - origSform.srow_y[3])).toBeLessThan(tolTrans)
    expect(Math.abs(regSform.srow_z[3] - origSform.srow_z[3])).toBeLessThan(tolTrans)
  }, 180000)

  it('should fail when --stationary is missing', async () => {
    const result = await runCLI([
      'allineate',
      '--input', shifted2mmPath,
      '--output', path.join(tempDir, 'should-fail.nii.gz')
    ])

    expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
  }, 30000)

  it('should fail for non-existent input', async () => {
    const result = await runCLI([
      'allineate',
      '--input', '/nonexistent/path.nii.gz',
      '--stationary', mni2mmPath,
      '--output', path.join(tempDir, 'should-fail2.nii.gz')
    ])

    expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
  }, 30000)
})
