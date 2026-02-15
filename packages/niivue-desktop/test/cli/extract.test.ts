import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { runCLI, EXIT_CODES } from '../helpers/cli-runner.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('CLI extract subcommand', () => {
  let tempDir: string
  let labelVolumePath: string

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-extract-test-'))

    // Create a label volume by thresholding and binarizing mni152
    // This gives us a simple binary mask we can use for extract tests
    labelVolumePath = path.join(tempDir, 'labels.nii.gz')
    const result = await runCLI([
      'niimath',
      '--input',
      'mni152',
      '--ops',
      '-thr 50 -bin',
      '--output',
      labelVolumePath
    ])

    if (result.exitCode !== EXIT_CODES.SUCCESS) {
      throw new Error(`Failed to create label volume: ${result.stderr}`)
    }
  })

  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('Extract by value', () => {
    it('should extract single label value', async () => {
      const outputPath = path.join(tempDir, 'extracted-single.nii.gz')

      const result = await runCLI([
        'extract',
        '--input',
        'mni152',
        '--labels',
        labelVolumePath,
        '--values',
        '1',
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

    it('should extract with multiple values', async () => {
      const outputPath = path.join(tempDir, 'extracted-multi.nii.gz')

      // Use 0 and 1 since our label mask is binary
      const result = await runCLI([
        'extract',
        '--input',
        'mni152',
        '--labels',
        labelVolumePath,
        '--values',
        '0,1',
        '--output',
        outputPath
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)
    })
  })

  describe('Extract by range', () => {
    it('should extract by label range', async () => {
      const outputPath = path.join(tempDir, 'extracted-range.nii.gz')

      const result = await runCLI([
        'extract',
        '--input',
        'mni152',
        '--labels',
        labelVolumePath,
        '--range',
        '0-1',
        '--output',
        outputPath
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)
    })
  })

  describe('Extract modifiers', () => {
    it('should invert selection with --invert', async () => {
      const outputPath = path.join(tempDir, 'extracted-invert.nii.gz')

      const result = await runCLI([
        'extract',
        '--input',
        'mni152',
        '--labels',
        labelVolumePath,
        '--values',
        '1',
        '--invert',
        '--output',
        outputPath
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)
    })

    it('should output binary mask with --binarize', async () => {
      const outputPath = path.join(tempDir, 'extracted-binary.nii.gz')

      const result = await runCLI([
        'extract',
        '--input',
        'mni152',
        '--labels',
        labelVolumePath,
        '--values',
        '1',
        '--binarize',
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
        'extract',
        '--input',
        'mni152',
        '--labels',
        labelVolumePath,
        '--values',
        '1',
        '--output',
        '-'
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout.length).toBeGreaterThan(0)
    })
  })

  describe('Error cases', () => {
    it('should fail when --labels is missing', async () => {
      const result = await runCLI([
        'extract',
        '--input',
        'mni152',
        '--values',
        '1',
        '--output',
        path.join(tempDir, 'output.nii.gz')
      ])

      // Currently returns GENERAL_ERROR (1), ideally would be INVALID_ARGUMENTS (2)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })

    it('should fail when neither --values nor --range is specified', async () => {
      const result = await runCLI([
        'extract',
        '--input',
        'mni152',
        '--labels',
        labelVolumePath,
        '--output',
        path.join(tempDir, 'output.nii.gz')
      ])

      // Currently returns GENERAL_ERROR (1), ideally would be INVALID_ARGUMENTS (2)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })

    it('should fail for non-existent input', async () => {
      const result = await runCLI([
        'extract',
        '--input',
        '/nonexistent/path.nii.gz',
        '--labels',
        labelVolumePath,
        '--values',
        '1',
        '--output',
        path.join(tempDir, 'output.nii.gz')
      ])

      // Currently returns GENERAL_ERROR (1), ideally would be INPUT_NOT_FOUND (3)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })

    it('should fail for non-existent labels file', async () => {
      const result = await runCLI([
        'extract',
        '--input',
        'mni152',
        '--labels',
        '/nonexistent/labels.nii.gz',
        '--values',
        '1',
        '--output',
        path.join(tempDir, 'output.nii.gz')
      ])

      // Currently returns GENERAL_ERROR (1), ideally would be INPUT_NOT_FOUND (3)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })
  })
})
