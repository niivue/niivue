/**
 * Read data from stdin with timeout
 * Expects base64-encoded data for binary files
 */
export async function readStdin(timeout = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if stdin is a TTY (interactive terminal)
    if (process.stdin.isTTY) {
      reject(new Error('No data piped to stdin. Use --input with a file path or URL, or pipe data.'))
      return
    }

    const chunks: Buffer[] = []
    let timer: NodeJS.Timeout | null = null

    const cleanup = (): void => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      process.stdin.removeAllListeners('data')
      process.stdin.removeAllListeners('end')
      process.stdin.removeAllListeners('error')
    }

    timer = setTimeout(() => {
      cleanup()
      reject(new Error(`stdin timeout after ${timeout}ms`))
    }, timeout)

    process.stdin.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    process.stdin.on('end', () => {
      cleanup()
      const data = Buffer.concat(chunks).toString('utf-8').trim()
      if (!data) {
        reject(new Error('Empty data received from stdin'))
        return
      }
      resolve(data)
    })

    process.stdin.on('error', (err) => {
      cleanup()
      reject(err)
    })

    // Resume stdin in case it was paused
    process.stdin.resume()
  })
}

/**
 * Read binary data from stdin (for raw NIfTI files)
 * Returns Buffer directly without base64 encoding
 */
export async function readStdinBinary(timeout = 120000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      reject(new Error('No data piped to stdin.'))
      return
    }

    const chunks: Buffer[] = []
    let timer: NodeJS.Timeout | null = null

    const cleanup = (): void => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      process.stdin.removeAllListeners('data')
      process.stdin.removeAllListeners('end')
      process.stdin.removeAllListeners('error')
    }

    timer = setTimeout(() => {
      cleanup()
      reject(new Error(`stdin timeout after ${timeout}ms`))
    }, timeout)

    process.stdin.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    process.stdin.on('end', () => {
      cleanup()
      const data = Buffer.concat(chunks)
      if (data.length === 0) {
        reject(new Error('Empty data received from stdin'))
        return
      }
      resolve(data)
    })

    process.stdin.on('error', (err) => {
      cleanup()
      reject(err)
    })

    process.stdin.resume()
  })
}
