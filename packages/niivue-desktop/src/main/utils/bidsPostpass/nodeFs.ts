// Node fs/promises + zlib implementation of PostPassFs. Used by the
// Electron main process for the BIDS import post-pass and by unit tests
// that drive the orchestrator against a real on-disk tree.

import { createReadStream } from 'node:fs'
import { access, opendir, readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { createGunzip } from 'node:zlib'
import type { PostPassDirEntry, PostPassFs } from './fs.js'

export const nodePostPassFs: PostPassFs = {
  async exists(path: string): Promise<boolean> {
    try {
      await access(path)
      return true
    } catch {
      return false
    }
  },

  async readDir(path: string): Promise<PostPassDirEntry[]> {
    const out: PostPassDirEntry[] = []
    const dir = await opendir(path)
    for await (const ent of dir) {
      out.push({
        name: ent.name,
        isFile: ent.isFile(),
        isDirectory: ent.isDirectory()
      })
    }
    return out
  },

  async readTextFile(path: string): Promise<string> {
    return readFile(path, 'utf-8')
  },

  async readPartialBytes(path: string, size: number): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      const stream = createReadStream(path, { start: 0, end: size - 1 })
      const chunks: Buffer[] = []
      let total = 0
      stream.on('data', (chunk) => {
        const buf = chunk instanceof Buffer ? chunk : Buffer.from(chunk)
        chunks.push(buf)
        total += buf.byteLength
        if (total >= size) stream.destroy()
      })
      stream.on('end', () => resolve(joinAndSlice(chunks, size)))
      stream.on('close', () => resolve(joinAndSlice(chunks, size)))
      stream.on('error', reject)
    })
  },

  async readPartialGzipBytes(path: string, size: number): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      const fileStream: Readable = createReadStream(path)
      const gunzip = createGunzip()
      const chunks: Buffer[] = []
      let total = 0
      let settled = false

      const cleanup = (): void => {
        if (settled) return
        settled = true
        try {
          fileStream.unpipe(gunzip)
        } catch {
          // ignore
        }
        try {
          fileStream.destroy()
        } catch {
          // ignore
        }
        try {
          gunzip.destroy()
        } catch {
          // ignore
        }
      }

      gunzip.on('data', (chunk) => {
        if (settled) return
        const buf = chunk instanceof Buffer ? chunk : Buffer.from(chunk)
        chunks.push(buf)
        total += buf.byteLength
        if (total >= size) {
          const out = joinAndSlice(chunks, size)
          cleanup()
          resolve(out)
        }
      })
      gunzip.on('end', () => {
        if (settled) return
        settled = true
        resolve(joinAndSlice(chunks, size))
      })
      gunzip.on('error', (err) => {
        if (settled) return
        if (total === 0) {
          settled = true
          cleanup()
          reject(err)
          return
        }
        settled = true
        cleanup()
        resolve(joinAndSlice(chunks, size))
      })
      fileStream.on('error', (err) => {
        if (settled) return
        if (total === 0) {
          settled = true
          cleanup()
          reject(err)
          return
        }
        settled = true
        cleanup()
        resolve(joinAndSlice(chunks, size))
      })

      fileStream.pipe(gunzip)
    })
  }
}

function joinAndSlice(chunks: ReadonlyArray<Buffer>, size: number): Uint8Array {
  const out = new Uint8Array(
    Math.min(
      chunks.reduce((n, c) => n + c.byteLength, 0),
      size
    )
  )
  let offset = 0
  for (const c of chunks) {
    if (offset >= size) break
    const room = size - offset
    const slice = c.byteLength <= room ? c : c.subarray(0, room)
    out.set(slice, offset)
    offset += slice.byteLength
  }
  return out
}
