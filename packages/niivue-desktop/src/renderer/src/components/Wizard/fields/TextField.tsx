import { TextField as RadixTextField, Text, Tooltip } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'

interface TextFieldProps {
  label: string
  tooltip?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function TextField({
  label,
  tooltip,
  value,
  onChange,
  placeholder,
  disabled
}: TextFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex items-center gap-1">
        <Text as="label" size="2" weight="medium" className="text-neutral-12">
          {label}
        </Text>
        {tooltip && (
          <Tooltip content={tooltip}>
            <InfoCircledIcon className="text-neutral-8 shrink-0" />
          </Tooltip>
        )}
      </div>
      <RadixTextField.Root
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        size="2"
      />
    </div>
  )
}
