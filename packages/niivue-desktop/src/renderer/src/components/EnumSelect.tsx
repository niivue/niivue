import React from 'react'

export const EnumSelect: React.FC<{
  value: string
  onChange: (value: string) => void
  options: Record<string, number>
}> = ({ value, onChange, options }) => {
  // Find label for current value
  Object.entries(options).find(([, val]) => val.toString() === value)?.[0] || 'Select...'
  console.log('options', options)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-[200px] px-2 py-1 border rounded"
    >
      {Object.entries(options).map(([label, val]) => (
        <option key={val} value={val.toString()}>
          {label}
        </option>
      ))}
    </select>
  )
}

export default EnumSelect
