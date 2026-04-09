import type { HeuristicFn } from '../../common/workflowTypes.js'
import { listDicomSeries } from './runDcm2niix.js'
import { classifyAll, detectSubjectsAndSessions, applySubjectsToMappings } from './bidsEngine.js'
import type { BidsSeriesMapping, DetectedSubject } from '../../common/bidsTypes.js'

const listDicomSeriesHeuristic: HeuristicFn = async (inputs) => {
  const dicomDir = inputs.dicom_dir as string
  return listDicomSeries(dicomDir)
}

/**
 * Find the first step output matching the given key. Lets the BIDS
 * heuristics work regardless of what the upstream dcm2niix step is named
 * (e.g. `convert`, `import_dicoms_0`, etc.).
 */
function findStepOutput<T>(
  stepOutputs: Record<string, Record<string, unknown>>,
  key: string
): T | undefined {
  for (const outputs of Object.values(stepOutputs)) {
    const value = outputs?.[key]
    if (value !== undefined) return value as T
  }
  return undefined
}

/**
 * Classify series into BIDS entities. Starts from whatever is already in
 * context.series_list (to preserve user edits), falls back to classifying
 * from whichever step produced `sidecars`. Always re-applies exclusions from
 * context.subjects so toggling a subject's excluded flag propagates to the
 * per-series view.
 */
const bidsClassifyHeuristic: HeuristicFn = async (_inputs, context, stepOutputs) => {
  let mappings = context.series_list as BidsSeriesMapping[] | undefined

  if (!mappings || mappings.length === 0) {
    const sidecars = findStepOutput<string[]>(stepOutputs, 'sidecars')
    if (!sidecars || sidecars.length === 0) return []
    mappings = classifyAll(sidecars).mappings
  }

  const subjects = context.subjects as DetectedSubject[] | undefined
  return subjects && subjects.length > 0 ? applySubjectsToMappings(mappings, subjects) : mappings
}

/**
 * Detect subjects/sessions from the sidecar metadata. Preserves any existing
 * user edits to context.subjects (exclusions, labels) and re-propagates them
 * to context.series_list via the shared helper.
 */
const detectSubjectsHeuristic: HeuristicFn = async (_inputs, context, stepOutputs) => {
  const existing = context.subjects as DetectedSubject[] | undefined
  const mappings = context.series_list as BidsSeriesMapping[] | undefined

  // Preserve user edits if we already have subjects
  if (existing && existing.length > 0) {
    if (mappings) {
      context.series_list = applySubjectsToMappings(mappings, existing)
    }
    return existing
  }

  // Prefer pre-computed subjects from whichever step produced them
  const preComputed = findStepOutput<DetectedSubject[]>(stepOutputs, 'detectedSubjects')
  if (preComputed && preComputed.length > 0) {
    if (mappings) {
      context.series_list = applySubjectsToMappings(mappings, preComputed)
    }
    return preComputed
  }

  // Fallback: detect from sidecars directly
  const sidecars = findStepOutput<string[]>(stepOutputs, 'sidecars')
  if (!sidecars || !mappings) return []
  return detectSubjectsAndSessions(sidecars, [...mappings])
}

const heuristicRegistry = new Map<string, HeuristicFn>([
  ['list-dicom-series', listDicomSeriesHeuristic],
  ['bids-classify', bidsClassifyHeuristic],
  ['detect-subjects', detectSubjectsHeuristic]
])

export function getHeuristic(name: string): HeuristicFn | undefined {
  return heuristicRegistry.get(name)
}

export function registerHeuristic(name: string, fn: HeuristicFn): void {
  heuristicRegistry.set(name, fn)
}

export function getHeuristicNames(): string[] {
  return Array.from(heuristicRegistry.keys())
}
