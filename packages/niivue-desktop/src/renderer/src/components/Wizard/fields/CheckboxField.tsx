import { Checkbox, Text, Tooltip } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'

interface CheckboxFieldProps {
  label: string
  tooltip?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function CheckboxField({
  label,
  tooltip,
  checked,
  onChange,
  disabled
}: CheckboxFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1 py-1">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
          disabled={disabled}
          size="2"
        />
        <Text size="2" className="text-neutral-12">{label}</Text>
        {tooltip && (
          <Tooltip content={tooltip}>
            <InfoCircledIcon className="text-neutral-8 shrink-0" />
          </Tooltip>
        )}
      </label>
    </div>
  )
}
