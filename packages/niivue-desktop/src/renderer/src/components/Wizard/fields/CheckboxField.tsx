import { Checkbox, Text } from '@radix-ui/themes'

interface CheckboxFieldProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function CheckboxField({
  label,
  description,
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
      </label>
      {description && (
        <Text size="1" className="text-neutral-9 ml-7">
          {description}
        </Text>
      )}
    </div>
  )
}
