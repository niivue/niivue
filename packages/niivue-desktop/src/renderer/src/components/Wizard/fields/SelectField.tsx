import { Select, Text } from '@radix-ui/themes'

interface SelectFieldProps {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}

export function SelectField({
  label,
  description,
  value,
  onChange,
  options,
  disabled
}: SelectFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <Text as="label" size="2" weight="medium" className="text-neutral-12">
        {label}
      </Text>
      <Select.Root value={value} onValueChange={onChange} disabled={disabled} size="2">
        <Select.Trigger />
        <Select.Content>
          {options.map((opt) => (
            <Select.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      {description && (
        <Text size="1" className="text-neutral-9">
          {description}
        </Text>
      )}
    </div>
  )
}
