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
  const sidecars = context._stepOutputs_convert_sidecars as string[] | undefined
  if (!sidecars || sidecars.length === 0) return []
  const { mappings } = classifyAll(sidecars)
  return mappings
}

const detectSubjectsHeuristic: HeuristicFn = async (_inputs, context) => {
  // Use pre-computed subjects from the convert step if available (extracted from DICOM headers)
  const preComputed = context._stepOutputs_convert_detectedSubjects as import('../../common/bidsTypes.js').DetectedSubject[] | undefined
  if (preComputed && preComputed.length > 0) {
    // Still need to apply subject/session labels to mappings
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
