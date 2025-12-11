/**
 * Drop handler utilities for drag-and-drop file loading.
 *
 * This module provides pure functions for handling drag-and-drop operations
 * including URL drops, file system entries, and paired file detection.
 *
 * Related modules:
 * - FileLoader.ts - File extension detection and format handling
 * - EventController.ts - General event handling utilities
 */

import { MESH_EXTENSIONS, getFileExt } from '@/niivue/data/FileLoader'
import { log } from '@/logger'

/**
 * File type category for dropped files
 */
export type DropFileType = 'mesh' | 'document' | 'volume'

/**
 * Result of categorizing a dropped URL or file
 */
export interface DropCategory {
    type: DropFileType
    ext: string
}

/**
 * Paired file entries for formats like AFNI HEAD/BRIK or Analyze HDR/IMG
 */
export interface PairedFileEntry {
    entry: FileSystemFileEntry
    pairedEntry: FileSystemEntry | null
}

/**
 * Skip reasons for file entries
 */
export type SkipReason = 'brik' | 'img' | null

/**
 * Categorize a file based on its extension.
 * @param ext - The file extension (uppercase)
 * @returns The drop category type
 */
export function categorizeByExtension(ext: string): DropFileType {
    if (MESH_EXTENSIONS.includes(ext)) {
        return 'mesh'
    }
    if (ext === 'NVD') {
        return 'document'
    }
    return 'volume'
}

/**
 * Check if a file should be skipped because it's a paired data file (BRIK or IMG).
 * These are loaded alongside their header files, not independently.
 * @param filename - The filename to check
 * @returns The skip reason or null if not skipped
 */
export function shouldSkipPairedDataFile(filename: string): SkipReason {
    if (filename.lastIndexOf('BRIK') !== -1) {
        return 'brik'
    }
    if (filename.toUpperCase().lastIndexOf('IMG') !== -1) {
        return 'img'
    }
    return null
}

/**
 * Find AFNI HEAD/BRIK paired file from a list of dropped items.
 * @param headerEntry - The HEAD file entry
 * @param items - All dropped items
 * @returns The paired BRIK entry or null
 */
export function findAfniPairedFile(headerEntry: FileSystemEntry, items: DataTransferItemList): FileSystemEntry | null {
    const headerIndex = headerEntry.name.lastIndexOf('HEAD')
    if (headerIndex === -1) {
        return null
    }

    const fileBaseName = headerEntry.name.substring(0, headerIndex)

    for (const item of Array.from(items)) {
        const pairedEntry = item.webkitGetAsEntry()
        if (!pairedEntry) {
            continue
        }
        const brikIndex = pairedEntry.name.lastIndexOf('BRIK')
        if (brikIndex === -1) {
            continue
        }
        const pairedBaseName = pairedEntry.name.substring(0, brikIndex)
        if (fileBaseName === pairedBaseName) {
            return pairedEntry
        }
    }
    return null
}

/**
 * Find Analyze HDR/IMG paired file from a list of dropped items.
 * @param headerEntry - The HDR file entry
 * @param items - All dropped items
 * @returns The paired IMG entry or null
 */
export function findAnalyzePairedFile(headerEntry: FileSystemEntry, items: DataTransferItemList): FileSystemEntry | null {
    const upperName = headerEntry.name.toUpperCase()
    const hdrIndex = upperName.lastIndexOf('HDR')
    if (hdrIndex === -1) {
        return null
    }

    const fileBaseName = headerEntry.name.substring(0, hdrIndex)

    for (const item of Array.from(items)) {
        const pairedEntry = item.webkitGetAsEntry()
        if (!pairedEntry) {
            continue
        }
        const upperPairedName = pairedEntry.name.toUpperCase()
        const imgIndex = upperPairedName.lastIndexOf('IMG')
        if (imgIndex === -1) {
            continue
        }
        const pairedBaseName = pairedEntry.name.substring(0, imgIndex)
        if (fileBaseName.toUpperCase() === pairedBaseName.toUpperCase()) {
            return pairedEntry
        }
    }
    return null
}

/**
 * Find any paired file (AFNI or Analyze) for a given file entry.
 * @param entry - The file entry to find a pair for
 * @param items - All dropped items
 * @returns The paired entry or null
 */
export function findPairedFile(entry: FileSystemEntry, items: DataTransferItemList): FileSystemEntry | null {
    // Check for AFNI HEAD/BRIK pair
    const afniPair = findAfniPairedFile(entry, items)
    if (afniPair) {
        return afniPair
    }

    // Check for Analyze HDR/IMG pair
    return findAnalyzePairedFile(entry, items)
}

/**
 * Promise wrapper to get a File from a FileSystemFileEntry.
 * @param entry - The file system entry
 * @returns Promise resolving to the File
 */
export function getFileFromEntry(entry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => {
        entry.file(resolve, reject)
    })
}

/**
 * Read a FileSystemFileEntry as a data URL.
 * @param entry - The file entry to read
 * @returns Promise resolving to the data URL string
 */
export function readEntryAsDataURL(entry: FileSystemFileEntry): Promise<string> {
    return new Promise((resolve, reject) => {
        entry.file((file) => {
            const reader = new FileReader()
            reader.onload = (): void => {
                resolve(reader.result as string)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        }, reject)
    })
}

/**
 * Process drop items and extract file entries with their paired data.
 * @param items - The DataTransferItemList from the drop event
 * @returns Array of entries with paired file info
 */
export function processDropItems(items: DataTransferItemList): PairedFileEntry[] {
    const results: PairedFileEntry[] = []

    for (const item of Array.from(items)) {
        const entry = item.webkitGetAsEntry() as FileSystemFileEntry
        if (!entry) {
            log.warn('could not get entry from dropped item')
            continue
        }

        if (entry.isFile) {
            // Skip paired data files (they'll be loaded with their headers)
            if (shouldSkipPairedDataFile(entry.name)) {
                continue
            }

            const pairedEntry = findPairedFile(entry, items)
            results.push({ entry, pairedEntry })
        }
    }

    return results
}

/**
 * Extract directory entries from drop items.
 * @param items - The DataTransferItemList from the drop event
 * @returns Array of directory entries
 */
export function extractDirectoryEntries(items: DataTransferItemList): FileSystemDirectoryEntry[] {
    const directories: FileSystemDirectoryEntry[] = []

    for (const item of Array.from(items)) {
        const entry = item.webkitGetAsEntry()
        if (entry?.isDirectory) {
            directories.push(entry as FileSystemDirectoryEntry)
        }
    }

    return directories
}

/**
 * Get the URL from a drop event's dataTransfer.
 * @param dataTransfer - The DataTransfer object from the drop event
 * @returns The URL string or null if not a URL drop
 */
export function getDroppedUrl(dataTransfer: DataTransfer): string | null {
    const url = dataTransfer.getData('text/uri-list')
    return url || null
}

/**
 * Check if the drop contains files (items) rather than a URL.
 * @param dataTransfer - The DataTransfer object from the drop event
 * @returns True if items are present
 */
export function hasDroppedFiles(dataTransfer: DataTransfer): boolean {
    return dataTransfer.items.length > 0
}

/**
 * Determine the file extension for a filename or URL.
 * @param fullname - The filename or URL
 * @returns Uppercase file extension
 */
export function getDropFileExt(fullname: string): string {
    return getFileExt(fullname)
}
