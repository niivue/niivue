import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button, Flex } from '@radix-ui/themes'
import { LabelTextAlignment, NVLabel3D, NVLabel3DStyle, LabelLineTerminator } from '@niivue/niivue'
import { Theme } from '@radix-ui/themes'
import { Cross2Icon } from '@radix-ui/react-icons'
import { useSelectedInstance } from '../AppContext'

export const LabelManagerDialog = ({
  open,
  setOpen,
  editMode,
  setEditMode
}: {
  open: boolean
  setOpen: (v: boolean) => void
  editMode: boolean
  setEditMode: (v: boolean) => void
}) => {
  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current

  const [text, setText] = useState('')
  const [pos, setPos] = useState<[string, string, string]>(['0', '0', '0'])
  const [scale, setScale] = useState('1')
  const [lineWidth, setLineWidth] = useState('1')
  const [lineColor, setLineColor] = useState('#ffffff')

  // Called externally to load label for editing
  const editLabel = (label: NVLabel3D) => {
    if (!nv) return
    setEditMode(true)
    setText(label.text)
    setScale(label.style?.textScale?.toString() || '1')
    setLineWidth(label.style?.lineWidth?.toString() || '1')
    setLineColor(
      label.style?.lineColor
        ? `#${label.style.lineColor
            .slice(0, 3)
            .map(c => Math.round(c * 255).toString(16).padStart(2, '0'))
            .join('')}`
        : '#ffffff'
    )
    const point = Array.isArray(label.points?.[0]) ? label.points[0] : label.points
    const [x, y, z] = point || [0, 0, 0]
    setPos([x.toString(), y.toString(), z.toString()])
    setOpen(true)
  }

  const updateLabel = () => {
    if (!nv) return
    nv.opts.showLegend = true
    const rgb = lineColor
      .match(/#(..)(..)(..)/)
      ?.slice(1)
      .map(c => parseInt(c, 16) / 255) || [1, 1, 1]
    const style: NVLabel3DStyle = {
      textScale: parseFloat(scale),
      textAlignment: LabelTextAlignment.CENTER,
      textColor: [...rgb, 1],
      backgroundColor: [0, 0, 0, 0.5],
      lineWidth: parseFloat(lineWidth),
      lineColor: [...rgb, 1],
      lineTerminator: LabelLineTerminator.NONE
    }
    const mm = nv.frac2mm(nv.scene.crosshairPos)
    const label = nv.addLabel(text, style, Array.from(mm))
    if (label) {
      label.onClick = (clickedLabel: NVLabel3D, e?: MouseEvent) => {
        if (e?.button === 2) {
          e.preventDefault()
          editLabel(clickedLabel)
        } else {
          const pt = Array.isArray(clickedLabel.points?.[0]) ? clickedLabel.points[0] : clickedLabel.points
          if (pt) nv.scene.crosshairPos = nv.mm2frac(pt as [number, number, number])
        }
      }
    }
    nv.updateGLVolume()
    setEditMode(false)
  }

  const deleteLabel = () => {
    if (!nv) return
    nv.document.labels = nv.document.labels.filter(l => l.text !== text)
    nv.updateGLVolume()
    setEditMode(false)
  }

  // Initialize new label (unconditionally, but gated logic inside)
  useEffect(() => {
    if (!open || editMode || !nv) return
    const mm = nv.frac2mm(nv.scene.crosshairPos)
    setPos(mm.map(n => n.toFixed(2)) as [string, string, string])
    setText('')
    setScale('1')
    setLineWidth('1')
    const lastLabel = nv.document.labels.at(-1)
    const colorSource = lastLabel?.style?.lineColor || nv.opts.crosshairColor
    const hex = '#' + colorSource
      .slice(0, 3)
      .map(c => Math.round(c * 255).toString(16).padStart(2, '0'))
      .join('')
    setLineColor(hex)
  }, [open, editMode, nv])

  if (!nv) return <></>

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
              <label>
                Label Text
                <input type="text" value={text} onChange={e => setText(e.target.value)} autoFocus />
              </label>
              <label>
                Crosshair Position (mm)
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="text" value={pos[0]} disabled />
                  <input type="text" value={pos[1]} disabled />
                  <input type="text" value={pos[2]} disabled />
                </div>
              </label>
              <label>
                Text Scale
                <input type="text" value={scale} onChange={e => setScale(e.target.value)} />
              </label>
              <label>
                Line Color
                <input type="color" value={lineColor} onChange={e => setLineColor(e.target.value)} style={{ height: '2rem', border: 'none' }} />
              </label>
              <label>
                Line Width
                <input type="text" value={lineWidth} onChange={e => setLineWidth(e.target.value)} />
              </label>
              <Flex gap="3">
                <Button onClick={updateLabel} disabled={!text.trim()}>Save</Button>
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
