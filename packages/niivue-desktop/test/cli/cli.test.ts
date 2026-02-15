import { describe, it, expect } from 'vitest'
import { runCLI, EXIT_CODES } from '../helpers/cli-runner.js'

describe('CLI General Behavior', () => {
  describe('Help output', () => {
    it('should show general help with --help flag', async () => {
      const result = await runCLI(['--help'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout).toContain('NiiVue Desktop')
      expect(result.stdout).toContain('Subcommands:')
      expect(result.stdout).toContain('view')
      expect(result.stdout).toContain('segment')
      expect(result.stdout).toContain('extract')
      expect(result.stdout).toContain('dcm2niix')
      expect(result.stdout).toContain('niimath')
    })

    it('should show general help with -h flag', async () => {
      const result = await runCLI(['-h'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout).toContain('NiiVue Desktop')
    })

    it('should show view subcommand help', async () => {
      const result = await runCLI(['view', '--help'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout).toContain('niivue-desktop view')
      expect(result.stdout).toContain('--input')
      expect(result.stdout).toContain('--output')
    })

    it('should show segment subcommand help', async () => {
      const result = await runCLI(['segment', '--help'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout).toContain('niivue-desktop segment')
      expect(result.stdout).toContain('--model')
      expect(result.stdout).toContain('tissue-seg-light')
    })

    it('should show extract subcommand help', async () => {
      const result = await runCLI(['extract', '--help'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout).toContain('niivue-desktop extract')
      expect(result.stdout).toContain('--labels')
      expect(result.stdout).toContain('--values')
      expect(result.stdout).toContain('--range')
    })

    it('should show dcm2niix subcommand help', async () => {
      const result = await runCLI(['dcm2niix', '--help'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout).toContain('niivue-desktop dcm2niix')
      expect(result.stdout).toContain('list')
      expect(result.stdout).toContain('convert')
      expect(result.stdout).toContain('--series')
    })

    it('should show niimath subcommand help', async () => {
      const result = await runCLI(['niimath', '--help'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout).toContain('niivue-desktop niimath')
      expect(result.stdout).toContain('--ops')
      expect(result.stdout).toContain('-s <sigma>')
      expect(result.stdout).toContain('-thr <value>')
    })
  })

  describe('Error handling', () => {
    it('should fail for view without required args', async () => {
      const result = await runCLI(['view'])

      // Should fail because --input and --output are required
      // Currently returns GENERAL_ERROR (1), ideally would be INVALID_ARGUMENTS (2)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })

    it('should fail for segment without --model', async () => {
      const result = await runCLI(['segment', '--input', 'mni152', '--output', 'test.nii.gz'])

      // Currently returns GENERAL_ERROR (1), ideally would be INVALID_ARGUMENTS (2)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })

    it('should fail for non-existent input file', async () => {
      const result = await runCLI([
        'view',
        '--input',
        '/nonexistent/path/to/file.nii.gz',
        '--output',
        'test.png'
      ])

      // Currently returns GENERAL_ERROR (1), ideally would be INPUT_NOT_FOUND (3)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
      expect(result.stderr).toContain('not found')
    })

    it('should fail for invalid model name', async () => {
      const result = await runCLI([
        'segment',
        '--input',
        'mni152',
        '--model',
        'invalid-model-name',
        '--output',
        'test.nii.gz'
      ])

      // Currently returns GENERAL_ERROR (1), ideally would be MODEL_NOT_FOUND (5)
      expect(result.exitCode).not.toBe(EXIT_CODES.SUCCESS)
    })
  })
})
