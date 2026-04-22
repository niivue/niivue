// src/components/BidsFilterDialog.tsx
import { useEffect, useMemo, useState } from 'react'
import { IpcRendererEvent } from 'electron'
import type { DicomSeries, SeriesListEventPayload } from '../../../common/dcm2niixTypes.js'
import { BidsSeriesFilter } from './BidsSeriesFilter.js'

const electron = window.electron

type ConvertSeriesResp = { success: boolean; error?: string }

export function BidsFilterDialog(): JSX.Element {
  const [open, setOpen] = useState<boolean>(false)
  const [folder, setFolder] = useState<string>('')
  const [series, setSeries] = useState<DicomSeries[]>([])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const folderName = useMemo(() => folder.split(/[\\/]/).pop() ?? folder, [folder])

  useEffect((): (() => void) => {
    const onList = (_e: IpcRendererEvent, payload: SeriesListEventPayload): void => {
      setFolder(payload.folderPath)
      setSeries(payload.series)
      setChecked(new Set())
      setError('')
      setOpen(true)
    }

    electron.ipcRenderer.on('dcm2niix:series-list', onList)
    return (): void => {
      electron.ipcRenderer.removeAllListeners('dcm2niix:series-list')
    }
  }, [])

  const startConvert = async (): Promise<void> => {
    if (!folder || checked.size === 0) return
    try {
      setBusy(true)
      setError('')
      const resp = (await electron.ipcRenderer.invoke('dcm2niix:convert-series', {
        dicomDir: folder,
        seriesNumbers: Array.from(checked.values())
      })) as ConvertSeriesResp

      if (!resp?.success) {
        setError(resp?.error ?? 'Conversion failed')
        return
      }
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return <></>

  return (
    <div
      className="fixed inset-0 bg-black/40 grid place-items-center z-50"
      data-testid="bids-filter-dialog"
    >
      <div className="bg-white rounded-2xl p-4 w-[1100px] max-w-[95vw] h-[80vh] flex flex-col gap-3 shadow-xl">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-semibold">Filter DICOM Series</div>
          <div className="text-xs opacity-70 break-all ml-4 truncate" title={folder}>
            {folderName}
          </div>
        </div>

        <div className="grow min-h-0">
          <BidsSeriesFilter
            series={series}
            selectedSeriesNumbers={checked}
            onSelectionChange={setChecked}
          />
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
          <button
            onClick={startConvert}
            disabled={busy || checked.size === 0}
            data-testid="convert-selected"
          >
            {busy ? 'Converting…' : `Convert ${checked.size} Selected`}
          </button>
        </div>
      </div>
    </div>
  )
}
