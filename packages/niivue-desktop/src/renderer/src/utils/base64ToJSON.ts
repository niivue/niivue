export function base64ToJson(base64String) {
  try {
    const decodedString = atob(base64String);
    const jsonObject = JSON.parse(decodedString);
    return jsonObject;
  } catch (error) {
    console.error("Error converting Base64 to JSON:", error);
    return null;
  }
}

export async function decompressGzipBase64ToJson(base64: string): Promise<any> {
  const binaryData = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const stream = new Response(binaryData.buffer)
    .body!
    .pipeThrough(new DecompressionStream('gzip'))

  const decompressed = await new Response(stream).arrayBuffer()
  const text = new TextDecoder().decode(decompressed)
  return JSON.parse(text)
}

export function isProbablyGzip(base64: string): boolean {
  const bytes = Uint8Array.from(atob(base64).slice(0, 3), c => c.charCodeAt(0))
  return bytes[0] === 0x1f && bytes[1] === 0x8b // gzip magic numbers
}
