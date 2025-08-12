import React from 'react'

export const EnumSelect: React.FC<{
  value: string
  onChange: (value: string) => void
  options: Record<string, number>
  exclude?: string[]
}> = ({ value, onChange, options, exclude = [] }) => {
  // Filter out excluded option labels
  const filteredOptions = Object.entries(options).filter(([label]) => !exclude.includes(label))

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-[200px] px-2 py-1 border rounded"
    >
      {filteredOptions.map(([label, val]) => (
        <option key={val} value={val.toString()}>
          {label}
        </option>
      ))}
    </select>
  )
}

export default EnumSelect
