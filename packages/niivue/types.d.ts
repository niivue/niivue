declare module '*.png'
declare module '*.svg'
declare module '*.jpeg'
declare module '*.jpg'

// used for custom niivue loaders with drag and drop files
interface FileSystemEntry {
  isDirectory: boolean
  isFile: boolean
  fullPath: string
  name: string
}

// used for custom niivue loaders with drag and drop files
interface FileSystemFileEntry extends FileSystemEntry {
  isDirectory: false
  isFile: true
  file: (callback: (file: File) => void, errorCallback?: (error: DOMException) => void) => void
}
