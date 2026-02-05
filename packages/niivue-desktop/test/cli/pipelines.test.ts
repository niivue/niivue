import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { runCLI, EXIT_CODES } from '../helpers/cli-runner.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('CLI Pipeline Tests (stdin/stdout)', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-pipeline-test-'))
  })

  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('view to niimath pipeline', () => {
    it('should pipe view output to niimath input', async () => {
      // Step 1: Get base64 volume from view command
      const viewResult = await runCLI(['view', '--input', 'mni152', '--output', '-'])

      expect(viewResult.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(viewResult.stdout.length).toBeGreaterThan(0)

      // Step 2: Pipe base64 data to niimath
      const outputPath = path.join(tempDir, 'piped-smoothed.nii.gz')
      const niimathResult = await runCLI(
        ['niimath', '--input', '-', '--ops', '-s 2', '--output', outputPath],
        { stdin: viewResult.stdout }
      )

      expect(niimathResult.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)

      // Verify output is a valid NIfTI file (gzipped or uncompressed)
      const fileBuffer = fs.readFileSync(outputPath)
      const isGzip = fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b
      const isNifti = fileBuffer[0] === 0x5c && fileBuffer[1] === 0x01 // NIfTI-1 header size (348)
      expect(isGzip || isNifti).toBe(true)
    })
  })

  describe('view to extract pipeline', () => {
    it('should pipe view output as labels to extract', async () => {
      // Step 1: Create a binary mask using niimath
      const maskPath = path.join(tempDir, 'mask.nii.gz')
      const maskResult = await runCLI([
        'niimath',
        '--input',
        'mni152',
        '--ops',
        '-thr 50 -bin',
        '--output',
        maskPath
      ])

      expect(maskResult.exitCode).toBe(EXIT_CODES.SUCCESS)

      // Step 2: Get base64 mask from view
      const viewResult = await runCLI(['view', '--input', maskPath, '--output', '-'])

      expect(viewResult.exitCode).toBe(EXIT_CODES.SUCCESS)

      // Step 3: Pipe mask as labels to extract
      const outputPath = path.join(tempDir, 'piped-extracted.nii.gz')
      const extractResult = await runCLI(
        [
          'extract',
          '--input',
          'mni152',
          '--labels',
          '-',
          '--values',
          '1',
          '--output',
          outputPath
        ],
        { stdin: viewResult.stdout }
      )

      expect(extractResult.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)
    })
  })

  describe('Multi-stage niimath pipeline', () => {
    it('should chain niimath through stdout/stdin', async () => {
      // Step 1: First niimath operation (smooth)
      const stage1Result = await runCLI([
        'niimath',
        '--input',
        'mni152',
        '--ops',
        '-s 1',
        '--output',
        '-'
      ])

      expect(stage1Result.exitCode).toBe(EXIT_CODES.SUCCESS)

      // Step 2: Second niimath operation (threshold)
      const stage2Result = await runCLI(
        ['niimath', '--input', '-', '--ops', '-thr 50', '--output', '-'],
        { stdin: stage1Result.stdout }
      )

      expect(stage2Result.exitCode).toBe(EXIT_CODES.SUCCESS)

      // Step 3: Third niimath operation (binarize) to file
      const outputPath = path.join(tempDir, 'multi-stage.nii.gz')
      const stage3Result = await runCLI(
        ['niimath', '--input', '-', '--ops', '-bin', '--output', outputPath],
        { stdin: stage2Result.stdout }
      )

      expect(stage3Result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)
    })
  })
})
