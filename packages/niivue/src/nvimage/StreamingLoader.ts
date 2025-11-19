/**
 * StreamingLoader module
 *
 * Handles streaming HTTP fetching and data loading:
 * - Streams and decompresses data from URLs
 * - Handles paired image formats (HEAD/BRIK, HDR/IMG)
 * - Manages chunked data assembly
 *
 * This module provides efficient streaming for large medical imaging files.
 */

import { uncompressStream } from '@/nvimage/utils'

/**
 * Fetch and stream data from a URL, decompressing if needed.
 * Assembles streamed chunks into a single ArrayBuffer.
 *
 * @param url - URL to fetch
 * @param headers - Optional HTTP headers
 * @returns Complete data as ArrayBuffer
 * @throws Error if response is not ok or stream is unavailable
 */
export async function fetchAndStreamData(url: string, headers: Record<string, string> = {}): Promise<ArrayBuffer> {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw Error(response.statusText)
  }
  if (!response.body) {
    throw new Error('No readable stream available')
  }

  const stream = await uncompressStream(response.body)
  const chunks: Uint8Array[] = []
  const reader = stream.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    chunks.push(value)
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const dataBuffer = new ArrayBuffer(totalLength)
  const dataView = new Uint8Array(dataBuffer)
  let offset = 0
  for (const chunk of chunks) {
    dataView.set(chunk, offset)
    offset += chunk.length
  }

  return dataBuffer
}

/**
 * Determine the paired image data URL for formats that use separate header/data files.
 * Returns null if the format doesn't use paired files.
 *
 * @param url - Primary file URL
 * @param ext - File extension (uppercase)
 * @param providedUrlImgData - User-provided paired data URL (optional)
 * @returns Paired data URL or null
 *
 * @example
 * ```typescript
 * // AFNI format: .HEAD file needs .BRIK file
 * getPairedImageUrl('data.HEAD', 'HEAD', '') // Returns 'data.BRIK'
 *
 * // Analyze format: .HDR file needs .IMG file
 * getPairedImageUrl('data.HDR', 'HDR', '') // Returns 'data.IMG'
 *
 * // User provided explicit paired file
 * getPairedImageUrl('data.HEAD', 'HEAD', 'custom.BRIK') // Returns 'custom.BRIK'
 * ```
 */
export function getPairedImageUrl(url: string, ext: string, providedUrlImgData: string): string | null {
  // If user provided a paired URL, use it
  if (providedUrlImgData !== '') {
    return providedUrlImgData
  }

  // AFNI format: .HEAD needs .BRIK
  if (ext.toUpperCase() === 'HEAD') {
    return url.substring(0, url.lastIndexOf('HEAD')) + 'BRIK'
  }

  // Analyze format: .HDR needs .IMG
  if (ext.toUpperCase() === 'HDR') {
    return url.substring(0, url.lastIndexOf('HDR')) + 'IMG'
  }

  return null
}

/**
 * Fetch paired image data for formats that use separate header/data files.
 * Automatically tries .gz compressed version if uncompressed file not found.
 *
 * @param urlImgData - URL of paired image data file
 * @param headers - Optional HTTP headers
 * @returns Paired image data as ArrayBuffer, or null if not found
 */
export async function fetchPairedImageData(
  urlImgData: string,
  headers: Record<string, string> = {}
): Promise<ArrayBuffer | null> {
  try {
    let response = await fetch(urlImgData, { headers })

    // If 404 and it's a BRIK or IMG file, try compressed version
    if (response.status === 404 && (urlImgData.includes('BRIK') || urlImgData.includes('IMG'))) {
      response = await fetch(`${urlImgData}.gz`, { headers })
    }

    if (!response.ok || !response.body) {
      return null
    }

    const stream = await uncompressStream(response.body)
    const chunks: Uint8Array[] = []
    const reader = stream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(value)
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const pairedImgData = new ArrayBuffer(totalLength)
    const dataView = new Uint8Array(pairedImgData)
    let offset = 0
    for (const chunk of chunks) {
      dataView.set(chunk, offset)
      offset += chunk.length
    }

    return pairedImgData
  } catch (error) {
    console.error('Error loading paired image data:', error)
    return null
  }
}
