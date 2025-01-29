import React from 'react'
import * as Select from '@radix-ui/react-select'

export const EnumSelect: React.FC<{
  value: string
  onChange: (value: string) => void
  options: Record<string, number>
}> = ({ value, onChange, options }) => (
  <Select.Root value={value} onValueChange={onChange}>
    <Select.Trigger className="flex items-center justify-between border rounded px-2 py-1">
      <Select.Value />
      <Select.Icon className="ml-2">▼</Select.Icon>
    </Select.Trigger>
    <Select.Content className="bg-white border rounded shadow">
      <Select.Viewport>
        {Object.entries(options).map(([label, val]) => (
          <Select.Item key={val} value={val.toString()} className="p-2 hover:bg-gray-100">
            <Select.ItemText>{label}</Select.ItemText>
          </Select.Item>
        ))}
      </Select.Viewport>
    </Select.Content>
  </Select.Root>
)
