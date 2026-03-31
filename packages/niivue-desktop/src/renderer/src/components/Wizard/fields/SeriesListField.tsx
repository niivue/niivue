import { useEffect, useRef, useState } from 'react'
import { Checkbox, Text } from '@radix-ui/themes'

interface DicomSeriesItem {
  seriesNumber: number
  text: string
  seriesDescription?: string
  images?: number
}

interface SeriesListFieldProps {
  label?: string
  description?: string
  value: unknown
  onChange: (value: unknown) => void
  loading?: boolean
}

export function SeriesListField({
  label,
  description,
  value,
  onChange,
  loading
}: SeriesListFieldProps): React.ReactElement {
  const itemsRef = useRef<DicomSeriesItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!Array.isArray(value) || value.length === 0) return
    if (typeof value[0] === 'object' && value[0] !== null && 'seriesNumber' in value[0]) {
      itemsRef.current = value as DicomSeriesItem[]
      const all = new Set((value as DicomSeriesItem[]).map((s) => s.seriesNumber))
      setSelected(all)
      onChange(Array.from(all))
    }
  }, [value])

  const seriesItems = itemsRef.current

  const toggle = (n: number): void => {
    const next = new Set(selected)
    if (next.has(n)) next.delete(n)
    else next.add(n)
    setSelected(next)
    onChange(Array.from(next))
  }

  const allChecked = seriesItems.length > 0 && selected.size === seriesItems.length

  const toggleAll = (): void => {
    if (allChecked) {
      setSelected(new Set())
      onChange([])
    } else {
      const all = new Set(seriesItems.map((s) => s.seriesNumber))
      setSelected(all)
      onChange(Array.from(all))
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center">
        <div className="animate-spin w-5 h-5 border-2 border-accent-9 border-t-transparent rounded-full mx-auto mb-2" />
        <Text size="2" className="text-neutral-9">Loading DICOM series...</Text>
      </div>
    )
  }

  if (seriesItems.length === 0) {
    return (
      <div className="py-6 text-center">
        <Text size="2" className="text-neutral-9">No series found</Text>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 py-1">
      {label && (
        <Text size="2" weight="medium" className="text-neutral-12">
          {label}
        </Text>
      )}

      <label className="flex items-center gap-2.5 cursor-pointer">
        <Checkbox
          checked={allChecked}
          onCheckedChange={() => toggleAll()}
          size="2"
        />
        <Text size="2" weight="medium" className="text-neutral-11">
          Select all ({seriesItems.length} series)
        </Text>
      </label>

      <div className="border border-neutral-6 rounded-lg divide-y divide-neutral-4">
        {seriesItems.map((s, i) => (
          <label
            key={`${s.seriesNumber}-${i}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-2 cursor-pointer transition-colors"
          >
            <Checkbox
              checked={selected.has(s.seriesNumber)}
              onCheckedChange={() => toggle(s.seriesNumber)}
              size="2"
            />
            <Text size="2" className="flex-1 text-neutral-12">
              {s.text || s.seriesDescription || `Series ${s.seriesNumber}`}
            </Text>
            {typeof s.images === 'number' && (
              <Text size="1" className="text-neutral-8 tabular-nums">
                {s.images} img
              </Text>
            )}
          </label>
        ))}
      </div>

      {description && (
        <Text size="1" className="text-neutral-9">
          {description}
        </Text>
      )}
    </div>
  )
}
