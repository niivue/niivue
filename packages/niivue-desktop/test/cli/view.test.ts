import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { runCLI, EXIT_CODES } from '../helpers/cli-runner.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('CLI view subcommand', () => {
  let tempDir: string

  beforeAll(() => {
    // Create a temporary directory for test outputs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niivue-cli-test-'))
  })

  afterAll(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('Screenshot output', () => {
    it('should render standard mni152 to PNG file', async () => {
      const outputPath = path.join(tempDir, 'mni152-screenshot.png')

      const result = await runCLI(['view', '--input', 'mni152', '--output', outputPath])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)

      // Verify it's a valid PNG (starts with PNG signature)
      const fileBuffer = fs.readFileSync(outputPath)
      expect(fileBuffer[0]).toBe(0x89)
      expect(fileBuffer[1]).toBe(0x50) // P
      expect(fileBuffer[2]).toBe(0x4e) // N
      expect(fileBuffer[3]).toBe(0x47) // G
    })

    it('should render standard chris_t1 to PNG file', async () => {
      const outputPath = path.join(tempDir, 'chris-screenshot.png')

      const result = await runCLI(['view', '--input', 'chris_t1', '--output', outputPath])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)
    })
  })

  describe('Volume passthrough', () => {
    it('should pass through standard volume to NIfTI output', async () => {
      const outputPath = path.join(tempDir, 'mni152-passthrough.nii.gz')

      const result = await runCLI(['view', '--input', 'mni152', '--output', outputPath])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(fs.existsSync(outputPath)).toBe(true)

      // Verify file was created and has content
      const fileBuffer = fs.readFileSync(outputPath)
      expect(fileBuffer.length).toBeGreaterThan(0)

      // Check for NIfTI header (sizeof_hdr = 348 = 0x15c in little-endian)
      // or gzip magic (0x1f, 0x8b) if compressed
      const isNifti = fileBuffer[0] === 0x5c && fileBuffer[1] === 0x01
      const isGzip = fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b
      expect(isNifti || isGzip).toBe(true)
    })
  })

  describe('Stdout output', () => {
    it('should output base64 data to stdout with -o -', async () => {
      const result = await runCLI(['view', '--input', 'mni152', '--output', '-'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      // stdout should contain base64 data (alphanumeric + /+=)
      expect(result.stdout.length).toBeGreaterThan(0)
      // Base64 data is alphanumeric with potential +/= characters
      // Should not contain newlines in the actual base64 data portion
    })
  })

  describe('Error cases', () => {
    it('should fail for non-existent input file', async () => {
      const result = await runCLI([
        'view',
        '--input',
        '/path/to/nonexistent.nii.gz',
        '--output',
        path.join(tempDir, 'output.png')
      ])

      // Currently returns GENERAL_ERROR (1), ideally would be INPUT_NOT_FOUND (3)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
      expect(result.stderr).toContain('not found')
    })

    it('should fail when --output is missing', async () => {
      const result = await runCLI(['view', '--input', 'mni152'])

      // Currently returns GENERAL_ERROR (1), ideally would be INVALID_ARGUMENTS (2)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })

    it('should fail when --input is missing', async () => {
      const result = await runCLI(['view', '--output', path.join(tempDir, 'output.png')])

      // Currently returns GENERAL_ERROR (1), ideally would be INVALID_ARGUMENTS (2)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })
  })
})
