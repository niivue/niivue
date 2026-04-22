import { useMemo, useState } from 'react'
import type { DicomSeries } from '../../../common/dcm2niixTypes.js'

const UNKNOWN = '—'

function facetLabel(value: string | undefined): string {
  return value && value.length > 0 ? value : UNKNOWN
}

function shortUID(uid: string | undefined): string {
  if (!uid) return UNKNOWN
  if (uid.length <= 12) return uid
  return `${uid.slice(0, 8)}…${uid.slice(-4)}`
}

type FacetProps = {
  title: string
  counts: Map<string, number>
  selected: Set<string>
  onToggle: (v: string) => void
  titleHint?: string
  renderValue?: (v: string) => string
}

function FacetGroup({
  title,
  counts,
  selected,
  onToggle,
  titleHint,
  renderValue
}: FacetProps): JSX.Element {
  const entries = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase opacity-70 mb-1" title={titleHint}>
        {title}
      </div>
      <div className="flex flex-col gap-0.5">
        {entries.map(([v, n]) => {
          const checked = selected.has(v)
          return (
            <label
              key={v}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-black/5 rounded px-1"
              title={v}
            >
              <input type="checkbox" checked={checked} onChange={(): void => onToggle(v)} />
              <span className="truncate grow">{renderValue ? renderValue(v) : v}</span>
              <span className="text-xs opacity-60">{n}</span>
            </label>
          )
        })}
        {entries.length === 0 && <div className="text-xs opacity-50 px-1">none</div>}
      </div>
    </div>
  )
}

export interface BidsSeriesFilterProps {
  series: DicomSeries[]
  selectedSeriesNumbers: Set<number>
  onSelectionChange: (next: Set<number>) => void
  className?: string
}

/**
 * Three-panel faceted filter for DICOM series, Globus/Lasso-style.
 * Left: modality/subject/session facet checkboxes with counts.
 * Center: filtered series table with per-row include checkboxes.
 * Right: metadata for the active row.
 */
export function BidsSeriesFilter({
  series,
  selectedSeriesNumbers,
  onSelectionChange,
  className
}: BidsSeriesFilterProps): JSX.Element {
  const [selectedModalities, setSelectedModalities] = useState<Set<string>>(new Set())
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [activeCrc, setActiveCrc] = useState<number | null>(null)

  const modalityCounts = useMemo<Map<string, number>>(() => {
    const m = new Map<string, number>()
    for (const s of series) {
      const k = facetLabel(s.modality)
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [series])

  const subjectCounts = useMemo<Map<string, number>>(() => {
    const m = new Map<string, number>()
    for (const s of series) {
      const k = facetLabel(s.subjectId)
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [series])

  const sessionCounts = useMemo<Map<string, number>>(() => {
    const m = new Map<string, number>()
    for (const s of series) {
      const k = facetLabel(s.sessionId)
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [series])

  const filtered = useMemo<DicomSeries[]>(() => {
    return series.filter((s) => {
      if (selectedModalities.size > 0 && !selectedModalities.has(facetLabel(s.modality)))
        return false
      if (selectedSubjects.size > 0 && !selectedSubjects.has(facetLabel(s.subjectId))) return false
      if (selectedSessions.size > 0 && !selectedSessions.has(facetLabel(s.sessionId))) return false
      return true
    })
  }, [series, selectedModalities, selectedSubjects, selectedSessions])

  const activeSeries = useMemo<DicomSeries | null>(
    () => filtered.find((s) => s.seriesNumber === activeCrc) ?? null,
    [filtered, activeCrc]
  )

  const toggleSet = (set: Set<string>, v: string, setter: (s: Set<string>) => void): void => {
    const next = new Set(set)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    setter(next)
  }

  const toggleRow = (n?: number): void => {
    if (typeof n !== 'number') return
    const next = new Set(selectedSeriesNumbers)
    if (next.has(n)) next.delete(n)
    else next.add(n)
    onSelectionChange(next)
  }

  const selectAllFiltered = (): void => {
    const next = new Set(selectedSeriesNumbers)
    for (const s of filtered) {
      if (typeof s.seriesNumber === 'number') next.add(s.seriesNumber)
    }
    onSelectionChange(next)
  }

  const clearAllFiltered = (): void => {
    const next = new Set(selectedSeriesNumbers)
    for (const s of filtered) {
      if (typeof s.seriesNumber === 'number') next.delete(s.seriesNumber)
    }
    onSelectionChange(next)
  }

  return (
    <div
      className={
        'grid grid-cols-[220px_1fr_320px] gap-3 min-h-0 h-full ' + (className ?? '')
      }
      data-testid="bids-series-filter"
    >
      {/* Left: facets */}
      <div className="border rounded p-2 overflow-auto" data-testid="facet-panel">
        <FacetGroup
          title="Modality"
          counts={modalityCounts}
          selected={selectedModalities}
          onToggle={(v): void => toggleSet(selectedModalities, v, setSelectedModalities)}
        />
        <FacetGroup
          title="Subject"
          counts={subjectCounts}
          selected={selectedSubjects}
          onToggle={(v): void => toggleSet(selectedSubjects, v, setSelectedSubjects)}
          titleHint="Subject is the DICOM PatientID (or folder name when absent)"
        />
        <FacetGroup
          title="Session"
          counts={sessionCounts}
          selected={selectedSessions}
          onToggle={(v): void => toggleSet(selectedSessions, v, setSelectedSessions)}
          titleHint="DICOM has no true session tag; StudyInstanceUID is used as a proxy"
          renderValue={shortUID}
        />
      </div>

      {/* Center: table */}
      <div className="border rounded flex flex-col min-h-0" data-testid="series-panel">
        <div className="flex items-center gap-2 px-2 py-1 border-b text-xs">
          <button
            type="button"
            className="underline"
            onClick={selectAllFiltered}
            disabled={filtered.length === 0}
          >
            Check all
          </button>
          <button
            type="button"
            className="underline"
            onClick={clearAllFiltered}
            disabled={filtered.length === 0}
          >
            Uncheck all
          </button>
          <div className="ml-auto opacity-70">
            Showing {filtered.length} of {series.length}
          </div>
        </div>
        <div className="overflow-auto grow">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs">
              <tr>
                <th className="text-left px-2 py-1 w-6"></th>
                <th className="text-left px-2 py-1">Series</th>
                <th className="text-left px-2 py-1">Modality</th>
                <th className="text-left px-2 py-1">Subject</th>
                <th className="text-left px-2 py-1">Description</th>
                <th className="text-right px-2 py-1">Images</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const n = s.seriesNumber
                const disabled = typeof n !== 'number'
                const isActive = activeCrc === n
                const rowChecked = !disabled && selectedSeriesNumbers.has(n as number)
                return (
                  <tr
                    key={n ?? s.text}
                    onClick={(): void => setActiveCrc(typeof n === 'number' ? n : null)}
                    data-crc={n}
                    className={`cursor-pointer border-t ${
                      isActive ? 'bg-blue-100' : 'hover:bg-black/5'
                    }`}
                  >
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={rowChecked}
                        onClick={(e): void => e.stopPropagation()}
                        onChange={(): void => toggleRow(n)}
                      />
                    </td>
                    <td className="px-2 py-1 font-mono text-xs">{n ?? UNKNOWN}</td>
                    <td className="px-2 py-1">{facetLabel(s.modality)}</td>
                    <td className="px-2 py-1 truncate max-w-[120px]" title={s.subjectId}>
                      {facetLabel(s.subjectId)}
                    </td>
                    <td className="px-2 py-1 truncate max-w-[240px]" title={s.text}>
                      {s.seriesDescription ?? s.text}
                    </td>
                    <td className="px-2 py-1 text-right opacity-70">
                      {typeof s.images === 'number' ? s.images : ''}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-3 text-center text-xs opacity-60">
                    No series match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: metadata */}
      <div className="border rounded p-2 overflow-auto text-xs" data-testid="metadata-panel">
        {activeSeries ? (
          <dl className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1">
            <dt className="opacity-60">Series #</dt>
            <dd className="font-mono break-all">{activeSeries.seriesNumber}</dd>

            <dt className="opacity-60">Modality</dt>
            <dd>{facetLabel(activeSeries.modality)}</dd>

            <dt className="opacity-60">Subject</dt>
            <dd className="break-all">{facetLabel(activeSeries.subjectId)}</dd>

            <dt className="opacity-60">Patient ID</dt>
            <dd className="break-all">{facetLabel(activeSeries.patientId)}</dd>

            <dt className="opacity-60">Study UID</dt>
            <dd className="break-all font-mono">{facetLabel(activeSeries.studyInstanceUID)}</dd>

            <dt className="opacity-60">Series UID</dt>
            <dd className="break-all font-mono">
              {facetLabel(activeSeries.seriesInstanceUID)}
            </dd>

            <dt className="opacity-60">Description</dt>
            <dd className="break-all">{facetLabel(activeSeries.seriesDescription)}</dd>

            <dt className="opacity-60">Protocol</dt>
            <dd className="break-all">{facetLabel(activeSeries.protocolName)}</dd>

            <dt className="opacity-60">Manufacturer</dt>
            <dd>{facetLabel(activeSeries.manufacturer)}</dd>

            <dt className="opacity-60">Acquired</dt>
            <dd>{facetLabel(activeSeries.acquisitionTime)}</dd>

            <dt className="opacity-60">Images</dt>
            <dd>{typeof activeSeries.images === 'number' ? activeSeries.images : UNKNOWN}</dd>
          </dl>
        ) : (
          <div className="opacity-60">Select a row to inspect its metadata.</div>
        )}
      </div>
    </div>
  )
}
