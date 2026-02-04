/**
 * Write base64-encoded data to stdout
 */
export function writeBase64ToStdout(base64Data: string): void {
  process.stdout.write(base64Data)
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
