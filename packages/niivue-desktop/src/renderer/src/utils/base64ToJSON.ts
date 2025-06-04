export function base64ToJson<T = unknown>(base64String: string): T | null {
  try {
    const decodedString = atob(base64String)
    const jsonObject = JSON.parse(decodedString)
    return jsonObject as T
  } catch (error) {
    console.error('Error converting Base64 to JSON:', error)
    return null
  }
}

export async function decompressGzipBase64ToJson<T>(base64: string): Promise<T> {
  const binaryData = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const stream = new Response(binaryData.buffer).body!.pipeThrough(new DecompressionStream('gzip'))

  const decompressed = await new Response(stream).arrayBuffer()
  const text = new TextDecoder().decode(decompressed)
  return JSON.parse(text) as T
}

export function isProbablyGzip(base64: string): boolean {
  const bytes = Uint8Array.from(atob(base64).slice(0, 3), (c) => c.charCodeAt(0))
  return bytes[0] === 0x1f && bytes[1] === 0x8b // gzip magic numbers
}

/**
 * Decode a base64‐encoded string into an ArrayBuffer
 * so you can pass raw bytes to Niivue (or any other binary API).
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Decode a base64‐encoded string of UTF-8 text (like your JSON)
 * into a normal JS string.
 */
export function base64ToString(base64: string): string {
  // First get the binary string…
  const binaryString = atob(base64)
  // …then decode from UTF-8 bytes into JS
  const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
