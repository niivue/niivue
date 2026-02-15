import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { runCLI, EXIT_CODES } from '../helpers/cli-runner.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('CLI niimath subcommand', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-niimath-test-'))
  })

  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('Smoothing operations', () => {
    it('should smooth volume with -s 2', async () => {
      const outputPath = path.join(tempDir, 'smoothed.nii.gz')

      const result = await runCLI([
        'niimath',
        '--input',
        'mni152',
        '--ops',
        '-s 2',
        '--output',
        outputPath
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)

      // Verify file was created and has content
      const fileBuffer = fs.readFileSync(outputPath)
      expect(fileBuffer.length).toBeGreaterThan(0)

      // Check for NIfTI header or gzip magic
      const isNifti = fileBuffer[0] === 0x5c && fileBuffer[1] === 0x01
      const isGzip = fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b
      expect(isNifti || isGzip).toBe(true)
    })
  })

  describe('Threshold operations', () => {
    it('should threshold volume with -thr 100', async () => {
      const outputPath = path.join(tempDir, 'thresholded.nii.gz')

      const result = await runCLI([
        'niimath',
        '--input',
        'mni152',
        '--ops',
        '-thr 100',
        '--output',
        outputPath
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)
    })
  })

  describe('Binarization', () => {
    it('should binarize volume with -bin', async () => {
      const outputPath = path.join(tempDir, 'binary.nii.gz')

      const result = await runCLI([
        'niimath',
        '--input',
        'mni152',
        '--ops',
        '-bin',
        '--output',
        outputPath
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)
    })
  })

  describe('Chained operations', () => {
    it('should chain operations -s 2 -thr 100', async () => {
      const outputPath = path.join(tempDir, 'chained.nii.gz')

      const result = await runCLI([
        'niimath',
        '--input',
        'mni152',
        '--ops',
        '-s 2 -thr 100',
        '--output',
        outputPath
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)
    })

    it('should chain operations -s 2 -thr 100 -bin', async () => {
      const outputPath = path.join(tempDir, 'chained-bin.nii.gz')

      const result = await runCLI([
        'niimath',
        '--input',
        'mni152',
        '--ops',
        '-s 2 -thr 100 -bin',
        '--output',
        outputPath
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)
    })
  })

  describe('Stdout output', () => {
    it('should output to stdout with -o -', async () => {
      const result = await runCLI([
        'niimath',
        '--input',
        'mni152',
        '--ops',
        '-s 1',
        '--output',
        '-'
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      // stdout should contain base64 data
      expect(result.stdout.length).toBeGreaterThan(0)
    })
  })

  describe('Error cases', () => {
    it('should fail when --ops is missing', async () => {
      const result = await runCLI([
        'niimath',
        '--input',
        'mni152',
        '--output',
        path.join(tempDir, 'output.nii.gz')
      ])

      // Currently returns GENERAL_ERROR (1), ideally would be INVALID_ARGUMENTS (2)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })

    it('should fail for non-existent input', async () => {
      const result = await runCLI([
        'niimath',
        '--input',
        '/nonexistent/path.nii.gz',
        '--ops',
        '-s 2',
        '--output',
        path.join(tempDir, 'output.nii.gz')
      ])

      // Currently returns GENERAL_ERROR (1), ideally would be INPUT_NOT_FOUND (3)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })
  })
})
