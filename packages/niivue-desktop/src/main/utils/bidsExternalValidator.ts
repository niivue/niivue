import { execFileSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type {
  BidsValidationResult,
  BidsValidationIssue,
  BidsSeriesMapping,
  BidsDatasetConfig,
  ParticipantDemographics,
  FieldmapIntendedFor
} from '../../common/bidsTypes.js'
import { writeDataset } from './bidsWriter.js'
import { generateBidsFilename } from './bidsWriter.js'


interface BidsValidatorIssue {
  key: string
  severity: string
  reason: string
  code: number
  files: {
    file: { name: string; path: string; relativePath: string }
    reason: string
    evidence?: string | null
  }[]
  additionalFileCount: number
  helpUrl: string
}

interface BidsValidatorOutput {
  issues: {
    errors: BidsValidatorIssue[]
    warnings: BidsValidatorIssue[]
    ignored: BidsValidatorIssue[]
  }
}

function findBidsValidator(): string | null {
  const candidates = ['bids-validator']
  for (const cmd of candidates) {
    try {
      execFileSync('which', [cmd], { stdio: 'pipe' })
      return cmd
    } catch {
      // not found
    }
  }
  return null
}

function matchIssueToSeries(filePath: string, mappings: BidsSeriesMapping[]): number | undefined {
  if (!filePath) return undefined
  const basename = path.basename(filePath).replace(/\.(nii\.gz|nii|json|tsv)$/, '')
  for (const m of mappings) {
    if (m.excluded) continue
    const bidsName = generateBidsFilename(m)
    if (basename === bidsName) {
      return m.index
    }
  }
  return undefined
}

function getTargetStepFromIssue(issue: BidsValidatorIssue): number | undefined {
  const msg = (issue.reason || issue.key || '').toLowerCase()
  if (msg.includes('dataset_description') || msg.includes('readme')) return 6
  if (msg.includes('participant') || msg.includes('subject')) return 5
  if (msg.includes('events') || msg.includes('onset') || msg.includes('duration')) return 4
  if (msg.includes('task')) return 3
  return 3
}

function convertIssue(
  issue: BidsValidatorIssue,
  severity: 'error' | 'warning',
  mappings: BidsSeriesMapping[]
): BidsValidationIssue[] {
  if (issue.files.length === 0) {
    return [
      {
        severity,
        message: issue.reason || issue.key,
        code: issue.key,
        targetStep: getTargetStepFromIssue(issue)
      }
    ]
  }

  return issue.files.map((f) => {
    const filePath = f.file?.relativePath || f.file?.path || ''
    const seriesIndex = matchIssueToSeries(filePath, mappings)
    return {
      severity,
      message: f.reason || issue.reason || issue.key,
      file: filePath,
      code: issue.key,
      seriesIndex,
      targetStep: getTargetStepFromIssue(issue)
    }
  })
}

const debugLog = (msg: string): void => {
  try { fs.appendFileSync('/tmp/bids-validator-debug.log', `${new Date().toISOString()} ${msg}\n`) } catch { /* */ }
}

export async function validateBidsDirectory(
  dirPath: string,
  mappings: BidsSeriesMapping[]
): Promise<BidsValidationResult> {
  debugLog(`validateBidsDirectory called with: ${dirPath}`)
  const cmd = findBidsValidator()
  if (!cmd) {
    return {
      valid: true,
      errors: [],
      warnings: [
        {
          severity: 'warning',
          message: 'bids-validator not found. Install via: pip install bids-validator'
        }
      ]
    }
  }

  try {
    // Write bids-validator output to a temp file to avoid pipe buffer truncation
    const tmpOut = path.join(os.tmpdir(), `bids-val-${Date.now()}.json`)
    try {
      execSync(
        `"${cmd}" "${dirPath}" --json --no-color --ignoreNiftiHeaders --ignoreSymlinks > "${tmpOut}" 2>/dev/null`,
        { timeout: 60000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }, shell: '/bin/sh' }
      )
    } catch {
      // bids-validator exits non-zero on validation errors — that's expected
    }
    let stdout = ''
    try {
      stdout = fs.readFileSync(tmpOut, 'utf8')
    } catch { /* file may not exist if cmd failed */ }
    try { fs.unlinkSync(tmpOut) } catch { /* cleanup */ }
    debugLog(`stdout length: ${stdout.length}`)

    // Strip ANSI escape codes that bids-validator may emit
    // eslint-disable-next-line no-control-regex
    stdout = stdout.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    // bids-validator outputs one line of JSON; find where it starts
    const jsonStart = stdout.indexOf('{"')
    if (jsonStart === -1) {
      const preview = stdout.substring(0, 500).trim()
      return {
        valid: false,
        errors: [{ severity: 'error', message: `bids-validator produced no JSON output: ${preview || '(empty)'}` }],
        warnings: []
      }
    }
    // Take from the JSON start to end of line (or end of string)
    let jsonStr = stdout.substring(jsonStart)
    const newlineIdx = jsonStr.indexOf('\n')
    if (newlineIdx !== -1) {
      jsonStr = jsonStr.substring(0, newlineIdx)
    }

    let parsed: BidsValidatorOutput
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      // If line-based extraction fails, try parsing everything after jsonStart
      parsed = JSON.parse(stdout.substring(jsonStart))
    }
    const errors: BidsValidationIssue[] = []
    const warnings: BidsValidationIssue[] = []

    for (const issue of parsed.issues.errors) {
      errors.push(...convertIssue(issue, 'error', mappings))
    }
    for (const issue of parsed.issues.warnings) {
      warnings.push(...convertIssue(issue, 'warning', mappings))
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      errors: [{ severity: 'error', message: `Failed to parse bids-validator output: ${msg}` }],
      warnings: []
    }
  }
}

export async function validateWithTempWrite(
  config: BidsDatasetConfig,
  mappings: BidsSeriesMapping[],
  demographics?: ParticipantDemographics,
  allDemographics?: Record<string, ParticipantDemographics>,
  fieldmapIntendedFor?: FieldmapIntendedFor[]
): Promise<BidsValidationResult> {
  const tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bids-validate-')))
  const tempConfig = { ...config, outputDir: tempDir }

  try {
    const { outputDir } = writeDataset(tempConfig, mappings, demographics, allDemographics, fieldmapIntendedFor, true)
    return await validateBidsDirectory(outputDir, mappings)
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // best effort cleanup
    }
  }
}
