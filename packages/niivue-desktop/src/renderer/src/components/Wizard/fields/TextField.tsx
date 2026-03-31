import { TextField as RadixTextField, Text } from '@radix-ui/themes'

interface TextFieldProps {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function TextField({
  label,
  description,
  value,
  onChange,
  placeholder,
  disabled
}: TextFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <Text as="label" size="2" weight="medium" className="text-neutral-12">
        {label}
      </Text>
      <RadixTextField.Root
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        size="2"
      />
      {description && (
        <Text size="1" className="text-neutral-9">
          {description}
        </Text>
      )}
    </div>
  )
}
