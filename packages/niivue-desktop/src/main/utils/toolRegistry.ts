import fs from 'node:fs'
import type { ToolExecutor } from '../../common/workflowTypes.js'
import { classifyAll, extractDemographics } from './bidsEngine.js'
import { validateProposedDataset } from './bidsValidator.js'
import { writeDataset } from './bidsWriter.js'
import type { BidsDatasetConfig, BidsSeriesMapping, DetectedSubject, DetectedSession, ParticipantDemographics } from '../../common/bidsTypes.js'

// ── Post-processor registry ─────────────────────────────────────────

export type PostProcessor = (outputs: Record<string, unknown>) => Record<string, unknown>

const postProcessors = new Map<string, PostProcessor>()

export function registerPostProcessor(name: string, fn: PostProcessor): void {
  postProcessors.set(name, fn)
}

export function getPostProcessor(name: string): PostProcessor | undefined {
  return postProcessors.get(name)
}

// ── Built-in post-processors ────────────────────────────────────────

/**
 * Parse dcm2niix JSON sidecars to detect unique subjects and extract demographics
 * (age, sex) from DICOM header fields (PatientID, PatientAge, PatientSex, etc.).
 */
function extractSubjectsFromSidecars(sidecarPaths: string[]): DetectedSubject[] {
  const subjectMap = new Map<string, { sidecarPath: string; indices: number[]; dates: Map<string, number[]> }>()

  for (let i = 0; i < sidecarPaths.length; i++) {
    try {
      const raw = fs.readFileSync(sidecarPaths[i], 'utf-8')
      const sidecar = JSON.parse(raw)
      const patientId = String(sidecar.PatientID || sidecar.PatientName || 'unknown').trim()
      const acqDate = String(sidecar.AcquisitionDate || sidecar.AcquisitionDateTime || sidecar.StudyDate || '').trim()

      if (!subjectMap.has(patientId)) {
        subjectMap.set(patientId, { sidecarPath: sidecarPaths[i], indices: [], dates: new Map() })
      }
      const entry = subjectMap.get(patientId)!
      entry.indices.push(i)

      const dateKey = acqDate || 'nodate'
      if (!entry.dates.has(dateKey)) {
        entry.dates.set(dateKey, [])
      }
      entry.dates.get(dateKey)!.push(i)
    } catch {
      // Skip unreadable sidecars
    }
  }

  const subjects: DetectedSubject[] = []
  let subjectIndex = 1

  for (const [rawId, entry] of subjectMap) {
    const label = String(subjectIndex).padStart(2, '0')
    const demographics = extractDemographics(entry.sidecarPath)
    const hasMultipleSessions = entry.dates.size > 1

    const sessions: DetectedSession[] = []
    let sessionIndex = 1
    for (const [rawDate, indices] of entry.dates) {
      sessions.push({
        rawDate: rawDate === 'nodate' ? '' : rawDate,
        label: hasMultipleSessions ? String(sessionIndex).padStart(2, '0') : '',
        seriesIndices: indices
      })
      sessionIndex++
    }

    subjects.push({ rawId, label, demographics, sessions })
    subjectIndex++
  }

  return subjects
}

registerPostProcessor('dcm2niix-extract-subjects', (outputs) => {
  const sidecars = outputs.sidecars as string[] | undefined
  if (sidecars && sidecars.length > 0) {
    return { ...outputs, detectedSubjects: extractSubjectsFromSidecars(sidecars) }
  }
  return outputs
})

// ── Built-in tool executors (pure TypeScript, no CLI) ───────────────

const bidsClassifyExecutor: ToolExecutor = async (inputs) => {
  const sidecars = inputs.sidecars as string[]
  const overrides = inputs.overrides as BidsSeriesMapping[] | undefined

  const { mappings, detectedSubjects } = classifyAll(sidecars)

  // Apply user overrides if provided
  if (overrides && Array.isArray(overrides)) {
    for (const override of overrides) {
      const existing = mappings.find((m) => m.index === override.index)
      if (existing) {
        Object.assign(existing, override)
      }
    }
  }

  return { mappings, subjects: detectedSubjects }
}

const bidsValidateExecutor: ToolExecutor = async (inputs) => {
  const mappings = inputs.mappings as BidsSeriesMapping[]
  const context = inputs.config as Record<string, unknown>

  const config: BidsDatasetConfig = {
    name: (context.dataset_name as string) || '',
    bidsVersion: (context.dataset_version as string) || '1.9.0',
    license: (context.license as string) || 'CC0',
    authors: (context.authors as string || '').split(',').map((a: string) => a.trim()).filter(Boolean),
    readme: (context.readme as string) || '',
    outputDir: (context.output_dir as string) || ''
  }

  const result = validateProposedDataset(config, mappings)
  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings
  }
}

const bidsWriteExecutor: ToolExecutor = async (inputs) => {
  const mappings = inputs.mappings as BidsSeriesMapping[]
  const context = inputs.config as Record<string, unknown>

  const config: BidsDatasetConfig = {
    name: (context.dataset_name as string) || '',
    bidsVersion: (context.dataset_version as string) || '1.9.0',
    license: (context.license as string) || 'CC0',
    authors: (context.authors as string || '').split(',').map((a: string) => a.trim()).filter(Boolean),
    readme: (context.readme as string) || '',
    outputDir: (context.output_dir as string) || ''
  }

  // Build demographics map from detected subjects in context
  const subjects = context.subjects as DetectedSubject[] | undefined
  let allDemographics: Record<string, ParticipantDemographics> | undefined
  if (subjects && subjects.length > 0) {
    allDemographics = {}
    for (const sub of subjects) {
      if (!sub.excluded) {
        allDemographics[sub.label] = sub.demographics
      }
    }
  }

  const fieldmapIntendedFor = context._fieldmapIntendedFor as import('../../common/bidsTypes.js').FieldmapIntendedFor[] | undefined

  const result = writeDataset(config, mappings, undefined, allDemographics, fieldmapIntendedFor)
  return {
    bids_dir: result.outputDir,
    files_copied: result.filesCopied
  }
}

// ── Tool executor registry ──────────────────────────────────────────

const toolExecutors = new Map<string, ToolExecutor>([
  ['bids-classify', bidsClassifyExecutor],
  ['bids-validate', bidsValidateExecutor],
  ['bids-write', bidsWriteExecutor]
])

export function getToolExecutor(name: string): ToolExecutor | undefined {
  return toolExecutors.get(name)
}

export function registerToolExecutor(name: string, executor: ToolExecutor): void {
  toolExecutors.set(name, executor)
}
