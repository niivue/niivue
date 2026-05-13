// In-process BIDS validation using @bids/validator (JSR/npm package).
// Replaces the previous shell-out to a global `bids-validator` CLI.
//
// Architecture:
//   1. Walk the dataset root, ignoring derivatives/sourcedata/code.
//   2. For each file, construct a `BIDSFile` whose `FileOpener` does
//      lazy range reads via `fs.promises.open` + `FileHandle.read`. The
//      validator's NIfTI rule only needs the first 1 KB; other reads
//      hit `text()` or `stream()` and pay full-file I/O, but only on
//      demand.
//   3. Hand `BIDSFile[]` to `filesToTree`, then call `validate(tree, ...)`.
//   4. Translate the result into our existing `BidsValidationResult` shape.

import { promises as fsPromises } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import type {
  BidsValidationIssue,
  BidsValidationResult,
  BidsSeriesMapping
} from '../../common/bidsTypes.js'
import { generateBidsFilename } from './bidsWriter.js'

interface FileOpenerLike {
  size: number
  text(): Promise<string>
  readBytes(size: number, offset?: number): Promise<Uint8Array>
  stream(): Promise<ReadableStream<Uint8Array>>
}

class NodeFileOpener implements FileOpenerLike {
  readonly path: string
  size: number

  constructor(absPath: string, size: number) {
    this.path = absPath
    this.size = size
  }

  async text(): Promise<string> {
    return fsPromises.readFile(this.path, 'utf-8')
  }

  async readBytes(size: number, offset = 0): Promise<Uint8Array> {
    if (size <= 0) return new Uint8Array(0)
    const handle = await fsPromises.open(this.path, 'r')
    try {
      const buf = Buffer.alloc(size)
      const { bytesRead } = await handle.read(buf, 0, size, offset)
      return buf.subarray(0, bytesRead)
    } finally {
      await handle.close().catch(() => {
        /* best-effort */
      })
    }
  }

  async stream(): Promise<ReadableStream<Uint8Array>> {
    const fileStream = (await fsPromises.open(this.path, 'r')).createReadStream()
    return Readable.toWeb(fileStream) as ReadableStream<Uint8Array>
  }
}

interface WalkContext {
  root: string
  files: { rel: string; abs: string; size: number }[]
  prune: ReadonlySet<string>
}

async function walkDataset(root: string): Promise<{ rel: string; abs: string; size: number }[]> {
  const ctx: WalkContext = {
    root,
    files: [],
    prune: new Set(['derivatives', 'sourcedata', 'code'])
  }
  await walkInto(ctx, root, '')
  return ctx.files
}

async function walkInto(ctx: WalkContext, dir: string, relPrefix: string): Promise<void> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fsPromises.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const rel = relPrefix === '' ? e.name : `${relPrefix}/${e.name}`
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (relPrefix === '' && ctx.prune.has(e.name)) continue
      await walkInto(ctx, abs, rel)
      continue
    }
    if (!e.isFile()) continue
    try {
      const stat = await fsPromises.stat(abs)
      ctx.files.push({ rel, abs, size: stat.size })
    } catch {
      // skip unstattable entry
    }
  }
}

function matchIssueToSeries(filePath: string, mappings: BidsSeriesMapping[]): number | undefined {
  if (!filePath) return undefined
  const base = path.basename(filePath).replace(/\.(nii\.gz|nii|json|tsv)$/, '')
  for (const m of mappings) {
    if (m.excluded) continue
    if (base === generateBidsFilename(m)) return m.index
  }
  return undefined
}

function getTargetStepFromMessage(message: string, code: string): number | undefined {
  const lower = `${message} ${code}`.toLowerCase()
  if (lower.includes('dataset_description') || lower.includes('readme')) return 6
  if (lower.includes('participant') || lower.includes('subject')) return 5
  if (lower.includes('events') || lower.includes('onset') || lower.includes('duration')) return 4
  if (lower.includes('task')) return 3
  return 3
}

interface ValidatorIssue {
  code: string
  subCode?: string
  severity?: 'error' | 'warning' | 'ignore'
  location?: string
  issueMessage?: string
  affects?: string[]
  rule?: string
}

interface ValidatorDatasetIssues {
  issues: ValidatorIssue[]
  codeMessages: Map<string, string>
  size: number
}

interface ValidatorResult {
  issues: ValidatorDatasetIssues
  summary: Record<string, unknown>
}

let modulesPromise: Promise<{
  validate: (tree: unknown, opts: Record<string, unknown>) => Promise<ValidatorResult>
  BIDSFile: new (path: string, opener: FileOpenerLike, ignore?: unknown) => unknown
  filesToTree: (files: unknown[], ignore?: unknown) => unknown
  FileIgnoreRules: new (patterns: string[]) => unknown
}> | null = null

type ValidatorModules = {
  validate: (tree: unknown, opts: Record<string, unknown>) => Promise<ValidatorResult>
  BIDSFile: new (path: string, opener: FileOpenerLike, ignore?: unknown) => unknown
  filesToTree: (files: unknown[], ignore?: unknown) => unknown
  FileIgnoreRules: new (patterns: string[]) => unknown
}

async function loadValidatorModules(): Promise<ValidatorModules> {
  if (modulesPromise === null) {
    modulesPromise = (async (): Promise<ValidatorModules> => {
      const v = (await import('@bids/validator/validate')) as unknown as {
        validate: (tree: unknown, opts: Record<string, unknown>) => Promise<ValidatorResult>
      }
      const f = (await import('@bids/validator/files')) as unknown as {
        BIDSFile: new (path: string, opener: FileOpenerLike, ignore?: unknown) => unknown
      }
      const ft = (await import('@bids/validator/filetree')) as unknown as {
        filesToTree: (files: unknown[], ignore?: unknown) => unknown
        FileIgnoreRules: new (patterns: string[]) => unknown
      }
      return {
        validate: v.validate,
        BIDSFile: f.BIDSFile,
        filesToTree: ft.filesToTree,
        FileIgnoreRules: ft.FileIgnoreRules
      }
    })()
  }
  return modulesPromise
}

/**
 * Validate a BIDS directory in-process using @bids/validator. Returns
 * the same `BidsValidationResult` shape the renderer expects, so it's a
 * drop-in replacement for the previous external-CLI implementation.
 */
export async function validateBidsDirectoryInProcess(
  dirPath: string,
  mappings: BidsSeriesMapping[]
): Promise<BidsValidationResult> {
  let modules: Awaited<ReturnType<typeof loadValidatorModules>>
  try {
    modules = await loadValidatorModules()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      errors: [{ severity: 'error', message: `Failed to load @bids/validator: ${msg}` }],
      warnings: []
    }
  }
  const { validate, BIDSFile, filesToTree, FileIgnoreRules } = modules
  const ignore = new FileIgnoreRules([])

  let files: { rel: string; abs: string; size: number }[]
  try {
    files = await walkDataset(dirPath)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      errors: [{ severity: 'error', message: `Could not walk dataset: ${msg}` }],
      warnings: []
    }
  }
  const bidsFiles = files.map(
    (f) => new BIDSFile(`/${f.rel}`, new NodeFileOpener(f.abs, f.size), ignore)
  )
  const tree = filesToTree(bidsFiles, ignore)

  let result: ValidatorResult
  try {
    result = await validate(tree, {
      datasetPath: dirPath,
      debug: 'ERROR',
      datasetTypes: ['raw', 'derivative'],
      blacklistModalities: []
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      errors: [{ severity: 'error', message: `Validator threw: ${msg}` }],
      warnings: []
    }
  }

  const errors: BidsValidationIssue[] = []
  const warnings: BidsValidationIssue[] = []
  const messages = result.issues.codeMessages ?? new Map()

  for (const issue of result.issues.issues) {
    const sev = issue.severity ?? 'error'
    if (sev === 'ignore') continue
    const baseMessage = issue.issueMessage ?? messages.get(issue.code) ?? issue.code
    const code = issue.code
    const affects = issue.affects && issue.affects.length > 0 ? issue.affects : [issue.location]
    for (const location of affects) {
      const filePath = location ?? ''
      const out: BidsValidationIssue = {
        severity: sev,
        message: baseMessage,
        file: filePath,
        code,
        subCode: issue.subCode,
        rule: issue.rule,
        seriesIndex: matchIssueToSeries(filePath, mappings),
        targetStep: getTargetStepFromMessage(baseMessage, code)
      }
      if (sev === 'warning') warnings.push(out)
      else errors.push(out)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
