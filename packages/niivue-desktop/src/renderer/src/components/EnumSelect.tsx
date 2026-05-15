import React from 'react'
import { Select } from '@radix-ui/themes'

export const EnumSelect: React.FC<{
  value: string
  onChange: (value: string) => void
  options: Record<string, number>
  exclude?: string[]
  label?: string
}> = ({ value, onChange, options, exclude = [], label }) => {
  // Filter out excluded option labels
  const filteredOptions = Object.entries(options).filter(([l]) => !exclude.includes(l))

  return (
    <Select.Root value={value} onValueChange={onChange} size="1">
      <Select.Trigger aria-label={label} />
      <Select.Content>
        {filteredOptions.map(([l, val]) => (
          <Select.Item key={val} value={val.toString()}>
            {l}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  )
}

export default EnumSelect
