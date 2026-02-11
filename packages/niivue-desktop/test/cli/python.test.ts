import { describe, it, expect } from 'vitest'
import { runCLI, EXIT_CODES } from '../helpers/cli-runner.js'

describe('CLI python subcommand', () => {
  describe('Help output', () => {
    it('should show python subcommand help', async () => {
      const result = await runCLI(['python', '--help'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout).toContain('niivue-desktop python')
      expect(result.stdout).toContain('pyniivue')
      expect(result.stdout).toContain('script.py')
    })

    it('should include python in general help', async () => {
      const result = await runCLI(['--help'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout).toContain('python')
      expect(result.stdout).toContain('Run Python scripts')
    })

    it('should include --ws-port in general help', async () => {
      const result = await runCLI(['--help'])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      expect(result.stdout).toContain('--ws-port')
      expect(result.stdout).toContain('--no-ws')
    })
  })
})
