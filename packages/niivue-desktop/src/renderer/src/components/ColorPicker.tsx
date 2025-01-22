import { Text } from '@radix-ui/themes'
import React from 'react'
import { rgba10ToHex } from '../utils/colors'

interface ColorPickerProps {
  label?: string // Optional label
  colorRGBA10: number[] | Float32Array
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, colorRGBA10, onChange }) => {
  return (
    <div className="flex mb-4 items-center gap-2">
      <input
        type="color"
        value={rgba10ToHex(colorRGBA10)}
        onChange={onChange}
        onInput={onChange}
        onSelect={onChange}
      />
      <Text size="2" weight="bold" className="mb-1">
        {label}
      </Text>
    </div>
  )
}
