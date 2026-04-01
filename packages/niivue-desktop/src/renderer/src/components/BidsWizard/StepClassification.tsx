import { useEffect, useRef, useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
import type { BidsSeriesMapping, FieldmapIntendedFor } from '../../../../common/bidsTypes.js'
import { SeriesRow } from './SeriesRow.js'
import { BidsPreview } from './BidsPreview.js'

const electron = window.electron

interface StepClassificationProps {
  mappings: BidsSeriesMapping[]
  onUpdateMapping: (index: number, changes: Partial<BidsSeriesMapping>) => void
  onUpdateSidecar: (index: number, field: string, value: unknown) => void
  datasetName: string
  fieldmapIntendedFor: FieldmapIntendedFor[]
  onUpdateFieldmapMappings: (mappings: FieldmapIntendedFor[]) => void
  highlightedSeriesIndex?: number | null
  onClearHighlight?: () => void
}

export function StepClassification({
  mappings,
  onUpdateMapping,
  onUpdateSidecar,
  datasetName,
  fieldmapIntendedFor,
  onUpdateFieldmapMappings,
  highlightedSeriesIndex,
  onClearHighlight
}: StepClassificationProps): JSX.Element {
  const highlightedRowRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    if (highlightedSeriesIndex != null && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedSeriesIndex])
  const [fmapExpanded, setFmapExpanded] = useState(true)

  const fmapSeries = mappings.filter((m) => !m.excluded && m.datatype === 'fmap')
  const targetSeries = mappings.filter(
    (m) => !m.excluded && (m.datatype === 'func' || m.datatype === 'dwi')
  )
  const hasFmaps = fmapSeries.length > 0 && targetSeries.length > 0

  // Auto-suggest fieldmap mappings on mount if none are set yet
  useEffect(() => {
    if (!hasFmaps || fieldmapIntendedFor.length > 0) return
    let cancelled = false
    void (async () => {
      const suggested = await electron.bidsSuggestFieldmapMappings(mappings)
      if (!cancelled && suggested.length > 0) onUpdateFieldmapMappings(suggested)
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleTarget = (fmapIndex: number, targetIndex: number): void => {
    const updated = fieldmapIntendedFor.map((fm) => {
      if (fm.fmapIndex !== fmapIndex) return fm
      const has = fm.targetIndices.includes(targetIndex)
      return {
        ...fm,
        targetIndices: has
          ? fm.targetIndices.filter((i) => i !== targetIndex)
          : [...fm.targetIndices, targetIndex]
      }
    })
    // If no entry for this fmap yet, create one
    if (!updated.find((fm) => fm.fmapIndex === fmapIndex)) {
      updated.push({ fmapIndex, targetIndices: [targetIndex] })
    }
    onUpdateFieldmapMappings(updated)
  }

  return (
    <div className="flex gap-4">
      {/* Left: classification table */}
      <div className="flex-1 min-w-0">
        <Text size="2" weight="bold" className="block mb-2">
          Review Classifications
        </Text>
        <Text size="1" color="gray" className="block mb-3">
          Verify and edit the proposed BIDS classification for each series. Click the chevron to
          edit additional entities and sidecar metadata.
        </Text>

        <div className="overflow-auto max-h-[350px] border rounded">
          <table className="w-full text-xs">
            <thead className="bg-[var(--gray-2)] sticky top-0">
              <tr>
                <th className="py-1.5 px-1 text-left font-medium">Inc</th>
                <th className="py-1.5 px-1 text-left font-medium">Series</th>
                <th className="py-1.5 px-1 text-left font-medium">Conf</th>
                <th className="py-1.5 px-1 text-left font-medium">Datatype</th>
                <th className="py-1.5 px-1 text-left font-medium">Suffix</th>
                <th className="py-1.5 px-1 text-left font-medium">Task</th>
                <th className="py-1.5 px-1 text-left font-medium">Acq</th>
                <th className="py-1.5 px-1 text-left font-medium">Run</th>
                <th className="py-1.5 px-1 text-left font-medium w-6"></th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <SeriesRow
                  key={m.index}
                  ref={m.index === highlightedSeriesIndex ? highlightedRowRef : undefined}
                  mapping={m}
                  onUpdate={onUpdateMapping}
                  onUpdateSidecar={onUpdateSidecar}
                  highlighted={m.index === highlightedSeriesIndex}
                  onClearHighlight={onClearHighlight}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Fieldmap IntendedFor mapping panel */}
        {hasFmaps && (
          <div className="mt-3 border rounded">
            <button
              className="w-full flex items-center justify-between px-3 py-2 bg-[var(--gray-2)] hover:bg-[var(--gray-4)] text-xs font-medium"
              onClick={() => setFmapExpanded(!fmapExpanded)}
            >
              <span>Fieldmap Mappings (IntendedFor)</span>
              <span>{fmapExpanded ? '\u25B2' : '\u25BC'}</span>
            </button>
            {fmapExpanded && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <Text size="1" color="gray">
                    Map each fieldmap to the functional/DWI runs it corrects.
                  </Text>
                </div>
                {fmapSeries.map((fm) => {
                  const entry = fieldmapIntendedFor.find((f) => f.fmapIndex === fm.index)
                  return (
                    <div key={fm.index} className="mb-2 p-2 bg-[var(--gray-2)] rounded text-xs">
                      <div className="font-medium mb-1">
                        {fm.subject && <span className="text-[var(--gray-8)] font-normal">sub-{fm.subject}</span>}
                        {fm.session && <span className="text-[var(--gray-8)] font-normal">/ses-{fm.session} </span>}
                        {' '}{fm.seriesDescription || `${fm.datatype}/${fm.suffix}`}
                        {fm.dir && <span className="text-[var(--gray-9)] ml-1">(dir-{fm.dir})</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {targetSeries.map((t) => {
                          const checked = entry?.targetIndices.includes(t.index) ?? false
                          return (
                            <label key={t.index} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleTarget(fm.index, t.index)}
                                className="w-3 h-3"
                              />
                              <span className={checked ? 'text-[var(--accent-11)]' : 'text-[var(--gray-10)]'}>
                                {t.subject && <span className="text-[var(--gray-8)]">sub-{t.subject}</span>}
                                {t.session && <span className="text-[var(--gray-8)]">/ses-{t.session} </span>}
                                {t.seriesDescription || `${t.datatype}/${t.suffix}`}
                                {t.task && ` (task-${t.task})`}
                                {t.run > 0 && ` run-${t.run}`}
                                {t.niftiPath && (
                                  <span className="text-[var(--gray-8)] ml-1" title={t.niftiPath}>
                                    [{t.niftiPath.split('/').pop()}]
                                  </span>
                                )}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: BIDS tree preview */}
      <div className="w-[260px] flex-shrink-0">
        <BidsPreview mappings={mappings} datasetName={datasetName} />
      </div>
    </div>
  )
}
