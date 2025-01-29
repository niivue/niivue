import React from 'react'
import { Select } from '@radix-ui/themes'

export const EnumSelect: React.FC<{
  value: string
  onChange: (value: string) => void
  options: Record<string, number>
}> = ({ value, onChange, options }) => (
  <div className="flex flex-col gap-2 width-[200px] min-w-[200px]">
    <div className="flex gap-1 justify-between items-center">
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger className="flex items-center justify-between border rounded px-2 py-1"></Select.Trigger>
        <Select.Content className="truncate">
          {Object.entries(options).map(([label, val]) => (
            <Select.Item key={val} value={val.toString()}>
              <span>{label}</span>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  </div>
)
