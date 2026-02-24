import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { runCLI, EXIT_CODES } from '../helpers/cli-runner.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

// ML inference tests need longer timeouts when running alongside other test suites
const SEGMENT_TIMEOUT = 180000

describe('CLI segment subcommand', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-segment-test-'))
  })

  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('Basic segmentation', () => {
    it('should run tissue-seg-light model on mni152', { timeout: SEGMENT_TIMEOUT }, async () => {
      const outputPath = path.join(tempDir, 'tissue-seg-light.nii.gz')

      const result = await runCLI([
        'segment',
        '--input',
        'mni152',
        '--model',
        'tissue-seg-light',
        '--output',
        outputPath
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)

      // Verify output is a valid gzipped NIfTI file
      const fileBuffer = fs.readFileSync(outputPath)
      expect(fileBuffer.length).toBeGreaterThan(1024)
      const isGzip = fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b
      expect(isGzip).toBe(true)
    })

    it('should run brain-extract-full model on mni152', { timeout: SEGMENT_TIMEOUT }, async () => {
      const outputPath = path.join(tempDir, 'brain-extract.nii.gz')

      const result = await runCLI([
        'segment',
        '--input',
        'mni152',
        '--model',
        'brain-extract-full',
        '--output',
        outputPath
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)

      const fileBuffer = fs.readFileSync(outputPath)
      expect(fileBuffer.length).toBeGreaterThan(1024)
    })
  })

  describe('Stdout output', () => {
    it('should output segmentation to stdout with -o -', { timeout: SEGMENT_TIMEOUT }, async () => {
      const result = await runCLI([
        'segment',
        '--input',
        'mni152',
        '--model',
        'tissue-seg-light',
        '--output',
        '-'
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout.length).toBeGreaterThan(0)
    })
  })

  describe('Segment to extract pipeline', () => {
    it('should segment then extract a label from the result', { timeout: SEGMENT_TIMEOUT }, async () => {
      // Step 1: Segment the volume
      const segPath = path.join(tempDir, 'pipeline-seg.nii.gz')
      const segResult = await runCLI([
        'segment',
        '--input',
        'mni152',
        '--model',
        'tissue-seg-light',
        '--output',
        segPath
      ])

      expect(segResult.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(segPath)).toBe(true)

      // Step 2: Extract label 1 from the segmentation
      // Use segmentation output as both input and labels since they share dimensions
      // (segment conforms to 256³ which differs from the original mni152 dimensions)
      const extractPath = path.join(tempDir, 'pipeline-extract.nii.gz')
      const extractResult = await runCLI([
        'extract',
        '--input',
        segPath,
        '--labels',
        segPath,
        '--values',
        '1',
        '--output',
        extractPath
      ])

      expect(extractResult.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(extractPath)).toBe(true)
    })
  })

  describe('Error cases', () => {
    it('should fail when --model is missing', async () => {
      const result = await runCLI([
        'segment',
        '--input',
        'mni152',
        '--output',
        path.join(tempDir, 'output.nii.gz')
      ])

      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })

    it('should fail when --input is missing', async () => {
      const result = await runCLI([
        'segment',
        '--model',
        'tissue-seg-light',
        '--output',
        path.join(tempDir, 'output.nii.gz')
      ])

      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })

    it('should fail for invalid model name', async () => {
      const result = await runCLI([
        'segment',
        '--input',
        'mni152',
        '--model',
        'nonexistent-model',
        '--output',
        path.join(tempDir, 'output.nii.gz')
      ])

      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })

    it('should fail for non-existent input file', async () => {
      const result = await runCLI([
        'segment',
        '--input',
        '/nonexistent/path/to/file.nii.gz',
        '--model',
        'tissue-seg-light',
        '--output',
        path.join(tempDir, 'output.nii.gz')
      ])

      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })
  })
})
