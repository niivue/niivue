import { dialog, ipcMain, shell } from 'electron'
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
import { nodePostPassFs, runPostPass } from './bidsPostpass/index.js'
import { readBidsTree } from './bidsTreeReader.js'
import { renameSubject } from './bidsSubjectRename.js'
import { applyUserEditsToProvenanceFile } from './bidsProvenanceWriter.js'
import type {
  BidsConvertAndClassifyPayload,
  BidsWritePayload,
  BidsValidatePayload,
  BidsSeriesMapping,
  BidsValidationResult,
  BidsApplyEditsResult,
  SidecarStagedEdit
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
        payload.fieldmapIntendedFor,
        undefined,
        payload.originalPaths
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
   * Run the import post-pass on a written BIDS root: aggregate
   * `<sub>[_<ses>]_scans.tsv` and wire B0FieldIdentifier/B0FieldSource
   * across fmap/target sidecars. Returns counts so the UI can surface
   * "Wrote N scans.tsv files, edited M sidecars".
   */
  ipcMain.handle('bids:run-postpass', async (_evt, payload: { bidsDir: string }) => {
    try {
      const result = await runPostPass(
        payload.bidsDir,
        async (filePath, content) => {
          fs.mkdirSync(path.dirname(filePath), { recursive: true })
          fs.writeFileSync(filePath, content, 'utf-8')
        },
        nodePostPassFs
      )
      return { success: true, ...result }
    } catch (err) {
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
   * Walk a BIDS dataset on disk and return one row per NIfTI with its
   * sidecar JSON parsed. Used by the BIDS View step to render the same
   * tree+inspector UI the Prep step uses, but over real on-disk files.
   */
  ipcMain.handle('bids:read-tree', async (_evt, dirPath: string) => {
    try {
      const files = readBidsTree(dirPath)
      return { success: true, files }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /**
   * Open a file (typically a TSV the inspector can't edit inline) in the
   * user's default OS handler, or reveal it in their file manager.
   * `shell.openPath` returns an error string on failure; non-empty means
   * something went wrong (e.g. file missing).
   */
  ipcMain.handle(
    'bids:open-file-external',
    async (_evt, payload: { path: string; reveal?: boolean }) => {
      try {
        if (!payload?.path) return { success: false, error: 'No path provided' }
        if (payload.reveal) {
          shell.showItemInFolder(payload.path)
          return { success: true }
        }
        const err = await shell.openPath(payload.path)
        if (err) return { success: false, error: err }
        return { success: true }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  /**
   * Read a TSV file as a header row + rows-of-cells grid, suitable for the
   * react-spreadsheet editor. Returns the raw text alongside so the caller
   * can detect a stale on-disk version before overwriting it.
   */
  ipcMain.handle('bids:read-tsv', async (_evt, tsvPath: string) => {
    try {
      if (!tsvPath) return { success: false, error: 'No path provided' }
      const raw = await fs.promises.readFile(tsvPath, 'utf-8')
      // Strip a single trailing newline so we don't add a phantom empty row.
      const trimmed = raw.endsWith('\n') ? raw.slice(0, -1) : raw
      const lines = trimmed.length === 0 ? [] : trimmed.split('\n')
      const grid = lines.map((line) => line.split('\t'))
      return { success: true, grid, raw }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /**
   * Persist an edited TSV grid back to disk. The grid arrives as
   * rows-of-strings (caller is responsible for converting react-spreadsheet
   * cell objects to plain strings); we join with tabs + newlines and end
   * the file with a single trailing newline, matching the convention BIDS
   * tools (and our writer) use.
   */
  ipcMain.handle('bids:write-tsv', async (_evt, payload: { path: string; grid: string[][] }) => {
    try {
      if (!payload?.path) return { success: false, error: 'No path provided' }
      const body = payload.grid.map((row) => row.join('\t')).join('\n')
      await fs.promises.writeFile(payload.path, body + '\n', 'utf-8')
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  /**
   * Validate a BIDS directory on disk using the in-process @bids/validator.
   * Returns the result with `subCode` (field name) and `rule` (schema path)
   * preserved on each issue, so the renderer can attach per-field warnings
   * to the inspector and a rule reference to each validator message.
   */
  ipcMain.handle('bids:validate-tree', async (_evt, dirPath: string) => {
    debugLog(`bids:validate-tree invoked with dirPath=${dirPath}`)
    try {
      const result = await validateBidsDirectory(dirPath, [])
      debugLog(
        `bids:validate-tree ok valid=${result.valid} errors=${result.errors.length} warnings=${result.warnings.length}`
      )
      return { success: true, result }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      debugLog(`bids:validate-tree THREW: ${msg}`)
      if (err instanceof Error && err.stack) debugLog(err.stack)
      return { success: false, error: msg }
    }
  })

  /**
   * Return the BIDS schema's `objects.metadata` catalog. The renderer uses
   * this to look up `display_name`, `description`, `type`, and `enum` for
   * each sidecar field surfaced by the validator. ~160 KB; cached at the
   * call site so the cost is paid once per session.
   */
  ipcMain.handle('bids:get-metadata-defs', async () => {
    debugLog('bids:get-metadata-defs invoked')
    try {
      const mod = (await import('@jsr/bids__schema')) as unknown as {
        schema: { objects: { metadata: Record<string, unknown> } }
      }
      const metadata = mod.schema.objects.metadata
      debugLog(`bids:get-metadata-defs ok keys=${Object.keys(metadata).length}`)
      return { success: true, metadata }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      debugLog(`bids:get-metadata-defs THREW: ${msg}`)
      return { success: false, error: msg }
    }
  })

  /**
   * Apply a batch of staged sidecar edits. Edits are grouped by sidecar
   * path so each JSON file is read/written once even if the user touched
   * multiple fields in it. Continues on per-file failure and reports
   * which ops failed — the UI then lets the user retry or clear them.
   */
  ipcMain.handle(
    'bids:apply-staged-edits',
    async (_evt, payload: { edits: SidecarStagedEdit[] }): Promise<BidsApplyEditsResult> => {
      const byPath = new Map<string, Record<string, unknown>>()
      for (const e of payload.edits) {
        const bucket = byPath.get(e.sidecarPath) ?? {}
        bucket[e.field] = e.value
        byPath.set(e.sidecarPath, bucket)
      }
      let applied = 0
      const failed: BidsApplyEditsResult['failed'] = []
      for (const [sidecarPath, updates] of byPath) {
        const result = updateSidecar(sidecarPath, updates)
        if (result.ok) {
          applied += Object.keys(updates).length
          // Mirror the edit into the sibling .prov.json so the autofix
          // layer knows these fields are user-authored. A prov-write
          // failure must not fail the sidecar edit — the sidecar is the
          // source of truth, prov is best-effort attribution.
          try {
            applyUserEditsToProvenanceFile(sidecarPath, updates)
          } catch (err) {
            debugLog(
              `bids:apply-staged-edits prov-write failed for ${sidecarPath}: ${err instanceof Error ? err.message : String(err)}`
            )
          }
        } else {
          for (const field of Object.keys(updates)) {
            failed.push({ sidecarPath, field, error: result.error ?? 'unknown error' })
          }
        }
      }
      return { applied, failed }
    }
  )

  /**
   * Rename a subject in a written BIDS dataset on disk. Moves the
   * subject directory, rewrites every file basename, and updates
   * participants.tsv. Returns counts so the UI can confirm what happened.
   */
  ipcMain.handle(
    'bids:rename-subject',
    async (_evt, payload: { bidsDir: string; oldLabel: string; newLabel: string }) => {
      return renameSubject(payload.bidsDir, payload.oldLabel, payload.newLabel)
    }
  )

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
