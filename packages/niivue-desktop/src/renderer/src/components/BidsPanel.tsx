import React, { useEffect, useState } from 'react'
import { Text, ScrollArea } from '@radix-ui/themes'
import type { BidsSeriesMapping } from '../../../common/bidsTypes.js'

const electron = window.electron

interface BidsPanelProps {
  mappings: BidsSeriesMapping[]
}

// Key sidecar fields to display, grouped
const SIDECAR_SECTIONS: { label: string; keys: string[] }[] = [
  {
    label: 'Acquisition',
    keys: [
      'Modality',
      'MagneticFieldStrength',
      'Manufacturer',
      'ManufacturersModelName',
      'MRAcquisitionType',
      'PulseSequenceName',
      'ScanningSequence',
      'SequenceVariant'
    ]
  },
  {
    label: 'Timing',
    keys: [
      'RepetitionTime',
      'EchoTime',
      'FlipAngle',
      'AcquisitionDuration',
      'SliceThickness',
      'SpacingBetweenSlices'
    ]
  },
  {
    label: 'Encoding',
    keys: [
      'PhaseEncodingAxis',
      'PhaseEncodingSteps',
      'FrequencyEncodingSteps',
      'AcquisitionMatrixPE',
      'ParallelReductionFactorInPlane',
      'ParallelAcquisitionTechnique',
      'EstimatedEffectiveEchoSpacing',
      'EstimatedTotalReadoutTime',
      'PixelBandwidth',
      'WaterFatShift'
    ]
  },
  {
    label: 'Series',
    keys: [
      'SeriesDescription',
      'ProtocolName',
      'SeriesNumber',
      'StudyDescription',
      'ImageType',
      'BidsGuess'
    ]
  }
]

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-'
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'number') {
    // Show up to 6 decimal places, trim trailing zeros
    return Number.isInteger(val) ? String(val) : val.toPrecision(6).replace(/\.?0+$/, '')
  }
  return String(val)
}

export function BidsPanel({ mappings }: BidsPanelProps): JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [sidecar, setSidecar] = useState<Record<string, unknown> | null>(null)
  const [loadError, setLoadError] = useState('')

  const included = mappings.filter((m) => !m.excluded)
  const selected = included[selectedIndex] ?? included[0]

  // Load sidecar JSON when selection changes
  useEffect(() => {
    if (!selected?.sidecarPath) {
      setSidecar(null)
      return
    }

    let cancelled = false
    const load = async (): Promise<void> => {
      try {
        setLoadError('')
        const buf = await electron.ipcRenderer.invoke('read-file-as-buffer', selected.sidecarPath)
        if (cancelled || !buf) return
        const text = new TextDecoder().decode(buf)
        setSidecar(JSON.parse(text))
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err))
          setSidecar(null)
        }
      }
    }
    void load()
    return (): void => { cancelled = true }
  }, [selected?.sidecarPath])

  if (mappings.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-1">
        <Text size="1" color="gray">
          No BIDS data loaded. Use Import &gt; Convert DICOM to BIDS to get started.
        </Text>
      </div>
    )
  }

  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <div className="flex flex-col gap-3 p-1">
        {/* Series selector */}
        {included.length > 1 && (
          <div>
            <Text size="1" weight="bold" className="block mb-1">
              Series ({included.length})
            </Text>
            <div className="border rounded max-h-[120px] overflow-auto">
              {included.map((m, i) => (
                <button
                  key={m.index}
                  onClick={() => setSelectedIndex(i)}
                  className={`block w-full text-left px-2 py-1 text-[11px] border-b last:border-b-0 transition-colors ${
                    i === selectedIndex
                      ? 'bg-blue-50 text-blue-800'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate block" title={m.seriesDescription}>
                    {m.seriesDescription || '(unknown)'}
                  </span>
                  <span className="text-gray-400 text-[10px]">
                    {m.datatype}/{m.suffix}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Classification info */}
        {selected && (
          <div>
            <Text size="1" weight="bold" className="block mb-1">Classification</Text>
            <div className="bg-gray-50 rounded border border-gray-200 p-2 text-[11px]">
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <span className="text-gray-500">Datatype</span>
                <span className="font-medium">{selected.datatype}</span>
                <span className="text-gray-500">Suffix</span>
                <span className="font-medium">{selected.suffix}</span>
                {selected.task && (
                  <>
                    <span className="text-gray-500">Task</span>
                    <span>{selected.task}</span>
                  </>
                )}
                {selected.acq && (
                  <>
                    <span className="text-gray-500">Acq</span>
                    <span>{selected.acq}</span>
                  </>
                )}
                <span className="text-gray-500">Run</span>
                <span>{selected.run}</span>
                <span className="text-gray-500">Confidence</span>
                <span className={
                  selected.confidence === 'high' ? 'text-green-700' :
                  selected.confidence === 'medium' ? 'text-yellow-700' : 'text-red-700'
                }>
                  {selected.confidence}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sidecar JSON info */}
        {loadError && (
          <Text size="1" color="red">{loadError}</Text>
        )}

        {sidecar && SIDECAR_SECTIONS.map((section) => {
          const entries = section.keys
            .filter((k) => sidecar[k] !== undefined)
            .map((k) => ({ key: k, value: sidecar[k] }))
          if (entries.length === 0) return null

          return (
            <div key={section.label}>
              <Text size="1" weight="bold" className="block mb-1">{section.label}</Text>
              <div className="bg-gray-50 rounded border border-gray-200 p-2 text-[11px]">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                  {entries.map(({ key, value }) => (
                    <React.Fragment key={key}>
                      <span className="text-gray-500 truncate" title={key}>{key}</span>
                      <span className="truncate" title={formatValue(value)}>
                        {formatValue(value)}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
