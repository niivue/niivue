/**
 * Write base64-encoded data to stdout with proper backpressure handling
 * For large data, we need to wait for drain events to avoid truncation
 */
export async function writeBase64ToStdout(base64Data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Write synchronously using fs to ensure all data is written
    // process.stdout.write can return false for large data and cause truncation
    const ok = process.stdout.write(base64Data, (err) => {
      if (err) reject(err)
      else resolve()
    })
    // If write returns false, we need to wait for drain
    if (!ok) {
      process.stdout.once('drain', resolve)
    }
  })
}

/**
 * Write JSON data to stdout (formatted)
 */
export function writeJsonToStdout(data: unknown, pretty = true): void {
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  process.stdout.write(json)
}

/**
 * Write binary data to stdout
 */
export function writeBinaryToStdout(buffer: Buffer): void {
  process.stdout.write(buffer)
}

/**
 * Write progress message to stderr (keeps stdout clean for data)
 */
export function writeProgress(message: string): void {
  process.stderr.write(`[niivue] ${message}\n`)
}

/**
 * Write error message to stderr
 */
export function writeError(message: string): void {
  process.stderr.write(`[niivue] ERROR: ${message}\n`)
}
