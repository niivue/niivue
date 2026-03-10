import type { BidsSeriesMapping, BidsDatasetConfig, BidsValidationResult, BidsValidationIssue } from '../../common/bidsTypes.js'
import { generateBidsFilename } from './bidsWriter.js'

// BIDS naming pattern: sub-<label>[_ses-<label>][_task-<label>][_acq-<label>][_ce-<label>][_rec-<label>][_dir-<label>][_run-<index>][_echo-<index>]_<suffix>
const BIDS_FILENAME_RE = /^sub-[a-zA-Z0-9]+(_ses-[a-zA-Z0-9]+)?(_task-[a-zA-Z0-9]+)?(_acq-[a-zA-Z0-9]+)?(_ce-[a-zA-Z0-9]+)?(_rec-[a-zA-Z0-9]+)?(_dir-[a-zA-Z0-9]+)?(_run-[0-9]+)?(_echo-[0-9]+)?_[a-zA-Z0-9]+$/

const REQUIRED_TASK_DATATYPES = new Set(['func'])

export function validateProposedDataset(
  config: BidsDatasetConfig,
  mappings: BidsSeriesMapping[]
): BidsValidationResult {
  const errors: BidsValidationIssue[] = []
  const warnings: BidsValidationIssue[] = []
  const included = mappings.filter((m) => !m.excluded)

  // Check dataset config
  if (!config.name || config.name.trim() === '') {
    errors.push({ severity: 'error', message: 'Dataset name is required' })
  }

  if (!config.outputDir || config.outputDir.trim() === '') {
    errors.push({ severity: 'error', message: 'Output directory is required' })
  }

  if (included.length === 0) {
    errors.push({ severity: 'error', message: 'No series selected for conversion' })
    return { valid: false, errors, warnings }
  }

  // Check each mapping
  for (const m of included) {
    const filename = generateBidsFilename(m)

    // Validate filename format
    if (!BIDS_FILENAME_RE.test(filename)) {
      errors.push({
        severity: 'error',
        message: `Invalid BIDS filename: "${filename}"`,
        file: filename
      })
    }

    // Subject label required
    if (!m.subject || m.subject.trim() === '') {
      errors.push({
        severity: 'error',
        message: `Subject label is required for series "${m.seriesDescription}"`,
        file: filename
      })
    }

    // Subject label must be alphanumeric
    if (m.subject && !/^[a-zA-Z0-9]+$/.test(m.subject)) {
      errors.push({
        severity: 'error',
        message: `Subject label must be alphanumeric: "${m.subject}"`,
        file: filename
      })
    }

    // Session label must be alphanumeric if provided
    if (m.session && !/^[a-zA-Z0-9]+$/.test(m.session)) {
      errors.push({
        severity: 'error',
        message: `Session label must be alphanumeric: "${m.session}"`,
        file: filename
      })
    }

    // Task label required for func
    if (REQUIRED_TASK_DATATYPES.has(m.datatype) && m.suffix === 'bold' && !m.task) {
      errors.push({
        severity: 'error',
        message: `Task label is required for ${m.datatype}/${m.suffix}: "${m.seriesDescription}"`,
        file: filename
      })
    }

    // Task label must be alphanumeric
    if (m.task && !/^[a-zA-Z0-9]+$/.test(m.task)) {
      errors.push({
        severity: 'error',
        message: `Task label must be alphanumeric: "${m.task}"`,
        file: filename
      })
    }

    // ce label must be alphanumeric
    if (m.ce && !/^[a-zA-Z0-9]+$/.test(m.ce)) {
      errors.push({
        severity: 'error',
        message: `CE label must be alphanumeric: "${m.ce}"`,
        file: filename
      })
    }

    // rec label must be alphanumeric
    if (m.rec && !/^[a-zA-Z0-9]+$/.test(m.rec)) {
      errors.push({
        severity: 'error',
        message: `Rec label must be alphanumeric: "${m.rec}"`,
        file: filename
      })
    }

    // dir label must be alphanumeric
    if (m.dir && !/^[a-zA-Z0-9]+$/.test(m.dir)) {
      errors.push({
        severity: 'error',
        message: `Dir label must be alphanumeric: "${m.dir}"`,
        file: filename
      })
    }

    // Confidence warnings
    if (m.confidence === 'low') {
      warnings.push({
        severity: 'warning',
        message: `Low confidence classification for "${m.seriesDescription}" — please verify`,
        file: filename
      })
    }
  }

  // Check fmap series for IntendedFor
  const hasFmaps = included.some(m => m.datatype === 'fmap')
  if (hasFmaps) {
    for (const m of included) {
      if (m.datatype === 'fmap' && (!m.intendedFor || m.intendedFor.length === 0)) {
        const fn = generateBidsFilename(m)
        warnings.push({
          severity: 'warning',
          message: `Fieldmap "${m.seriesDescription}" has no IntendedFor mapping`,
          file: fn
        })
      }
    }
  }

  // Check func/bold for event files and validate event column mappings
  for (const m of included) {
    if (m.datatype === 'func' && m.suffix === 'bold' && !m.eventFile && m.task !== 'rest') {
      const fn = generateBidsFilename(m)
      warnings.push({
        severity: 'warning',
        message: `Functional run "${m.seriesDescription}" has no event file`,
        file: fn
      })
    }
    if (m.eventFile) {
      const fn = generateBidsFilename(m)
      const bidsColumns = m.eventFile.columnMappings.map(cm => cm.bidsColumn)
      if (!bidsColumns.includes('onset')) {
        errors.push({
          severity: 'error',
          message: `Event file for "${m.seriesDescription}" is missing onset column mapping`,
          file: fn
        })
      }
      if (!bidsColumns.includes('duration')) {
        errors.push({
          severity: 'error',
          message: `Event file for "${m.seriesDescription}" is missing duration column mapping`,
          file: fn
        })
      }
    }
  }

  // Check for duplicate filenames
  const filenames = new Map<string, number>()
  for (const m of included) {
    const filename = generateBidsFilename(m)
    filenames.set(filename, (filenames.get(filename) || 0) + 1)
  }
  for (const [name, count] of filenames) {
    if (count > 1) {
      errors.push({
        severity: 'error',
        message: `Duplicate BIDS filename: "${name}" appears ${count} times`,
        file: name
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
