/* eslint-disable @typescript-eslint/no-explicit-any */
import { Switch, Slider } from '@radix-ui/themes'
import { hexToRgba10 } from '@renderer/utils/colors.js'
import { filterEnum } from '@renderer/utils/config.js'
import { ColorPicker } from './ColorPicker.js'
import { EnumSelect } from './EnumSelect.js'

type MetaType =
  | { type: 'boolean' }
  | { type: 'slider'; min: number; max: number; step: number }
  | { type: 'color' }
  | { type: 'enum'; enum: Record<string, number> }
  | { type: 'text' }
  | { type: 'number' }

interface ConfigOptionProps {
  keyName: string
  value: any // optionally refine this later
  meta: MetaType
  onChange: (newValue: any) => void
}

export function ConfigOption({ keyName, value, meta, onChange }: ConfigOptionProps): JSX.Element {
  switch (meta.type) {
    case 'boolean':
      return <Switch checked={value} onCheckedChange={onChange} />
    case 'slider':
      return (
        <Slider
          min={meta.min}
          max={meta.max}
          step={meta.step}
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
        />
      )
    case 'color':
      return (
        <ColorPicker
          label={keyName}
          colorRGBA10={value}
          onChange={(e) => onChange(hexToRgba10(e.target.value))}
        />
      )
    case 'enum':
      return (
        <EnumSelect
          value={value.toString()}
          onChange={(v) => onChange(parseInt(v))}
          options={filterEnum(meta.enum)}
        />
      )
    case 'text':
      return (
        <input className="input-class" value={value} onChange={(e) => onChange(e.target.value)} />
      )
    case 'number':
      return (
        <input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      )
    default:
      return <span>Unsupported: {keyName}</span>
  }
}
