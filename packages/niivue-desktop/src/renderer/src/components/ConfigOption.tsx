import { Switch, Slider } from "@radix-ui/themes"
import { hexToRgba10 } from "@renderer/utils/colors"
import { filterEnum } from "@renderer/utils/config"
import { ColorPicker } from "./ColorPicker"
import { EnumSelect } from "./EnumSelect"

export function ConfigOption({ keyName, value, meta, onChange }) {
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
        <input
          className="input-class"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      )
    default:
      return <span>Unsupported: {keyName}</span>
  }
}
