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
  // If mappings already exist in context, preserve them but re-apply exclusions
  let mappings = context.series_list as BidsSeriesMapping[] | undefined

  if (!mappings || mappings.length === 0) {
    // No existing mappings — classify from sidecars
    const sidecars = context._stepOutputs_convert_sidecars as string[] | undefined
    if (!sidecars || sidecars.length === 0) return []
    const result = classifyAll(sidecars)
    mappings = result.mappings
  }

  // Always apply subject/session exclusions to mappings
  const subjects = context.subjects as import('../../common/bidsTypes.js').DetectedSubject[] | undefined
  if (subjects) {
    const excludedIndices = new Set<number>()
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
    for (const m of mappings) {
      if (excludedIndices.has(m.index)) {
        m.excluded = true
        m.exclusionReason = 'Subject excluded'
      } else if (m.exclusionReason === 'Subject excluded' || m.exclusionReason === 'Session excluded') {
        // Re-include if subject/session was un-excluded
        m.excluded = false
        m.exclusionReason = undefined
      }
    }
  }

  return mappings
}

const detectSubjectsHeuristic: HeuristicFn = async (_inputs, context) => {
  // If subjects already exist in context (user may have edited exclusions), preserve them
  // and apply subject/session labels + exclusion status to mappings
  const existing = context.subjects as import('../../common/bidsTypes.js').DetectedSubject[] | undefined
  if (existing && existing.length > 0) {
    const mappings = context.series_list as BidsSeriesMapping[] | undefined
    if (mappings) {
      for (const sub of existing) {
        for (const session of sub.sessions) {
          for (const idx of session.seriesIndices) {
            if (idx < mappings.length) {
              mappings[idx].subject = sub.label
              mappings[idx].session = session.label
              // Apply exclusion from subject/session to series
              if (sub.excluded || session.excluded) {
                mappings[idx].excluded = true
                mappings[idx].exclusionReason = sub.excluded ? 'Subject excluded' : 'Session excluded'
              }
            }
          }
        }
      }
    }
    return existing
  }

  // Use pre-computed subjects from the convert step if available (extracted from DICOM headers)
  const preComputed = context._stepOutputs_convert_detectedSubjects as import('../../common/bidsTypes.js').DetectedSubject[] | undefined
  if (preComputed && preComputed.length > 0) {
    // Apply subject/session labels to mappings if available
    const mappings = context.series_list as BidsSeriesMapping[] | undefined
    if (mappings) {
      for (const sub of preComputed) {
        for (const session of sub.sessions) {
          for (const idx of session.seriesIndices) {
            if (idx < mappings.length) {
              mappings[idx].subject = sub.label
              mappings[idx].session = session.label
            }
          }
        }
      }
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
