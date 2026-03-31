import { TextField, Text, Slider, Tooltip } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'

interface NumberFieldProps {
  label: string
  tooltip?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
}

export function NumberField({
  label,
  tooltip,
  value,
  onChange,
  min,
  max,
  disabled
}: NumberFieldProps): React.ReactElement {
  const hasRange = min != null && max != null

  return (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex items-center gap-1">
        <Text as="label" size="2" weight="medium" className="text-neutral-12">
          {label}{hasRange ? `: ${value}` : ''}
        </Text>
        {tooltip && (
          <Tooltip content={tooltip}>
            <InfoCircledIcon className="text-neutral-8 shrink-0" />
          </Tooltip>
        )}
      </div>
      {hasRange ? (
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          size="1"
        />
      ) : (
        <TextField.Root
          type="number"
          value={String(value ?? '')}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          size="2"
        />
      )}
    </div>
  )
}
