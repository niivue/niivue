import { Checkbox, Text, Tooltip, Badge } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'

interface ArraySelectFieldProps {
  label: string
  tooltip?: string
  /** The field value — expected to be an array. */
  value: unknown
  onChange: (value: unknown) => void
  loading?: boolean
}

/** Try a few common keys to find a human label for an opaque item. */
function itemLabel(item: unknown, index: number): string {
  if (item == null) return `#${index + 1}`
  if (typeof item === 'string') {
    // Path-like → show basename
    const slash = Math.max(item.lastIndexOf('/'), item.lastIndexOf('\\'))
    return slash >= 0 ? item.slice(slash + 1) : item
  }
  if (typeof item !== 'object') return String(item)
  const obj = item as Record<string, unknown>
  for (const key of [
    'label',
    'name',
    'title',
    'seriesDescription',
    'rawId',
    'id',
    'path',
    'niftiPath'
  ]) {
    const v = obj[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return `#${index + 1}`
}

/** Sub-label: show one or two extra fields if available. */
function itemSubLabel(item: unknown): string | undefined {
  if (item == null || typeof item !== 'object') return undefined
  const obj = item as Record<string, unknown>
  const parts: string[] = []
  for (const key of ['subject', 'session', 'datatype', 'suffix', 'task', 'run']) {
    const v = obj[key]
    if (v == null || v === '' || v === 0) continue
    parts.push(`${key}-${v}`)
  }
  return parts.length > 0 ? parts.join(' / ') : undefined
}

export function ArraySelectField({
  label,
  tooltip,
  value,
  onChange,
  loading
}: ArraySelectFieldProps): React.ReactElement {
  const items = Array.isArray(value) ? value : []
  const isObjectArray =
    items.length > 0 && items.every((it) => it != null && typeof it === 'object')

  const includedCount = items.filter(
    (it) => !(it != null && typeof it === 'object' && (it as Record<string, unknown>).excluded)
  ).length

  const toggle = (index: number, checked: boolean): void => {
    const next = items.map((it, i) => {
      if (i !== index) return it
      if (it == null || typeof it !== 'object') return it
      return { ...(it as Record<string, unknown>), excluded: !checked }
    })
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex items-center gap-2">
        <Text size="2" weight="medium" className="text-neutral-12">
          {label}
        </Text>
        {tooltip && (
          <Tooltip content={tooltip}>
            <InfoCircledIcon className="text-neutral-8 shrink-0" />
          </Tooltip>
        )}
        {isObjectArray && items.length > 0 && (
          <Badge size="1" color="gray" variant="soft">
            {includedCount}/{items.length} selected
          </Badge>
        )}
      </div>

      {loading ? (
        <Text size="1" className="text-neutral-9">
          Loading…
        </Text>
      ) : items.length === 0 ? (
        <Text size="1" className="text-neutral-9">
          No items.
        </Text>
      ) : (
        <div className="border border-neutral-6 rounded-md overflow-hidden max-h-[280px] overflow-y-auto">
          {items.map((item, i) => {
            const isObj = item != null && typeof item === 'object'
            const obj = isObj ? (item as Record<string, unknown>) : null
            const checked = isObj ? !obj!.excluded : true
            const sub = itemSubLabel(item)
            return (
              <label
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[var(--gray-2)] ${
                  i > 0 ? 'border-t border-neutral-5' : ''
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggle(i, v === true)}
                  disabled={!isObj}
                  size="1"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <Text size="1" className="text-neutral-12 truncate">
                    {itemLabel(item, i)}
                  </Text>
                  {sub && (
                    <Text size="1" className="text-neutral-9 truncate">
                      {sub}
                    </Text>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
