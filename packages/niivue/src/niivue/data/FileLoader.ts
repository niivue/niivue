/**
 * File loading and format detection utilities for Niivue.
 * This module provides pure functions for file extension handling,
 * format detection, custom loaders, and media URL management.
 */

import type { NVImage } from '@/nvimage'
import type { NVMesh } from '@/nvmesh'
import { log } from '@/logger'

/**
 * DICOM loader input types
 */
export type DicomLoaderInput = ArrayBuffer | ArrayBuffer[] | File[]

/**
 * DICOM loader configuration
 */
export type DicomLoader = {
  loader: (data: DicomLoaderInput) => Promise<Array<{ name: string; data: ArrayBuffer }>>
  toExt: string
}

/**
 * Mesh data returned by custom mesh loaders
 */
export interface MeshLoaderResult {
  positions: Float32Array
  indices: Uint32Array
  colors?: Float32Array | null
}

/**
 * Custom file loader configuration.
 * The loader function can return either:
 * - ArrayBuffer for volume data
 * - MeshLoaderResult for mesh data with positions and indices
 */
export interface CustomLoader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: (data: string | Uint8Array | ArrayBuffer) => Promise<any>
  toExt: string
}

/**
 * Collection of registered custom loaders by file extension
 */
export interface LoaderRegistry {
  [extension: string]: CustomLoader
}

/**
 * Mesh file extensions supported by Niivue
 */
export const MESH_EXTENSIONS = [
  'ASC',
  'BYU',
  'DFS',
  'FSM',
  'PIAL',
  'ORIG',
  'INFLATED',
  'SMOOTHWM',
  'SPHERE',
  'WHITE',
  'G',
  'GEO',
  'GII',
  'ICO',
  'MZ3',
  'NV',
  'OBJ',
  'OFF',
  'PLY',
  'SRF',
  'STL',
  'TCK',
  'TRACT',
  'TRI',
  'TRK',
  'TT',
  'TRX',
  'VTK',
  'WRL',
  'X3D',
  'JCON',
  'JSON'
]

/**
 * Options for getFileExt function
 */
export interface GetFileExtOptions {
  fullname: string
  upperCase?: boolean
}

/**
 * Extracts and normalizes the file extension, handling special cases like .gz and .cbor.
 * @param options - Options containing fullname and optional upperCase flag
 * @returns The normalized file extension
 */
export function getFileExt(options: GetFileExtOptions): string
/**
 * Extracts and normalizes the file extension, handling special cases like .gz and .cbor.
 * @param fullname - The full filename or path
 * @param upperCase - Whether to return uppercase extension (default: true)
 * @returns The normalized file extension
 */
export function getFileExt(fullname: string, upperCase?: boolean): string
export function getFileExt(fullnameOrOptions: string | GetFileExtOptions, upperCase = true): string {
  let fullname: string
  if (typeof fullnameOrOptions === 'object') {
    fullname = fullnameOrOptions.fullname
    upperCase = fullnameOrOptions.upperCase ?? true
  } else {
    fullname = fullnameOrOptions
  }

  log.debug('fullname: ', fullname)
  const re = /(?:\.([^.]+))?$/
  let ext = re.exec(fullname)![1]
  ext = ext.toUpperCase()

  if (ext === 'GZ') {
    // Handle gzipped files: img.trk.gz -> trk
    ext = re.exec(fullname.slice(0, -3))![1]
    ext = ext.toUpperCase()
  } else if (ext === 'CBOR') {
    // Handle cbor files: img.iwi.cbor -> IWI.CBOR
    const endExt = ext
    ext = re.exec(fullname.slice(0, -5))![1]
    ext = ext.toUpperCase()
    ext = `${ext}.${endExt}`
  }

  return upperCase ? ext : ext.toLowerCase()
}

/**
 * Check if a URL/filename has a mesh file extension
 * @param url - The URL or filename to check
 * @returns True if the extension indicates a mesh file
 */
export function isMeshExt(url: string): boolean {
  const ext = getFileExt(url)
  log.debug('checking mesh ext:', ext)
  return MESH_EXTENSIONS.includes(ext)
}

/**
 * Get media (volume or mesh) by URL from a media URL map
 * @param url - URL to search for
 * @param mediaUrlMap - Map of media objects to URLs
 * @returns The media object if found, undefined otherwise
 */
export function getMediaByUrl(url: string, mediaUrlMap: Map<NVImage | NVMesh, string>): NVImage | NVMesh | undefined {
  return [...mediaUrlMap.entries()]
    .filter((v) => v[1] === url)
    .map((v) => v[0])
    .pop()
}

/**
 * Parameters for registerLoader
 */
export interface RegisterLoaderParams {
  loaders: LoaderRegistry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: (data: string | Uint8Array | ArrayBuffer) => Promise<any>
  fileExt: string
  toExt: string
}

/**
 * Register a custom loader for a specific file extension
 * @param params - Parameters object
 * @returns New loader registry with the added loader
 */
export function registerLoader(params: RegisterLoaderParams): LoaderRegistry {
  const { loaders, loader, fileExt, toExt } = params
  return {
    ...loaders,
    [fileExt.toUpperCase()]: {
      loader,
      toExt
    }
  }
}

/**
 * Get a loader for a specific file extension
 * @param loaders - Loader registry
 * @param ext - File extension to look up
 * @returns The loader configuration if found, undefined otherwise
 */
export function getLoader(loaders: LoaderRegistry, ext: string): CustomLoader | undefined {
  return loaders[ext.toUpperCase()]
}

/**
 * Check if a DICOM loader error should be thrown
 * @param ext - File extension
 * @returns True if extension is DCM
 */
export function isDicomExtension(ext: string): boolean {
  return ext.toUpperCase() === 'DCM'
}

/**
 * Recursively traverse a file tree and collect all files
 * @param item - FileSystemEntry to traverse
 * @param path - Current path prefix
 * @param fileArray - Array to accumulate files
 * @returns Promise resolving to array of files with fullPath and _webkitRelativePath properties
 */
export async function traverseFileTree(item: FileSystemEntry, path = '', fileArray: File[]): Promise<File[]> {
  return new Promise((resolve) => {
    if (item.isFile) {
      ;(item as FileSystemFileEntry).file((file: File & { fullPath?: string; _webkitRelativePath?: string }) => {
        file.fullPath = path + file.name
        // IMPORTANT: _webkitRelativePath is required for dcm2niix to work.
        // We need to add this property so we can parse multiple directories correctly.
        // the "webkitRelativePath" property on File objects is read-only, so we can't set it directly.
        file._webkitRelativePath = path + file.name
        fileArray.push(file)
        resolve(fileArray)
      })
    } else if (item.isDirectory) {
      const dirReader = (item as FileSystemDirectoryEntry).createReader()
      const readAllEntries = (): void => {
        dirReader.readEntries((entries) => {
          if (entries.length > 0) {
            const promises = entries.map((entry) => traverseFileTree(entry, path + item.name + '/', fileArray))
            Promise.all(promises)
              .then(readAllEntries)
              .catch((e) => {
                throw e
              })
          } else {
            resolve(fileArray)
          }
        })
      }
      readAllEntries()
    }
  })
}

/**
 * Read all entries from a directory
 * @param directory - FileSystemDirectoryEntry to read
 * @returns Array of file system entries (accumulated asynchronously)
 */
export function readDirectory(directory: FileSystemDirectoryEntry): FileSystemEntry[] {
  const reader = directory.createReader()
  let allEntriesInDir: FileSystemEntry[] = []

  const getFileObjects = async (fileSystemEntries: FileSystemEntry[]): Promise<File[]> => {
    const allFileObjects: File[] = []
    const getFile = async (fileEntry: FileSystemFileEntry): Promise<File> => {
      return new Promise((resolve, reject) => fileEntry.file(resolve, reject))
    }
    for (let i = 0; i < fileSystemEntries.length; i++) {
      allFileObjects.push(await getFile(fileSystemEntries[i] as FileSystemFileEntry))
    }
    return allFileObjects
  }

  const readEntries = (): void => {
    reader.readEntries((entries) => {
      if (entries.length) {
        allEntriesInDir = allEntriesInDir.concat(entries)
        readEntries()
      } else {
        getFileObjects(allEntriesInDir)
          .then(async () => {})
          .catch((e) => {
            throw e
          })
      }
    })
  }

  readEntries()
  return allEntriesInDir
}

/**
 * Read a file as a data URL
 * @param entry - FileSystemFileEntry to read
 * @returns Promise resolving to data URL string
 */
export function readFileAsDataURL(entry: FileSystemFileEntry): Promise<string> {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) => {
        const reader = new FileReader()
        reader.onload = (): void => resolve(reader.result as string)
        reader.onerror = (): void => reject(new Error('Failed to read file as data URL'))
        reader.readAsDataURL(file)
      },
      (err) => reject(err)
    )
  })
}

/**
 * Simple drag enter event handler that prevents default behavior
 * @param e - Mouse event
 */
export function handleDragEnter(e: MouseEvent): void {
  e.stopPropagation()
  e.preventDefault()
}

/**
 * Simple drag over event handler that prevents default behavior
 * @param e - Mouse event
 */
export function handleDragOver(e: MouseEvent): void {
  e.stopPropagation()
  e.preventDefault()
}
