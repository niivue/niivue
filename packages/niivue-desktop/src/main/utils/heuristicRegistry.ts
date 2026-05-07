import type { HeuristicFn } from '../../common/workflowTypes.js'
import { listDicomSeries } from './runDcm2niix.js'
import { classifyAll, detectSubjectsAndSessions, applySubjectsToMappings } from './bidsEngine.js'
import type { BidsSeriesMapping, DetectedSubject } from '../../common/bidsTypes.js'

const listDicomSeriesHeuristic: HeuristicFn = async (inputs, context) => {
  // Workflows started with a top-level dicom_dir input pass it via inputs;
  // designer-built workflows expose dicom_dir as a context field.
  const dicomDir = (inputs.dicom_dir as string) || (context.dicom_dir as string)
  if (!dicomDir) return []
  const all = await listDicomSeries(dicomDir)
  // Seed selected_series with all series on first run so the workflow's
  // default behavior is "convert everything"; preserve any existing user
  // selection on subsequent invocations.
  const existing = context.selected_series
  const alreadyChosen = Array.isArray(existing) && existing.length > 0
  if (!alreadyChosen) context.selected_series = [...all]
  return all
}

/**
 * Find a step output matching the given key. Walks step outputs in reverse
 * insertion order and skips empty arrays so workflows with multiple dcm2niix
 * steps (e.g. an unused initial Import DICOMs step followed by a Filter &
 * Import DICOMs step that actually produces sidecars) pick up the populated
 * later step's output rather than the earlier no-op step's empty array.
 */
function findStepOutput<T>(
  stepOutputs: Record<string, Record<string, unknown>>,
  key: string
): T | undefined {
  const entries = Object.values(stepOutputs)
  for (let i = entries.length - 1; i >= 0; i--) {
    const value = entries[i]?.[key]
    if (value === undefined) continue
    if (Array.isArray(value) && value.length === 0) continue
    return value as T
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
