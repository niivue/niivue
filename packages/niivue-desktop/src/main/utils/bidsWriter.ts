import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type {
  BidsSeriesMapping,
  BidsDatasetConfig,
  ParticipantDemographics,
  FieldmapIntendedFor
} from '../../common/bidsTypes.js'

// Fields added by dcm2niix that should not appear in BIDS sidecars
export const INTERNAL_SIDECAR_FIELDS = new Set([
  'ConversionSoftware',
  'ConversionSoftwareVersion',
  'PatientName',
  'PatientID',
  'PatientBirthDate',
  'PatientAge',
  'PatientSex',
  'PatientWeight',
  'SeriesInstanceUID',
  'StudyInstanceUID'
])

export function generateBidsFilename(mapping: BidsSeriesMapping): string {
  const parts: string[] = [`sub-${mapping.subject}`]

  if (mapping.session) {
    parts.push(`ses-${mapping.session}`)
  }

  if (mapping.task && mapping.datatype !== 'fmap') {
    parts.push(`task-${mapping.task}`)
  }

  if (mapping.acq) {
    parts.push(`acq-${mapping.acq}`)
  }

  if (mapping.ce) {
    parts.push(`ce-${mapping.ce}`)
  }

  if (mapping.rec) {
    parts.push(`rec-${mapping.rec}`)
  }

  if (mapping.dir) {
    parts.push(`dir-${mapping.dir}`)
  }

  // Only add run label if there are multiple runs for this classification
  if (mapping.run > 0) {
    parts.push(`run-${String(mapping.run).padStart(2, '0')}`)
  }

  if (mapping.echo > 0) {
    parts.push(`echo-${mapping.echo}`)
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

export function resolveIntendedForPaths(
  mappings: BidsSeriesMapping[],
  fieldmapMappings: FieldmapIntendedFor[]
): BidsSeriesMapping[] {
  const updated = mappings.map((m) => ({ ...m }))
  const byIndex = new Map(updated.map((m) => [m.index, m]))

  for (const fm of fieldmapMappings) {
    const fmap = byIndex.get(fm.fmapIndex)
    if (!fmap || fmap.excluded) continue

    const paths: string[] = []
    for (const targetIdx of fm.targetIndices) {
      const target = byIndex.get(targetIdx)
      if (!target || target.excluded) continue

      // BIDS 1.7+: IntendedFor is relative to subject root
      const bidsBase = generateBidsPath(target)
      const ext = target.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
      // Remove the sub-XX/ prefix to make it relative to subject root
      const subPrefix = `sub-${target.subject}/`
      const fullPath = bidsBase + ext
      const relativePath = fullPath.startsWith(subPrefix)
        ? fullPath.slice(subPrefix.length)
        : fullPath
      paths.push(relativePath)
    }

    fmap.intendedFor = paths
  }

  return updated
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
  fs.writeFileSync(
    path.join(outputDir, 'dataset_description.json'),
    JSON.stringify(desc, null, 2) + '\n'
  )
}

function writeParticipantsTsv(
  outputDir: string,
  subjects: string[],
  demographics?: ParticipantDemographics,
  allDemographics?: Record<string, ParticipantDemographics>
): void {
  const unique = [...new Set(subjects)]

  const cols: { key: keyof ParticipantDemographics; label: string }[] = [
    { key: 'age', label: 'age' },
    { key: 'sex', label: 'sex' },
    { key: 'handedness', label: 'handedness' },
    { key: 'group', label: 'group' }
  ]

  // Determine which columns have any values across all subjects
  const hasValue = (key: keyof ParticipantDemographics): boolean => {
    if (allDemographics) {
      return Object.values(allDemographics).some((d) => d[key] !== '')
    }
    return demographics ? demographics[key] !== '' : false
  }
  const activeCols = cols.filter((c) => hasValue(c.key))

  // Write TSV
  const header = ['participant_id', ...activeCols.map((c) => c.label)].join('\t')
  const rows = unique.map((sub) => {
    const demo = allDemographics?.[sub] ||
      demographics || { age: '', sex: '', handedness: '', group: '' }
    const values = [`sub-${sub}`, ...activeCols.map((c) => demo[c.key])]
    return values.join('\t')
  })
  fs.writeFileSync(path.join(outputDir, 'participants.tsv'), [header, ...rows].join('\n') + '\n')

  // Write participants.json describing columns
  if (activeCols.length > 0) {
    const desc: Record<
      string,
      { Description: string; Units?: string; Levels?: Record<string, string> }
    > = {}
    for (const c of activeCols) {
      if (c.key === 'age') desc.age = { Description: 'Age of the participant', Units: 'year' }
      else if (c.key === 'sex')
        desc.sex = {
          Description: 'Sex of the participant',
          Levels: { M: 'male', F: 'female', O: 'other' }
        }
      else if (c.key === 'handedness')
        desc.handedness = {
          Description: 'Handedness of the participant',
          Levels: { left: 'left', right: 'right', ambidextrous: 'ambidextrous' }
        }
      else if (c.key === 'group') desc.group = { Description: 'Group the participant belongs to' }
    }
    fs.writeFileSync(
      path.join(outputDir, 'participants.json'),
      JSON.stringify(desc, null, 2) + '\n'
    )
  }
}

function writeReadme(outputDir: string, config: BidsDatasetConfig): void {
  const content = config.readme?.trim()
    ? config.readme
    : `# ${config.name}

This dataset was converted to BIDS format using NiiVue Desktop.

## BIDS Version
${config.bidsVersion || '1.9.0'}
`
  fs.writeFileSync(path.join(outputDir, 'README.md'), content)
}

function writeBidsIgnore(outputDir: string): void {
  fs.writeFileSync(
    path.join(outputDir, '.bidsignore'),
    '.Trash/\n.Trash-*/\n.DS_Store\n.Spotlight-V100/\n.fseventsd/\n'
  )
}

export function buildBidsTree(mappings: BidsSeriesMapping[]): string[] {
  const included = mappings.filter((m) => !m.excluded)
  const paths: string[] = []
  for (const m of included) {
    const bidsBase = generateBidsPath(m)
    const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
    paths.push(bidsBase + ext)
    paths.push(bidsBase + '.json')
    if (m.datatype === 'func' && m.suffix === 'bold' && m.eventFile) {
      paths.push(bidsBase + '_events.tsv')
    }
  }
  paths.sort()
  return paths
}

function writeEventFile(
  eventFile: import('../../common/bidsTypes.js').EventFileConfig,
  destPath: string
): void {
  const content = fs.readFileSync(eventFile.sourcePath, 'utf-8')
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return

  const splitLine = (line: string): string[] => {
    if (eventFile.delimiter === 'whitespace') {
      return line.trim().split(/\s+/)
    }
    return line.split(eventFile.delimiter)
  }

  const sourceColumns = splitLine(lines[0]).map((c) => c.trim())

  // Build column index mapping: sourceCol -> bidsCol
  const colMap = new Map<number, string>()
  for (const cm of eventFile.columnMappings) {
    if (cm.bidsColumn === 'skip') continue
    const srcIdx = sourceColumns.indexOf(cm.sourceColumn)
    if (srcIdx >= 0) {
      colMap.set(srcIdx, cm.bidsColumn)
    }
  }

  if (colMap.size === 0) return

  // Determine output column order: onset, duration first, then rest
  const bidsColNames = [...colMap.values()]
  const ordered: string[] = []
  if (bidsColNames.includes('onset')) ordered.push('onset')
  if (bidsColNames.includes('duration')) ordered.push('duration')
  for (const c of bidsColNames) {
    if (c !== 'onset' && c !== 'duration' && !ordered.includes(c)) {
      ordered.push(c)
    }
  }

  // Reverse map: bidsCol -> sourceIdx
  const bidsToSrc = new Map<string, number>()
  for (const [srcIdx, bidsCol] of colMap) {
    bidsToSrc.set(bidsCol, srcIdx)
  }

  const outputLines: string[] = [ordered.join('\t')]

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]).map((c) => c.trim())
    const row: string[] = []
    for (const col of ordered) {
      const srcIdx = bidsToSrc.get(col)
      let val = srcIdx != null && srcIdx < cells.length ? cells[srcIdx] : 'n/a'
      // Convert ms to seconds for onset and duration
      if (eventFile.convertMsToSeconds && (col === 'onset' || col === 'duration')) {
        const num = parseFloat(val)
        if (!isNaN(num)) {
          val = (num / 1000).toFixed(3)
        }
      }
      row.push(val)
    }
    outputLines.push(row.join('\t'))
  }

  fs.writeFileSync(destPath, outputLines.join('\n') + '\n')
}

export function writeDataset(
  config: BidsDatasetConfig,
  mappings: BidsSeriesMapping[],
  demographics?: ParticipantDemographics,
  allDemographics?: Record<string, ParticipantDemographics>,
  fieldmapIntendedFor?: FieldmapIntendedFor[],
  skipExcluded?: boolean
): { outputDir: string; filesCopied: number } {
  // Create a subdirectory named after the dataset to avoid writing into a broad parent directory
  const sanitizedName = (config.name || 'bids-dataset').replace(/[^a-zA-Z0-9_-]/g, '_')
  const baseDir = config.outputDir || path.join(os.tmpdir(), 'niivue-bids-output')
  const outputDir = path.join(baseDir, sanitizedName)

  // Resolve IntendedFor paths on fmap mappings
  if (fieldmapIntendedFor && fieldmapIntendedFor.length > 0) {
    mappings = resolveIntendedForPaths(mappings, fieldmapIntendedFor)
  }

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true })

  // Write top-level files
  writeDatasetDescription(outputDir, config)
  const subjects = mappings.filter((m) => !m.excluded).map((m) => m.subject)
  writeParticipantsTsv(outputDir, subjects, demographics, allDemographics)
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

    // Write sidecar: use sidecarData with overrides if available, else filter from disk
    // Strip BidsGuess — it's a dcm2niix internal field, not valid BIDS sidecar content
    let sidecar: Record<string, unknown>
    if (m.sidecarData) {
      const { BidsGuess: _bg, ...rest } = m.sidecarData.original as Record<string, unknown> & { BidsGuess?: unknown }
      sidecar = { ...rest, ...m.sidecarData.overrides }
    } else if (fs.existsSync(m.sidecarPath)) {
      sidecar = filterSidecar(m.sidecarPath)
    } else {
      continue
    }

    // Add TaskName for func bold
    if (m.datatype === 'func' && m.task) {
      sidecar.TaskName = m.task
    }

    // Add IntendedFor for fmap series
    if (m.datatype === 'fmap' && m.intendedFor && m.intendedFor.length > 0) {
      sidecar.IntendedFor = m.intendedFor
    }

    fs.writeFileSync(destJson, JSON.stringify(sidecar, null, 2) + '\n')
    filesCopied++

    // Write event file for func/bold with eventFile config
    if (m.datatype === 'func' && m.suffix === 'bold' && m.eventFile) {
      const evtDest = path.join(outputDir, bidsBase + '_events.tsv')
      writeEventFile(m.eventFile, evtDest)
      filesCopied++
    }
  }

  // Write excluded series to sourcedata/ (BIDS-compliant location for non-BIDS data)
  if (skipExcluded) return { outputDir, filesCopied }
  const excluded = mappings.filter((m) => m.excluded)
  for (let i = 0; i < excluded.length; i++) {
    const m = excluded[i]
    const sanitizedDesc = (m.seriesDescription || 'unknown').replace(/[^a-zA-Z0-9]/g, '')
    const baseName = `sub-${m.subject}${m.task ? `_task-${m.task}` : ''}_desc-${sanitizedDesc}_${i}_excluded`
    const excludedDir = path.join(outputDir, 'sourcedata', `sub-${m.subject}`)
    fs.mkdirSync(excludedDir, { recursive: true })

    const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
    if (fs.existsSync(m.niftiPath)) {
      fs.copyFileSync(m.niftiPath, path.join(excludedDir, baseName + ext))
      filesCopied++
    }

    // Write sidecar (strip BidsGuess — dcm2niix internal, not valid BIDS)
    let sidecar: Record<string, unknown>
    if (m.sidecarData) {
      const { BidsGuess: _bg, ...rest } = m.sidecarData.original as Record<string, unknown> & { BidsGuess?: unknown }
      sidecar = { ...rest, ...m.sidecarData.overrides }
    } else if (fs.existsSync(m.sidecarPath)) {
      sidecar = filterSidecar(m.sidecarPath)
    } else {
      continue
    }
    fs.writeFileSync(
      path.join(excludedDir, baseName + '.json'),
      JSON.stringify(sidecar, null, 2) + '\n'
    )
    filesCopied++
  }

  return { outputDir, filesCopied }
}
