import { useState, useMemo } from 'react'
import { Button, Text } from '@radix-ui/themes'
import type { DicomSeries } from '../../../../common/dcm2niixTypes.js'

const electron = window.electron

interface StepSelectSourceProps {
  dicomDir: string
  setDicomDir: (dir: string) => void
  series: DicomSeries[]
  setSeries: (series: DicomSeries[]) => void
  selectedSeries: Set<number>
  setSelectedSeries: (selected: Set<number>) => void
  onImportNifti?: (dir: string) => Promise<void>
}

export function StepSelectSource({
  dicomDir,
  setDicomDir,
  series,
  setSeries,
  selectedSeries,
  setSelectedSeries,
  onImportNifti
}: StepSelectSourceProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  const folderName = useMemo(() => dicomDir.split(/[\\/]/).pop() ?? dicomDir, [dicomDir])

  const allCheckable = useMemo<number[]>(
    () => series.filter((s) => typeof s.seriesNumber === 'number').map((s) => s.seriesNumber as number),
    [series]
  )

  const allChecked = useMemo(
    () => allCheckable.length > 0 && selectedSeries.size === allCheckable.length,
    [selectedSeries, allCheckable]
  )

  const handleSelectFolder = async (): Promise<void> => {
    setError('')
    try {
      const dir = await electron.ipcRenderer.invoke('select-directory') as string | null
      if (!dir) return

      setDicomDir(dir)
      setLoading(true)

      // List DICOM series using existing dcm2niix integration
      const rawSeries = await electron.headlessDcm2niixList(dir)
      const sorted = [...rawSeries].sort((a: DicomSeries, b: DicomSeries) => {
        const an = a.seriesNumber ?? Number.MAX_SAFE_INTEGER
        const bn = b.seriesNumber ?? Number.MAX_SAFE_INTEGER
        return an - bn
      })
      setSeries(sorted)
      // Select all by default
      const allNums = new Set<number>(
        sorted.filter((s: DicomSeries) => typeof s.seriesNumber === 'number').map((s: DicomSeries) => s.seriesNumber as number)
      )
      setSelectedSeries(allNums)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const toggle = (n?: number): void => {
    if (typeof n !== 'number') return
    const next = new Set<number>(selectedSeries)
    next.has(n) ? next.delete(n) : next.add(n)
    setSelectedSeries(next)
  }

  const toggleAll = (): void => {
    if (allChecked) setSelectedSeries(new Set<number>())
    else setSelectedSeries(new Set<number>(allCheckable))
  }

  const handleImportNifti = async (): Promise<void> => {
    if (!onImportNifti) return
    setError('')
    try {
      const dir = await electron.ipcRenderer.invoke('select-directory') as string | null
      if (!dir) return
      setImporting(true)
      setDicomDir(dir)
      await onImportNifti(dir)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Text size="2" weight="bold">Select Source</Text>
      <Text size="1" color="gray">
        Choose a folder containing DICOM files, or import pre-converted NIfTI+JSON pairs.
      </Text>

      <div className="flex gap-2">
        <Button variant="soft" onClick={handleSelectFolder} disabled={loading || importing}>
          {loading ? 'Scanning...' : 'Select DICOM Folder'}
        </Button>
        {onImportNifti && (
          <Button variant="outline" onClick={handleImportNifti} disabled={loading || importing}>
            {importing ? 'Importing...' : 'Import NIfTI Folder'}
          </Button>
        )}
      </div>

      {dicomDir && (
        <Text size="1" className="text-blue-700 truncate">{folderName}</Text>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {series.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <input id="bids-select-all" type="checkbox" checked={allChecked} onChange={toggleAll} />
            <label htmlFor="bids-select-all" className="text-sm cursor-pointer">
              Select all ({allCheckable.length} series)
            </label>
          </div>

          <div className="border rounded p-2 overflow-auto max-h-[250px]">
            {series.map((s, i) => {
              const n = s.seriesNumber
              const disabled = typeof n !== 'number'
              const checked = !disabled && selectedSeries.has(n as number)
              return (
                <label
                  key={`${n ?? 'na'}-${i}`}
                  className="flex items-center gap-2 py-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={checked}
                    onChange={() => toggle(n)}
                  />
                  <span className="text-sm">{s.text}</span>
                  {typeof s.images === 'number' && (
                    <span className="ml-auto text-xs opacity-60">{s.images} img</span>
                  )}
                </label>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
