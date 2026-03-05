import fs from 'node:fs'
import path from 'node:path'
import type { BidsSeriesMapping, BidsDatasetConfig, ParticipantDemographics } from '../../common/bidsTypes.js'

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

  if (mapping.task) {
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
    const demo = allDemographics?.[sub] || demographics || { age: '', sex: '', handedness: '', group: '' }
    const values = [`sub-${sub}`, ...activeCols.map((c) => demo[c.key])]
    return values.join('\t')
  })
  fs.writeFileSync(path.join(outputDir, 'participants.tsv'), [header, ...rows].join('\n') + '\n')

  // Write participants.json describing columns
  if (activeCols.length > 0) {
    const desc: Record<string, { Description: string; Units?: string; Levels?: Record<string, string> }> = {}
    for (const c of activeCols) {
      if (c.key === 'age') desc.age = { Description: 'Age of the participant', Units: 'years' }
      else if (c.key === 'sex') desc.sex = { Description: 'Sex of the participant', Levels: { male: 'male', female: 'female', other: 'other' } }
      else if (c.key === 'handedness') desc.handedness = { Description: 'Handedness of the participant', Levels: { left: 'left', right: 'right', ambidextrous: 'ambidextrous' } }
      else if (c.key === 'group') desc.group = { Description: 'Group the participant belongs to' }
    }
    fs.writeFileSync(path.join(outputDir, 'participants.json'), JSON.stringify(desc, null, 2) + '\n')
  }
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
  mappings: BidsSeriesMapping[],
  demographics?: ParticipantDemographics,
  allDemographics?: Record<string, ParticipantDemographics>
): { outputDir: string; filesCopied: number } {
  const outputDir = config.outputDir

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
    let sidecar: Record<string, unknown>
    if (m.sidecarData) {
      sidecar = { ...m.sidecarData.original, ...m.sidecarData.overrides }
    } else if (fs.existsSync(m.sidecarPath)) {
      sidecar = filterSidecar(m.sidecarPath)
    } else {
      continue
    }

    // Add TaskName for func bold
    if (m.datatype === 'func' && m.task) {
      sidecar.TaskName = m.task
    }

    fs.writeFileSync(destJson, JSON.stringify(sidecar, null, 2) + '\n')
    filesCopied++
  }

  return { outputDir, filesCopied }
}
