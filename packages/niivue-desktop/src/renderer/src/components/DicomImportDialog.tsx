// src/components/DicomImportDialog.tsx
import { useEffect, useMemo, useState } from 'react'
import { IpcRendererEvent } from 'electron'
import type { DicomSeries, SeriesListEventPayload } from '../../../common/dcm2niixTypes.js'

const electron = window.electron

type ConvertSeriesResp = { success: boolean; error?: string }

export function DicomImportDialog(): JSX.Element {
  const [open, setOpen] = useState<boolean>(false)
  const [folder, setFolder] = useState<string>('')
  const [series, setSeries] = useState<DicomSeries[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const folderName = useMemo(() => folder.split(/[\\/]/).pop() ?? folder, [folder])

  useEffect((): (() => void) => {
    const onList = (_e: IpcRendererEvent, payload: SeriesListEventPayload): void => {
      setFolder(payload.folderPath)
      const sorted = [...payload.series].sort((a, b) => {
        const an = a.seriesNumber ?? Number.MAX_SAFE_INTEGER
        const bn = b.seriesNumber ?? Number.MAX_SAFE_INTEGER
        if (an !== bn) return an - bn
        return (b.images ?? 0) - (a.images ?? 0)
      })
      setSeries(sorted)
      setSelected(new Set())
      setError('')
      setOpen(true)
    }

    electron.ipcRenderer.on('dcm2niix:series-list', onList)
    return (): void => {
      electron.ipcRenderer.removeAllListeners('dcm2niix:series-list')
    }
  }, [])

  const allCheckable = useMemo<number[]>(
    (): number[] =>
      series.filter((s) => typeof s.seriesNumber === 'number').map((s) => s.seriesNumber as number),
    [series]
  )

  const allChecked = useMemo<boolean>(
    (): boolean => allCheckable.length > 0 && selected.size === allCheckable.length,
    [selected, allCheckable]
  )

  const toggle = (n?: number): void => {
    if (typeof n !== 'number') return
    const next = new Set<number>(selected)
    next.has(n) ? next.delete(n) : next.add(n)
    setSelected(next)
  }

  const toggleAll = (): void => {
    if (allChecked) setSelected(new Set<number>())
    else setSelected(new Set<number>(allCheckable))
  }

  const startConvert = async (): Promise<void> => {
    if (!folder || selected.size === 0) return
    try {
      setBusy(true)
      setError('')
      const resp = (await electron.ipcRenderer.invoke('dcm2niix:convert-series', {
        dicomDir: folder,
        seriesNumbers: Array.from(selected.values())
        // options omitted; main uses %f_%p_%t_%s + defaults
      })) as ConvertSeriesResp

      if (!resp?.success) {
        setError(resp?.error ?? 'Conversion failed')
        return
      }
      // main will emit 'loadVolume' with each NIfTI path; existing handler will load them
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return <></>

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="bg-white rounded-2xl p-4 w-[720px] max-h-[80vh] flex flex-col gap-3 shadow-xl">
        <div className="text-lg font-semibold">Import DICOM Series</div>
        <div className="text-xs opacity-70 break-all">{folderName}</div>

        <div className="flex items-center gap-2">
          <input id="select-all" type="checkbox" checked={allChecked} onChange={toggleAll} />
          <label htmlFor="select-all" className="text-sm cursor-pointer">
            Select all
          </label>
        </div>

        <div className="border rounded p-2 overflow-auto grow">
          {series.map((s, i) => {
            const n = s.seriesNumber
            const label = s.text // MRIcroGL: %f_%p_%t_%s
            const disabled = typeof n !== 'number'
            const checked = !disabled && selected.has(n as number)
            return (
              <label
                key={`${n ?? 'na'}-${i}`}
                className="flex items-center gap-2 py-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={checked}
                  onChange={(): void => toggle(n)}
                />
                <span className="text-sm">{label}</span>
                {typeof s.images === 'number' && (
                  <span className="ml-auto text-xs opacity-60">{s.images} img</span>
                )}
              </label>
            )
          })}
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={(): void => setOpen(false)} disabled={busy}>
            Cancel
          </button>
          <button onClick={startConvert} disabled={busy || selected.size === 0}>
            {busy ? 'Converting…' : 'Import Selected'}
          </button>
        </div>
      </div>
    </div>
  )
}
