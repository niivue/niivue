// Filesystem surface the import post-pass needs. Ported from bidsui's
// src/lib/import/postpass/fs.ts. Production implementation is `nodeFs.ts`
// (node:fs/promises for raw reads + node:zlib for gunzip). Tests can
// inject an in-memory adapter.

export interface PostPassDirEntry {
  name: string
  isFile: boolean
  isDirectory: boolean
}

export interface PostPassFs {
  /** Does anything (file or directory) exist at this path? */
  exists(path: string): Promise<boolean>
  /** Non-recursive directory listing. */
  readDir(path: string): Promise<PostPassDirEntry[]>
  /** Read a UTF-8 text file in full. Used for JSON sidecars. */
  readTextFile(path: string): Promise<string>
  /**
   * Read the first `size` bytes of an uncompressed file. Caller may
   * receive fewer than `size` bytes if the file is shorter.
   */
  readPartialBytes(path: string, size: number): Promise<Uint8Array>
  /**
   * Read and gunzip enough of a gzip-compressed file to yield `size`
   * decompressed bytes. The implementation should stop reading once
   * the decompressed-byte budget is met, so a multi-GB `.nii.gz` only
   * consumes a few KB of compressed bytes when the caller asks for 348
   * header bytes.
   */
  readPartialGzipBytes(path: string, size: number): Promise<Uint8Array>
}
