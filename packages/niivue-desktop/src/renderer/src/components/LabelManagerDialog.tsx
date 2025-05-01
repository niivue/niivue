import React, { useContext, useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AppContext } from '../App'
import { Button, Flex, Select } from '@radix-ui/themes'
import { LabelTextAlignment, NVLabel3D, NVLabel3DStyle, LabelLineTerminator } from '@niivue/niivue'
import { Theme } from '@radix-ui/themes'
import { Cross2Icon } from '@radix-ui/react-icons'

export const LabelManagerDialog = ({ open, setOpen }: { open: boolean, setOpen: (v: boolean) => void }) => {
  const { nvRef } = useContext(AppContext)
  const [selectedLabel, setSelectedLabel] = useState<string>('')
  const [editMode, setEditMode] = useState(false)
  const [labels, setLabels] = useState<NVLabel3D[]>([])
  const [text, setText] = useState('')
  const [pos, setPos] = useState<[string, string, string]>(['0', '0', '0'])
  const [scale, setScale] = useState('1')
  const [alignment, setAlignment] = useState('CENTER')
  const [lineWidth, setLineWidth] = useState('1')
  const [lineColor, setLineColor] = useState('#ffffff')

  const refreshLabels = () => {
    const nv = nvRef.current
    setLabels(nv.document.labels as NVLabel3D[])
  }

  const editLabel = (label: NVLabel3D) => {
    setEditMode(true)
    loadLabel(label)
    setSelectedLabel(label.text)
  }

  const loadLabel = (label: NVLabel3D) => {
    setText(label.text)
    setScale(label.style?.textScale?.toString() || '1')
    setLineWidth(label.style?.lineWidth?.toString() || '1')
    setLineColor(
      label.style?.lineColor
        ? `#${label.style.lineColor.slice(0, 3).map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`
        : '#ffffff'
    )
    setAlignment(
      Object.keys(LabelTextAlignment).find(
        k => LabelTextAlignment[k as keyof typeof LabelTextAlignment] === label.style?.textAlignment
      ) || 'CENTER'
    )
    const point = Array.isArray(label.points?.[0]) ? label.points[0] : label.points
    const [x, y, z] = point || [0, 0, 0]
    setPos([x.toString(), y.toString(), z.toString()])
  }

  const onLabelSelect = (value: string) => {
    const label = labels.find(l => l.text === value)
    if (label) {
      editLabel(label)
    }
  }

  const updateLabel = () => {
    const nv = nvRef.current
    nv.opts.showLegend = true
    const rgb = lineColor.match(/#(..)(..)(..)/)?.slice(1).map(c => parseInt(c, 16) / 255) || [1, 1, 1]
    const style: NVLabel3DStyle = {
      textScale: parseFloat(scale),
      textAlignment: LabelTextAlignment[alignment],
      textColor: [...rgb, 1],
      backgroundColor: [0, 0, 0, 0.5],
      lineWidth: parseFloat(lineWidth),
      lineColor: [...rgb, 1],
      lineTerminator: LabelLineTerminator.NONE
    }
    const crossFrac = nv.scene.crosshairPos as [number, number, number]
    const mm = nv.frac2mm(crossFrac)
    const point = [mm[0], mm[1], mm[2]] as [number, number, number]
    nv.addLabel(text, style, point)
    nv.updateGLVolume()
    refreshLabels()
  }

  const deleteLabel = () => {
    const nv = nvRef.current
    nv.document.labels = nv.document.labels.filter(l => l.text !== selectedLabel)
    nv.updateGLVolume()
    refreshLabels()
    setEditMode(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', position: 'fixed', inset: 0 }} />
        <Dialog.Content className="bg-white rounded shadow-lg fixed z-50 top-1/2 left-1/2 max-h-[90vh] w-[800px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6">
          <Theme>
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold">{editMode ? 'Edit Label' : 'Add Label'}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-black" aria-label="Close">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </div>
            <Flex direction="column" gap="2">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Label Text
                <input type="text" value={text} onChange={e => setText(e.target.value)} autoFocus style={{ width: '100%' }} />
              </label>
              {editMode && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Position (X, Y, Z)
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="text" value={pos[0]} onChange={e => setPos([e.target.value, pos[1], pos[2]])} style={{ flex: 1 }} />
                  <input type="text" value={pos[1]} onChange={e => setPos([pos[0], e.target.value, pos[2]])} style={{ flex: 1 }} />
                  <input type="text" value={pos[2]} onChange={e => setPos([pos[0], pos[1], e.target.value])} style={{ flex: 1 }} />
                </div>
              </label>
            )}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Text Scale
                <input type="text" value={scale} onChange={e => setScale(e.target.value)} style={{ width: '100%' }} />
              </label>              
              <Select.Root value={selectedLabel} onValueChange={onLabelSelect}>
                <Select.Trigger />
                <Select.Content>
                  {labels.map(label => (
                    <Select.Item key={label.text} value={label.text}>{label.text}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Line Color
                <input type="color" value={lineColor} onChange={e => setLineColor(e.target.value)} style={{ width: '100%', height: '2rem', border: 'none', background: 'none' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Line Width
                <input type="text" value={lineWidth} onChange={e => setLineWidth(e.target.value)} style={{ width: '100%' }} />
              </label>
              <Flex gap="3">
                <Button onClick={updateLabel} disabled={!text.trim()}>Save</Button>
                <Button onClick={() => {
                  const nv = nvRef.current
                  const pos3D = nv.crosshairs3D?.position ?? [0, 0, 0]
                  setEditMode(false)
                  setText('')
                  setPos(pos3D.map(n => n.toFixed(2)) as [string, string, string])
                  setScale('1')
                  setLineWidth('1')
                  setSelectedLabel('')

                  // Keep last line color if one was added, otherwise use crosshair color
                  const lastLabel = nv.document.labels.at(-1)
                  if (lastLabel?.style?.lineColor) {
                    const hex = '#' + lastLabel.style.lineColor.slice(0, 3).map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
                    setLineColor(hex)
                  } else {
                    const hex = '#' + nv.opts.crosshairColor.slice(0, 3).map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
                    setLineColor(hex)
                  }
                }}>New Label</Button>
                {editMode && <Button onClick={deleteLabel} color="red">Delete</Button>}
              </Flex>
              {editMode && <div className="text-sm text-gray-500 mb-2">Editing existing label</div>}
            </Flex>
          </Theme>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
