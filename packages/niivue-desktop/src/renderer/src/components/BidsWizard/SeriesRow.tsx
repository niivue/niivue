import { forwardRef, useEffect, useState } from 'react'
import { Select, Text, Checkbox } from '@radix-ui/themes'
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import type {
  BidsSeriesMapping,
  BidsDatatype,
  BidsSuffix,
  EditableSidecarFields
} from '../../../../common/bidsTypes.js'
import { SUFFIXES_BY_DATATYPE } from './bidsTreeUtil.js'

interface SeriesRowProps {
  mapping: BidsSeriesMapping
  onUpdate: (index: number, changes: Partial<BidsSeriesMapping>) => void
  onUpdateSidecar: (index: number, field: string, value: unknown) => void
  highlighted?: boolean
  onClearHighlight?: () => void
}

const DATATYPES: BidsDatatype[] = ['anat', 'func', 'dwi', 'fmap', 'perf']

const confidenceColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800'
}

const EDITABLE_SIDECAR_FIELDS: {
  key: keyof EditableSidecarFields
  label: string
  type: 'number' | 'text'
  readOnly?: boolean
}[] = [
  { key: 'RepetitionTime', label: 'TR (s)', type: 'number' },
  { key: 'EchoTime', label: 'TE (s)', type: 'number' },
  { key: 'FlipAngle', label: 'Flip Angle', type: 'number' },
  { key: 'PhaseEncodingDirection', label: 'Phase Enc Dir', type: 'text' },
  { key: 'TotalReadoutTime', label: 'Readout Time (s)', type: 'number' },
  { key: 'SliceTiming', label: 'Slice Timing', type: 'text', readOnly: true }
]

export const SeriesRow = forwardRef<HTMLTableRowElement, SeriesRowProps>(function SeriesRow(
  { mapping, onUpdate, onUpdateSidecar, highlighted, onClearHighlight },
  ref
) {
  const [expanded, setExpanded] = useState(false)
  const availableSuffixes = SUFFIXES_BY_DATATYPE[mapping.datatype] || []
  const idx = mapping.index

  const sidecar = mapping.sidecarData

  // Auto-expand when highlighted
  useEffect(() => {
    if (!highlighted) return
    setExpanded(true)
    const timer = setTimeout(() => {
      onClearHighlight?.()
    }, 3000)
    return () => clearTimeout(timer)
  }, [highlighted, onClearHighlight])

  const getSidecarValue = (key: keyof EditableSidecarFields): string => {
    if (!sidecar) return ''
    const override = sidecar.overrides[key]
    if (override !== undefined) {
      if (Array.isArray(override)) return JSON.stringify(override)
      return String(override)
    }
    const original = sidecar.original[key]
    if (original !== undefined) {
      if (Array.isArray(original)) return JSON.stringify(original)
      return String(original)
    }
    return ''
  }

  return (
    <>
      <tr
        ref={ref}
        className={`${mapping.excluded ? 'opacity-40' : ''} ${highlighted ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
      >
        {/* Exclude checkbox */}
        <td className="py-1 px-1">
          <Checkbox
            checked={!mapping.excluded}
            onCheckedChange={(c) => onUpdate(idx, { excluded: c !== true })}
          />
        </td>

        {/* Series description */}
        <td className="py-1 px-1">
          <Text size="1" className="block truncate max-w-[180px]" title={mapping.seriesDescription}>
            {mapping.seriesDescription || '(unknown)'}
          </Text>
          {mapping.exclusionReason && (
            <Text size="1" color="red" className="block truncate max-w-[180px]">
              {mapping.exclusionReason}
            </Text>
          )}
        </td>

        {/* Confidence badge */}
        <td className="py-1 px-1">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${confidenceColors[mapping.confidence]}`}
            title={mapping.heuristicReason}
          >
            {mapping.confidence}
          </span>
        </td>

        {/* Datatype dropdown */}
        <td className="py-1 px-1">
          <Select.Root
            size="1"
            value={mapping.datatype}
            onValueChange={(v: string) => {
              const dt = v as BidsDatatype
              const newSuffixes = SUFFIXES_BY_DATATYPE[dt]
              onUpdate(idx, {
                datatype: dt,
                suffix: newSuffixes[0],
                task: dt === 'func' ? mapping.task || 'rest' : ''
              })
            }}
          >
            <Select.Trigger className="min-w-[70px]" />
            <Select.Content position="popper" style={{ zIndex: 9999 }}>
              {DATATYPES.map((dt) => (
                <Select.Item key={dt} value={dt}>
                  {dt}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </td>

        {/* Suffix dropdown */}
        <td className="py-1 px-1">
          <Select.Root
            size="1"
            value={mapping.suffix}
            onValueChange={(v: string) => onUpdate(idx, { suffix: v as BidsSuffix })}
          >
            <Select.Trigger className="min-w-[90px]" />
            <Select.Content position="popper" style={{ zIndex: 9999 }}>
              {availableSuffixes.map((s) => (
                <Select.Item key={s} value={s}>
                  {s}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </td>

        {/* Task label */}
        <td className="py-1 px-1">
          <input
            type="text"
            value={mapping.task}
            onChange={(e) => onUpdate(idx, { task: e.target.value })}
            placeholder={mapping.datatype === 'func' ? 'rest' : ''}
            disabled={mapping.datatype !== 'func'}
            className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded disabled:opacity-30"
          />
        </td>

        {/* Acq label */}
        <td className="py-1 px-1">
          <input
            type="text"
            value={mapping.acq}
            onChange={(e) => onUpdate(idx, { acq: e.target.value })}
            placeholder=""
            className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded"
          />
        </td>

        {/* Run number */}
        <td className="py-1 px-1">
          <input
            type="number"
            min={0}
            value={mapping.run}
            onChange={(e) => onUpdate(idx, { run: parseInt(e.target.value) || 0 })}
            className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded"
          />
        </td>

        {/* Expand toggle */}
        <td className="py-1 px-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 rounded hover:bg-gray-100"
            title="Show additional entities and metadata"
          >
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </button>
        </td>
      </tr>

      {/* Expanded sub-row */}
      {expanded && (
        <tr className={mapping.excluded ? 'opacity-40' : ''}>
          <td colSpan={9} className="py-2 px-4 bg-gray-50 border-b border-gray-200">
            {/* Additional entity fields */}
            <div className="mb-3">
              <Text size="1" weight="medium" className="block mb-1">
                Additional Entities
              </Text>
              <div className="flex gap-3 flex-wrap">
                <label className="flex items-center gap-1">
                  <Text size="1" color="gray">
                    ce:
                  </Text>
                  <input
                    type="text"
                    value={mapping.ce}
                    onChange={(e) => onUpdate(idx, { ce: e.target.value })}
                    placeholder=""
                    className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <Text size="1" color="gray">
                    rec:
                  </Text>
                  <input
                    type="text"
                    value={mapping.rec}
                    onChange={(e) => onUpdate(idx, { rec: e.target.value })}
                    placeholder=""
                    className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <Text size="1" color="gray">
                    dir:
                  </Text>
                  <input
                    type="text"
                    value={mapping.dir}
                    onChange={(e) => onUpdate(idx, { dir: e.target.value })}
                    placeholder=""
                    className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <Text size="1" color="gray">
                    echo:
                  </Text>
                  <input
                    type="number"
                    min={0}
                    value={mapping.echo}
                    onChange={(e) => onUpdate(idx, { echo: parseInt(e.target.value) || 0 })}
                    className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Sidecar metadata */}
            {sidecar && (
              <div>
                <Text size="1" weight="medium" className="block mb-1">
                  Sidecar Metadata
                </Text>
                <div className="flex gap-3 flex-wrap">
                  {EDITABLE_SIDECAR_FIELDS.map((field) => (
                    <label key={field.key} className="flex items-center gap-1">
                      <Text size="1" color="gray">
                        {field.label}:
                      </Text>
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        step={field.type === 'number' ? 'any' : undefined}
                        value={getSidecarValue(field.key)}
                        readOnly={field.readOnly}
                        onChange={(e) => {
                          if (field.readOnly) return
                          const val =
                            field.type === 'number'
                              ? e.target.value === ''
                                ? undefined
                                : parseFloat(e.target.value)
                              : e.target.value === ''
                                ? undefined
                                : e.target.value
                          onUpdateSidecar(idx, field.key, val)
                        }}
                        className={`w-24 px-1 py-0.5 text-xs border border-gray-300 rounded ${field.readOnly ? 'bg-gray-100 cursor-default' : ''}`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
})
