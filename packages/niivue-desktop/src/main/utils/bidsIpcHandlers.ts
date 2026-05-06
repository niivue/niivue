import { dialog, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const debugLog = (msg: string): void => {
  try {
    fs.appendFileSync('/tmp/bids-validator-debug.log', `${new Date().toISOString()} [ipc] ${msg}\n`)
  } catch {
    /* */
  }
}
import { spawnDcm2niix } from './runDcm2niix.js'
import {
  classifyAll,
  extractDemographics,
  suggestFieldmapMappings,
  parseEventFile
} from './bidsEngine.js'
import { writeDataset } from './bidsWriter.js'
import { registerAllowedRoot } from './pathSafety.js'
import { validateBidsDirectory, validateWithTempWrite } from './bidsExternalValidator.js'
import {
  analyzeValidatorIssues,
  autoFixUnambiguous,
  readSidecar,
  updateSidecar
} from './bidsSidecarFixer.js'
import type {
  BidsConvertAndClassifyPayload,
  BidsWritePayload,
  BidsValidatePayload,
  BidsSeriesMapping,
  BidsValidationResult
} from '../../common/bidsTypes.js'

export function registerBidsIpcHandlers(): void {
  /**
   * Convert selected DICOM series and classify them for BIDS
   */
  ipcMain.handle(
    'bids:convert-and-classify',
    async (_evt, payload: BidsConvertAndClassifyPayload) => {
      try {
        const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bids-convert-'))

        // Convert all DICOM files in the directory (without -n filter which is unreliable)
        const args = [
          '-f',
          '%p_%s',
          '-b',
          'y',
          '-ba',
          'n',
          '-z',
          'y',
          '-o',
          outDir,
          payload.dicomDir
        ]

        const { code, stderr } = await spawnDcm2niix(args)
        if (code !== 0 && code !== 1) {
          return { success: false, error: `dcm2niix exited with code ${code}: ${stderr}` }
        }

        // Collect JSON sidecars from output
        const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.json'))
        if (files.length === 0) {
          return { success: false, error: 'No NIfTI files produced by dcm2niix' }
        }

        const sidecarPaths = files.map((f) => path.join(outDir, f))
        const { mappings, detectedSubjects } = classifyAll(sidecarPaths)
        const demographics = extractDemographics(sidecarPaths[0])
        return { success: true, mappings, demographics, detectedSubjects }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    }
  )

  /**
   * Import pre-converted NIfTI+JSON pairs from a directory and classify for BIDS
   */
  ipcMain.handle('bids:import-nifti-dir', async (_evt, dirPath: string) => {
    try {
      // Collect all JSON sidecar files recursively
      const jsonFiles: string[] = []
      const scan = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            scan(path.join(dir, entry.name))
          } else if (entry.name.endsWith('.json')) {
            // Check that a matching NIfTI exists
            const base = path.join(dir, entry.name.replace(/\.json$/, ''))
            if (fs.existsSync(base + '.nii.gz') || fs.existsSync(base + '.nii')) {
              jsonFiles.push(path.join(dir, entry.name))
            }
          }
        }
      }
      scan(dirPath)

      if (jsonFiles.length === 0) {
        return { success: false, error: 'No NIfTI+JSON pairs found in directory' }
      }

      const { mappings, detectedSubjects } = classifyAll(jsonFiles)
      const demographics = extractDemographics(jsonFiles[0])
      return { success: true, mappings, demographics, detectedSubjects }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg }
    }
  })

  /**
   * Validate proposed BIDS dataset by writing to a temp dir and running bids-validator
   */
  ipcMain.handle('bids:validate', async (_evt, payload: BidsValidatePayload) => {
    try {
      // Quick pre-flight checks before running external validator
      const included = payload.mappings.filter((m) => !m.excluded)
      if (included.length === 0) {
        return {
          valid: false,
          errors: [{ severity: 'error', message: 'No series selected for conversion' }],
          warnings: []
        }
      }
      if (!payload.config.name?.trim()) {
        return {
          valid: false,
          errors: [{ severity: 'error', message: 'Dataset name is required', targetStep: 6 }],
          warnings: []
        }
      }

      const result = await validateWithTempWrite(
        payload.config,
        payload.mappings,
        payload.demographics,
        payload.allDemographics,
        payload.fieldmapIntendedFor
      )
      console.log('[bids:validate] result:', JSON.stringify(result).substring(0, 300))
      return result
    } catch (err) {
      console.error('[bids:validate] error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      return {
        valid: false,
        errors: [{ severity: 'error', message: msg }],
        warnings: []
      }
    }
  })

  /**
   * Validate an already-written BIDS dataset directory
   */
  ipcMain.handle(
    'bids:validate-written',
    async (_evt, payload: { dirPath: string; mappings: BidsSeriesMapping[] }) => {
      try {
        debugLog(`bids:validate-written called, dirPath: ${payload.dirPath}`)
        const result = await validateBidsDirectory(payload.dirPath, payload.mappings)
        console.log('[bids:validate-written] result:', JSON.stringify(result).substring(0, 300))
        return result
      } catch (err) {
        console.error('[bids:validate-written] error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        return {
          valid: false,
          errors: [{ severity: 'error', message: msg }],
          warnings: []
        }
      }
    }
  )

  /**
   * Analyze a validator result against a written dataset directory and
   * return per-sidecar fix proposals. Only sidecars with at least one
   * editable suggestion are returned.
   */
  ipcMain.handle(
    'bids:analyze-fixes',
    async (_evt, payload: { dirPath: string; result: BidsValidationResult }) => {
      try {
        const proposals = analyzeValidatorIssues(payload.dirPath, payload.result)
        return { success: true, proposals }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    }
  )

  /**
   * Read a BIDS JSON sidecar from disk.
   */
  ipcMain.handle('bids:read-sidecar', async (_evt, sidecarPath: string) => {
    return readSidecar(sidecarPath)
  })

  /**
   * Run the full sidecar-fix cycle against a written dataset:
   *   1. apply unambiguous auto-fixes (e.g. TaskName from filename)
   *   2. re-run the external bids-validator
   *   3. return the fresh validation result and editable fix proposals
   *
   * Used by both the `bids-fix-sidecars` workflow tool and the interactive
   * BidsSidecarFixForm component.
   */
  ipcMain.handle(
    'bids:auto-fix-sidecars',
    async (_evt, payload: { dirPath: string; mappings?: BidsSeriesMapping[] }) => {
      try {
        const auto = autoFixUnambiguous(payload.dirPath)
        const validation = await validateBidsDirectory(payload.dirPath, payload.mappings ?? [])
        const proposals = analyzeValidatorIssues(payload.dirPath, validation)
        return {
          success: true,
          fixesApplied: auto.fixes,
          validation,
          proposals
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: msg }
      }
    }
  )

  /**
   * Apply user edits to a sidecar on disk. Empty strings / empty arrays /
   * null values delete the corresponding key.
   */
  ipcMain.handle(
    'bids:update-sidecar',
    async (_evt, payload: { sidecarPath: string; updates: Record<string, unknown> }) => {
      return updateSidecar(payload.sidecarPath, payload.updates)
    }
  )

  /**
   * Write final BIDS dataset to disk
   */
  ipcMain.handle('bids:write', async (_evt, payload: BidsWritePayload) => {
    debugLog(`bids:write called, outputDir: ${payload.config.outputDir}`)
    try {
      const result = writeDataset(
        payload.config,
        payload.mappings,
        payload.demographics,
        payload.allDemographics,
        payload.fieldmapIntendedFor
      )
      // Allow the renderer to probe inside the dataset we just wrote
      registerAllowedRoot(result.outputDir)
      debugLog(`bids:write success, filesCopied: ${result.filesCopied}`)
      return { success: true, outputDir: result.outputDir, filesCopied: result.filesCopied }
    } catch (err) {
      debugLog(`bids:write error: ${err instanceof Error ? err.message : String(err)}`)
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg }
    }
  })

  /**
   * Suggest fieldmap IntendedFor mappings
   */
  ipcMain.handle('bids:suggest-fieldmap-mappings', async (_evt, mappings) => {
    return suggestFieldmapMappings(mappings)
  })

  /**
   * Show file picker for event files
   */
  ipcMain.handle('bids:select-event-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Event/Timing File',
      filters: [
        { name: 'Event files', extensions: ['tsv', 'csv', 'txt'] },
        { name: 'All files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  /**
   * Parse an event file and return columns + preview
   */
  ipcMain.handle('bids:parse-event-file', async (_evt, filePath: string) => {
    return parseEventFile(filePath)
  })

  /**
   * Show directory picker for BIDS output location
   */
  ipcMain.handle('bids:select-output-dir', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select BIDS Output Directory',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}
