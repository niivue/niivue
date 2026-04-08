import type { HeuristicFn } from '../../common/workflowTypes.js'
import { listDicomSeries } from './runDcm2niix.js'
import { classifyAll, detectSubjectsAndSessions } from './bidsEngine.js'
import type { BidsSeriesMapping } from '../../common/bidsTypes.js'

const listDicomSeriesHeuristic: HeuristicFn = async (inputs) => {
  const dicomDir = inputs.dicom_dir as string
  const series = await listDicomSeries(dicomDir)
  // Return full DicomSeries objects so the UI can show descriptions
  return series
}

const bidsClassifyHeuristic: HeuristicFn = async (_inputs, context) => {
  console.log('[bids-classify heuristic] Running...')
  let sourceMappings = context.series_list as BidsSeriesMapping[] | undefined
  console.log('[bids-classify heuristic] existing series_list:', sourceMappings?.length ?? 0)

  if (!sourceMappings || sourceMappings.length === 0) {
    // No existing mappings — classify from sidecars
    const sidecars = context._stepOutputs_convert_sidecars as string[] | undefined
    if (!sidecars || sidecars.length === 0) return []
    const result = classifyAll(sidecars)
    sourceMappings = result.mappings
  }

  // Create a new array (so React detects the change) with exclusions applied
  const subjects = context.subjects as import('../../common/bidsTypes.js').DetectedSubject[] | undefined
  console.log('[bids-classify heuristic] subjects:', subjects?.length ?? 0, 'excluded:', subjects?.filter(s => s.excluded).length ?? 0)
  const excludedIndices = new Set<number>()
  if (subjects) {
    for (const sub of subjects) {
      if (sub.excluded) {
        for (const ses of sub.sessions) {
          for (const idx of ses.seriesIndices) excludedIndices.add(idx)
        }
      } else {
        for (const ses of sub.sessions) {
          if (ses.excluded) {
            for (const idx of ses.seriesIndices) excludedIndices.add(idx)
          }
        }
      }
    }
  }

  console.log('[bids-classify heuristic] excludedIndices:', [...excludedIndices])
  return sourceMappings.map((m) => {
    if (excludedIndices.has(m.index)) {
      return { ...m, excluded: true, exclusionReason: 'Subject excluded' }
    } else if (m.exclusionReason === 'Subject excluded' || m.exclusionReason === 'Session excluded') {
      return { ...m, excluded: false, exclusionReason: undefined }
    }
    return m
  })
}

const detectSubjectsHeuristic: HeuristicFn = async (_inputs, context) => {
  // If subjects already exist in context (user may have edited exclusions), preserve them
  // and apply subject/session labels + exclusion status to series_list
  const existing = context.subjects as import('../../common/bidsTypes.js').DetectedSubject[] | undefined
  if (existing && existing.length > 0) {
    const mappings = context.series_list as BidsSeriesMapping[] | undefined
    if (mappings) {
      // Create new array with labels and exclusions applied
      const updated = mappings.map((m) => ({ ...m }))
      for (const sub of existing) {
        for (const session of sub.sessions) {
          for (const idx of session.seriesIndices) {
            if (idx < updated.length) {
              updated[idx].subject = sub.label
              updated[idx].session = session.label
              if (sub.excluded || session.excluded) {
                updated[idx].excluded = true
                updated[idx].exclusionReason = sub.excluded ? 'Subject excluded' : 'Session excluded'
              }
            }
          }
        }
      }
      context.series_list = updated
    }
    return existing
  }

  // Use pre-computed subjects from the convert step if available
  const preComputed = context._stepOutputs_convert_detectedSubjects as import('../../common/bidsTypes.js').DetectedSubject[] | undefined
  if (preComputed && preComputed.length > 0) {
    const mappings = context.series_list as BidsSeriesMapping[] | undefined
    if (mappings) {
      const updated = mappings.map((m) => ({ ...m }))
      for (const sub of preComputed) {
        for (const session of sub.sessions) {
          for (const idx of session.seriesIndices) {
            if (idx < updated.length) {
              updated[idx].subject = sub.label
              updated[idx].session = session.label
            }
          }
        }
      }
      context.series_list = updated
    }
    return preComputed
  }

  // Fallback: detect from sidecars directly
  const sidecars = context._stepOutputs_convert_sidecars as string[] | undefined
  const mappings = context.series_list as BidsSeriesMapping[] | undefined
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
