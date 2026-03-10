import { useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
import type { BidsSeriesMapping, EventFileConfig, EventColumnMapping } from '../../../../common/bidsTypes.js'

const electron = window.electron

const BIDS_COLUMN_OPTIONS = ['onset', 'duration', 'trial_type', 'response_time', 'stim_file', 'skip']

interface StepTaskEventsProps {
  mappings: BidsSeriesMapping[]
  onUpdateMapping: (index: number, changes: Partial<BidsSeriesMapping>) => void
}

export function StepTaskEvents({ mappings, onUpdateMapping }: StepTaskEventsProps): JSX.Element {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const boldRuns = mappings.filter(m => !m.excluded && m.datatype === 'func' && m.suffix === 'bold')

  const handleBrowse = async (mapping: BidsSeriesMapping): Promise<void> => {
    const filePath = await electron.bidsSelectEventFile()
    if (!filePath) return

    const result = await electron.bidsParseEventFile(filePath)
    if (!result.success) return

    // Auto-detect column mappings
    const columnMappings: EventColumnMapping[] = result.columns.map(col => {
      const lower = col.toLowerCase()
      if (lower === 'onset') return { sourceColumn: col, bidsColumn: 'onset' }
      if (lower === 'duration') return { sourceColumn: col, bidsColumn: 'duration' }
      if (lower === 'trial_type' || lower === 'condition') return { sourceColumn: col, bidsColumn: 'trial_type' }
      if (lower === 'response_time' || lower === 'rt') return { sourceColumn: col, bidsColumn: 'response_time' }
      return { sourceColumn: col, bidsColumn: 'skip' }
    })

    // Detect if onset values suggest milliseconds
    let convertMsToSeconds = false
    const onsetIdx = result.columns.findIndex(c => c.toLowerCase() === 'onset')
    if (onsetIdx >= 0 && result.previewRows.length > 0) {
      const firstOnset = parseFloat(result.previewRows[0][onsetIdx])
      if (!isNaN(firstOnset) && firstOnset > 100) {
        convertMsToSeconds = true
      }
    }

    const eventFile: EventFileConfig = {
      sourcePath: filePath,
      filename: filePath.split(/[\\/]/).pop() || '',
      delimiter: result.detectedDelimiter,
      convertMsToSeconds,
      columnMappings,
      detectedColumns: result.columns,
      previewRows: result.previewRows
    }

    onUpdateMapping(mapping.index, { eventFile })
    setExpandedIndex(mapping.index)
  }

  const handleRemoveEvent = (mapping: BidsSeriesMapping): void => {
    onUpdateMapping(mapping.index, { eventFile: undefined })
  }

  const handleColumnMappingChange = (mapping: BidsSeriesMapping, sourceColumn: string, bidsColumn: string): void => {
    if (!mapping.eventFile) return
    const updated = mapping.eventFile.columnMappings.map(cm =>
      cm.sourceColumn === sourceColumn ? { ...cm, bidsColumn } : cm
    )
    onUpdateMapping(mapping.index, {
      eventFile: { ...mapping.eventFile, columnMappings: updated }
    })
  }

  const handleToggleMsConvert = (mapping: BidsSeriesMapping): void => {
    if (!mapping.eventFile) return
    onUpdateMapping(mapping.index, {
      eventFile: { ...mapping.eventFile, convertMsToSeconds: !mapping.eventFile.convertMsToSeconds }
    })
  }

  const handleApplyToSameTask = (sourceMapping: BidsSeriesMapping): void => {
    if (!sourceMapping.eventFile || !sourceMapping.task) return
    for (const m of boldRuns) {
      if (m.index !== sourceMapping.index && m.task === sourceMapping.task && !m.eventFile) {
        onUpdateMapping(m.index, { eventFile: { ...sourceMapping.eventFile } })
      }
    }
  }

  if (boldRuns.length === 0) {
    return (
      <div>
        <Text size="2" weight="bold" className="block mb-2">Task Events</Text>
        <Text size="1" color="gray" className="block mb-3">
          No functional (bold) runs found. Event files are only applicable to functional runs.
        </Text>
        <Text size="1" color="gray">Click Next to continue.</Text>
      </div>
    )
  }

  return (
    <div>
      <Text size="2" weight="bold" className="block mb-2">Task Events</Text>
      <Text size="1" color="gray" className="block mb-3">
        Import timing/event files for functional runs. Event files are optional — click Next to skip.
      </Text>

      <div className="overflow-auto max-h-[400px] space-y-2">
        {boldRuns.map(m => {
          const isExpanded = expandedIndex === m.index
          const evt = m.eventFile

          return (
            <div key={m.index} className="border rounded">
              <div
                className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => setExpandedIndex(isExpanded ? null : m.index)}
              >
                <div className="text-xs">
                  <span className="font-medium">{m.seriesDescription || `bold`}</span>
                  {m.task && <span className="text-gray-500 ml-1">(task-{m.task})</span>}
                  {m.run > 0 && <span className="text-gray-500 ml-1">run-{m.run}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {evt ? (
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                      {evt.filename}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">No events</span>
                  )}
                  <span className="text-xs">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="p-3 text-xs space-y-3">
                  <div className="flex gap-2">
                    <Button size="1" variant="soft" onClick={() => handleBrowse(m)}>
                      {evt ? 'Change file...' : 'Browse...'}
                    </Button>
                    {evt && (
                      <>
                        <Button size="1" variant="soft" color="red" onClick={() => handleRemoveEvent(m)}>
                          Remove
                        </Button>
                        {m.task && (
                          <Button size="1" variant="soft" onClick={() => handleApplyToSameTask(m)}>
                            Apply to all task-{m.task} runs
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {evt && (
                    <>
                      {/* Column mapping */}
                      <div>
                        <Text size="1" weight="medium" className="block mb-1">Column Mapping</Text>
                        <div className="space-y-1">
                          {evt.columnMappings.map(cm => (
                            <div key={cm.sourceColumn} className="flex items-center gap-2">
                              <span className="w-28 text-gray-600 truncate">{cm.sourceColumn}</span>
                              <span className="text-gray-400">&rarr;</span>
                              <select
                                value={cm.bidsColumn}
                                onChange={e => handleColumnMappingChange(m, cm.sourceColumn, e.target.value)}
                                className="border rounded px-1 py-0.5 text-xs"
                              >
                                {BIDS_COLUMN_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                                {!BIDS_COLUMN_OPTIONS.includes(cm.bidsColumn) && (
                                  <option value={cm.bidsColumn}>{cm.bidsColumn}</option>
                                )}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ms to s checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={evt.convertMsToSeconds}
                          onChange={() => handleToggleMsConvert(m)}
                          className="w-3 h-3"
                        />
                        <span>Convert milliseconds to seconds (onset/duration)</span>
                      </label>

                      {/* Preview table */}
                      {evt.previewRows && evt.previewRows.length > 0 && (
                        <div>
                          <Text size="1" weight="medium" className="block mb-1">Preview (first {evt.previewRows.length} rows)</Text>
                          <div className="overflow-auto border rounded">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  {evt.detectedColumns.map(col => (
                                    <th key={col} className="py-1 px-2 text-left font-medium">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {evt.previewRows.map((row, i) => (
                                  <tr key={i} className="border-t">
                                    {row.map((cell, j) => (
                                      <td key={j} className="py-0.5 px-2">{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
