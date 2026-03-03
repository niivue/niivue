import fs from 'node:fs'
import path from 'node:path'
import type { BidsSeriesMapping, BidsDatasetConfig } from '../../common/bidsTypes.js'

// Fields added by dcm2niix that should not appear in BIDS sidecars
const INTERNAL_SIDECAR_FIELDS = new Set([
  'ConversionSoftware',
  'ConversionSoftwareVersion'
])

export function generateBidsFilename(mapping: BidsSeriesMapping): string {
  const parts: string[] = [`sub-${mapping.subject}`]

  if (mapping.session) {
    parts.push(`ses-${mapping.session}`)
  }

  if (mapping.task) {
    parts.push(`task-${mapping.task}`)
  }

  if (mapping.acq) {
    parts.push(`acq-${mapping.acq}`)
  }

  // Only add run label if there are multiple runs for this classification
  if (mapping.run > 0) {
    parts.push(`run-${String(mapping.run).padStart(2, '0')}`)
  }

  parts.push(mapping.suffix)

  return parts.join('_')
}

export function generateBidsPath(mapping: BidsSeriesMapping): string {
  const parts: string[] = [`sub-${mapping.subject}`]

  if (mapping.session) {
    parts.push(`ses-${mapping.session}`)
  }

  const subDir = path.join(...parts, mapping.datatype)
  const filename = generateBidsFilename(mapping)

  return path.join(subDir, filename)
}

function filterSidecar(sidecarPath: string): Record<string, unknown> {
  const raw = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'))
  const filtered: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(raw)) {
    if (!INTERNAL_SIDECAR_FIELDS.has(key)) {
      filtered[key] = val
    }
  }

  // Add TaskName for functional runs
  if (raw.TaskName === undefined && filtered.RepetitionTime !== undefined) {
    // TaskName will be added by the caller if needed
  }

  return filtered
}

function writeDatasetDescription(outputDir: string, config: BidsDatasetConfig): void {
  const desc = {
    Name: config.name,
    BIDSVersion: config.bidsVersion || '1.9.0',
    License: config.license || 'CC0',
    Authors: config.authors.length > 0 ? config.authors : ['Unknown'],
    GeneratedBy: [
      {
        Name: 'NiiVue Desktop',
        Description: 'BIDS conversion via NiiVue Desktop'
      }
    ]
  }
  fs.writeFileSync(path.join(outputDir, 'dataset_description.json'), JSON.stringify(desc, null, 2) + '\n')
}

function writeParticipantsTsv(outputDir: string, subjects: string[]): void {
  const unique = [...new Set(subjects)]
  const lines = ['participant_id']
  for (const sub of unique) {
    lines.push(`sub-${sub}`)
  }
  fs.writeFileSync(path.join(outputDir, 'participants.tsv'), lines.join('\n') + '\n')
}

function writeReadme(outputDir: string, config: BidsDatasetConfig): void {
  const content = `# ${config.name}

This dataset was converted to BIDS format using NiiVue Desktop.

## BIDS Version
${config.bidsVersion || '1.9.0'}
`
  fs.writeFileSync(path.join(outputDir, 'README'), content)
}

function writeBidsIgnore(outputDir: string): void {
  fs.writeFileSync(path.join(outputDir, '.bidsignore'), '')
}

export function buildBidsTree(mappings: BidsSeriesMapping[]): string[] {
  const included = mappings.filter((m) => !m.excluded)
  const paths: string[] = []
  for (const m of included) {
    const bidsBase = generateBidsPath(m)
    const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
    paths.push(bidsBase + ext)
    paths.push(bidsBase + '.json')
  }
  paths.sort()
  return paths
}

export function writeDataset(
  config: BidsDatasetConfig,
  mappings: BidsSeriesMapping[]
): { outputDir: string; filesCopied: number } {
  const outputDir = config.outputDir

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true })

  // Write top-level files
  writeDatasetDescription(outputDir, config)
  const subjects = mappings.filter((m) => !m.excluded).map((m) => m.subject)
  writeParticipantsTsv(outputDir, subjects)
  writeReadme(outputDir, config)
  writeBidsIgnore(outputDir)

  let filesCopied = 0

  // Copy NIfTI files and write filtered sidecars
  const included = mappings.filter((m) => !m.excluded)
  for (const m of included) {
    const bidsBase = generateBidsPath(m)
    const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
    const destNifti = path.join(outputDir, bidsBase + ext)
    const destJson = path.join(outputDir, bidsBase + '.json')

    // Create subdirectory
    fs.mkdirSync(path.dirname(destNifti), { recursive: true })

    // Copy NIfTI
    if (fs.existsSync(m.niftiPath)) {
      fs.copyFileSync(m.niftiPath, destNifti)
      filesCopied++
    }

    // Write filtered sidecar
    if (fs.existsSync(m.sidecarPath)) {
      const sidecar = filterSidecar(m.sidecarPath)

      // Add TaskName for func bold
      if (m.datatype === 'func' && m.task) {
        sidecar.TaskName = m.task
      }

      fs.writeFileSync(destJson, JSON.stringify(sidecar, null, 2) + '\n')
      filesCopied++
    }
  }

  return { outputDir, filesCopied }
}
