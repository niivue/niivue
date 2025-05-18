import React, { useEffect, useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Switch, Slider, Button } from '@radix-ui/themes'
import { useSelectedInstance } from '../AppContext'
import { groupedConfigMeta } from '../utils/configMeta'
import { ColorPicker } from './ColorPicker'
import { EnumSelect } from './EnumSelect'
import { hexToRgba10 } from '../utils/colors'
import { filterEnum } from '../utils/config'

export const Preferences: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current
  if (!nv) return <></>

  const [modifiedPrefs, setModifiedPrefs] = useState<Record<string, any>>({})

  const updateOption = (
  key: string,
  value: any,
  requiresDraw = false,
  requiresUpdateGLVolume = false
) => {
  nv.opts[key] = value
  setModifiedPrefs((prev) => ({ ...prev, [key]: value }))
  if (requiresUpdateGLVolume) nv.updateGLVolume()
  else if (requiresDraw) nv.drawScene()
}

  const renderControl = (key: string, meta: any) => {
    const value = nv.opts[key]
    console.log(`rendering ${key} with value`, value)
    if (value === undefined) {
      return <span className="text-sm text-gray-500">Not available</span>
    }

    switch (meta.type) {
      case 'boolean':
        return (      
      <Switch defaultChecked={!!value}
      onCheckedChange={(checked) => updateOption(key, checked, meta.requiresDraw, meta.requiresUpdateGLVolume)} />
        )
        case 'slider': {
          const initial = typeof value === 'number' ? value : meta.min ?? 0
          const [localValue, setLocalValue] = useState<number>(initial)
        
          return (
            <div className="flex gap-2 items-center">
              <Slider
                min={meta.min}
                max={meta.max}
                step={meta.step}
                defaultValue={[initial]}
                onValueChange={(v) => setLocalValue(v[0])}
                onValueCommit={(v) =>
                  updateOption(key, v[0], meta.requiresDraw, meta.requiresUpdateGLVolume)
                }
              />
              <span>{localValue.toFixed(2)}</span>
            </div>
          )
        }
        
        
        case 'text': {
          const [localValue, setLocalValue] = useState('')
        
          useEffect(() => {
            if (typeof value === 'string') {
              setLocalValue(value)
            }
          }, [value])
        
          return (
            <input
              className="border px-2 py-1 text-sm w-full"
              value={localValue}
              onChange={(e) => {
                const newValue = e.target.value
                setLocalValue(newValue)
              }}
              onBlur={() => updateOption(key, localValue, meta.requiresDraw, meta.requiresUpdateGLVolume)}
            />
          )
        }
        
        
      case 'color':
        return (
          <ColorPicker
            label={key}
            colorRGBA10={value}
            onChange={(e) =>
              updateOption(key, hexToRgba10(e.target.value), meta.requiresDraw, meta.requiresUpdateGLVolume)
            }
          />
        )
      case 'enum':
        return (
          <EnumSelect
            value={value.toString()}
            options={filterEnum(meta.enum)}
            onChange={(val: string) =>
              updateOption(key, parseInt(val), meta.requiresDraw, meta.requiresUpdateGLVolume)
            }
          />
        )
      default:
        return <span className="text-sm text-gray-500">Unsupported</span>
    }
  }

  const savePreferences = async () => {
    // for (const entries of Object.values(groupedConfigMeta)) {
    //   for (const entry of entries) {
    //     const [key] = entry as [string, any]
    //     electron.ipcRenderer.invoke('setPreference', key, nv.opts[key])
    //   }
    // }
    for (const [key, value] of Object.entries(modifiedPrefs)) {
      await window.electron.ipcRenderer.invoke('setPreference', key, value)
    }
    setModifiedPrefs({})
    onClose()
  }
  

  return (
    <div className="flex flex-col h-full">
      <ScrollArea style={{ flex: 1, paddingRight: '10px' }}>
        <Accordion.Root type="multiple" className="w-full">          
          {/* Dynamic sections (excluding GeneralTab categories like Crosshair) */}
          {Object.entries(groupedConfigMeta).map(([category, entries]) => {
            if (category === 'Crosshair' || category === 'HeroImage' || category === 'Font' || category === 'Background' || category === 'ZoomAndScale') {
              return null
            }

            return (
              <Accordion.Item key={category} value={category} className="border-b">
                <Accordion.Header>
                  <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
                    <Text size="2" weight="bold">{category}</Text>
                    <span className="transition-transform data-[state=open]:rotate-180">▼</span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="px-4 pb-2">
                  {entries
                  .map((entry) => {
                    const [key, meta] = entry as [string, any]
                    return (
                      <div key={key} className="mb-4">
                        <Text size="1" weight="bold" className="block mb-1">{key}</Text>
                        {renderControl(key, meta)}
                      </div>
                    )
                  })}
                </Accordion.Content>
              </Accordion.Item>
            )
          })}
        </Accordion.Root>
      </ScrollArea>

      {/* Save Preferences Button */}
      <div className="p-4 border-t flex justify-end">
        <Button onClick={savePreferences}>Save Preferences</Button>
      </div>
    </div>
  )
}
