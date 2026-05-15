import { spawn } from 'node:child_process'
import fs from 'node:fs'

/**
 * Spawn a binary with the given arguments and collect its output.
 * Shared by declarative tool executors, runAllineate, and runDcm2niix.
 */
export function spawnBinary(
  binPath: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(binPath)) {
      return reject(new Error(`Binary not found at ${binPath}`))
    }

    console.log(`[spawn] ${binPath} ${args.join(' ')}`)
    const proc = spawn(binPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    proc.on('error', (err) => reject(err))
    proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }))
  })
}
