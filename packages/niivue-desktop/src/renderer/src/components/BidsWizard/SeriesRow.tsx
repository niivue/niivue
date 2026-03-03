import { Select, Text, Checkbox } from '@radix-ui/themes'
import type { BidsSeriesMapping, BidsDatatype, BidsSuffix } from '../../../../common/bidsTypes.js'
import { SUFFIXES_BY_DATATYPE } from './bidsTreeUtil.js'

interface SeriesRowProps {
  mapping: BidsSeriesMapping
  onUpdate: (index: number, changes: Partial<BidsSeriesMapping>) => void
}

const DATATYPES: BidsDatatype[] = ['anat', 'func', 'dwi', 'fmap', 'perf']

const confidenceColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800'
}

export function SeriesRow({ mapping, onUpdate }: SeriesRowProps): JSX.Element {
  const availableSuffixes = SUFFIXES_BY_DATATYPE[mapping.datatype] || []
  const idx = mapping.index

  return (
    <tr className={mapping.excluded ? 'opacity-40' : ''}>
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
          min={1}
          value={mapping.run}
          onChange={(e) => onUpdate(idx, { run: parseInt(e.target.value) || 1 })}
          className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded"
        />
      </td>
    </tr>
  )
}
