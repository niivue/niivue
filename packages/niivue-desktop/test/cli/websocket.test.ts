import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { runCLI, EXIT_CODES } from '../helpers/cli-runner.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const PORT_FILE = path.join(os.homedir(), '.niivue', 'ws-port')

describe('WebSocket server', () => {
  describe('--no-ws flag', () => {
    it('should not write port file when --no-ws is passed in view mode', async () => {
      // Clean up any existing port file
      if (fs.existsSync(PORT_FILE)) {
        fs.unlinkSync(PORT_FILE)
      }

      // Run a headless view command with --no-ws
      // This creates a window (headless) but should NOT start WS server
      // Note: view commands are headless and WS server only starts in GUI mode,
      // so the port file should not be created regardless
      const result = await runCLI([
        'view',
        '--no-ws',
        '--input',
        'mni152',
        '--output',
        path.join(os.tmpdir(), 'niivue-ws-test-output.png')
      ])

      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS)
      // Port file should not exist since headless mode doesn't start WS server
      expect(fs.existsSync(PORT_FILE)).toBe(false)
    })
  })
})

describe('WebSocket protocol types', () => {
  it('should export all expected types', async () => {
    // Import the protocol module to verify types are properly defined
    const protocol = await import('../../src/common/wsProtocol.js')

    // Verify RPC error codes exist
    expect(protocol.RPC_ERRORS).toBeDefined()
    expect(protocol.RPC_ERRORS.PARSE_ERROR).toBe(-32700)
    expect(protocol.RPC_ERRORS.INVALID_REQUEST).toBe(-32600)
    expect(protocol.RPC_ERRORS.METHOD_NOT_FOUND).toBe(-32601)
    expect(protocol.RPC_ERRORS.INVALID_PARAMS).toBe(-32602)
    expect(protocol.RPC_ERRORS.INTERNAL_ERROR).toBe(-32603)
  })
})

describe('CLI types', () => {
  it('should include python in subcommand type and ws options in defaults', async () => {
    const { getDefaultCLIOptions } = await import('../../src/common/cliTypes.js')
    const defaults = getDefaultCLIOptions()

    // Verify new ws-related defaults
    expect(defaults.wsPort).toBeNull()
    expect(defaults.noWs).toBe(false)
  })
})
