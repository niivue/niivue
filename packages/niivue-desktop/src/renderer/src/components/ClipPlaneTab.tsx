import { useEffect, useState, useCallback } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Slider, Switch } from '@radix-ui/themes'
import { useSelectedInstance } from '../AppContext.js'
import { ColorPicker } from './ColorPicker.js'
import { hexToRgba10 } from '../utils/colors.js'

const PRESETS: { label: string; short: string; value: [number, number, number] }[] = [
  { label: 'None', short: 'Off', value: [2, 0, 0] },
  { label: 'Left', short: 'L', value: [0, 270, 0] },
  { label: 'Right', short: 'R', value: [0, 90, 0] },
  { label: 'Posterior', short: 'P', value: [0, 0, 0] },
  { label: 'Anterior', short: 'A', value: [0, 180, 0] },
  { label: 'Inferior', short: 'I', value: [0, 0, -90] },
  { label: 'Superior', short: 'S', value: [0, 0, 90] }
]

const MAX_PLANES = 6

function readClipState(nv: { scene: { clipPlaneDepthAziElevs: number[][] }; uiData: { activeClipPlaneIndex: number } }): {
  activeIndex: number
  depth: number
  azimuth: number
  elevation: number
} {
  const idx = nv.uiData.activeClipPlaneIndex || 0
  const daes = nv.scene.clipPlaneDepthAziElevs
  const dae = daes && daes[idx] ? daes[idx] : [2, 0, 0]
  return { activeIndex: idx, depth: dae[0], azimuth: dae[1], elevation: dae[2] }
}

export function ClipPlaneTab(): JSX.Element {
  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current
  if (!nv) return <Text size="2" color="gray">No volume loaded</Text>

  const [activeIndex, setActiveIndex] = useState(() => readClipState(nv).activeIndex)
  const [depth, setDepth] = useState(() => readClipState(nv).depth)
  const [azimuth, setAzimuth] = useState(() => readClipState(nv).azimuth)
  const [elevation, setElevation] = useState(() => readClipState(nv).elevation)
  const [clipColor, setClipColor] = useState<number[]>(() => Array.from(nv.opts.clipPlaneColor))
  const [cutaway, setCutaway] = useState(() => nv.opts.isClipPlanesCutaway)

  const syncFromNv = useCallback(() => {
    const state = readClipState(nv)
    setActiveIndex(state.activeIndex)
    setDepth(state.depth)
    setAzimuth(state.azimuth)
    setElevation(state.elevation)
  }, [nv])

  // Listen for external clip plane changes (keyboard, drag, other sync)
  useEffect(() => {
    const prev = nv.onClipPlaneChange
    nv.onClipPlaneChange = () => {
      syncFromNv()
      if (prev) prev(nv.scene.clipPlane)
    }
    return () => {
      nv.onClipPlaneChange = prev
    }
  }, [nv, syncFromNv])

  const applyClipPlane = (d: number, a: number, e: number): void => {
    setDepth(d)
    setAzimuth(a)
    setElevation(e)
    nv.setClipPlane([d, a, e])
  }

  const handleActiveIndexChange = (idx: number): void => {
    setActiveIndex(idx)
    nv.uiData.activeClipPlaneIndex = idx
    // Read the state for the newly selected plane
    const daes = nv.scene.clipPlaneDepthAziElevs
    const dae = daes && daes[idx] ? daes[idx] : [2, 0, 0]
    setDepth(dae[0])
    setAzimuth(dae[1])
    setElevation(dae[2])
  }

  const isActive = depth < 1.8

  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Accordion.Root type="multiple" defaultValue={['presets', 'controls', 'appearance']} className="w-full">

        {/* Active Plane Selector */}
        <Accordion.Item value="plane-select" className="border-b border-[var(--gray-5)]">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left group">
              <Text size="2" weight="bold">Active Plane</Text>
              <span className="transform transition-transform duration-200 rotate-0 group-data-[state=open]:rotate-90">▶</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-2 py-2">
            <div className="flex gap-1">
              {Array.from({ length: MAX_PLANES }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleActiveIndexChange(i)}
                  className={
                    'w-8 h-8 text-xs font-medium rounded border transition-colors ' +
                    (activeIndex === i
                      ? 'bg-[var(--accent-9)] text-[var(--color-background)] border-[var(--accent-9)]'
                      : 'bg-[var(--gray-2)] text-[var(--gray-11)] border-[var(--gray-6)] hover:bg-[var(--gray-4)]')
                  }
                  aria-label={`Clip plane ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Text size="1" color="gray" className="mt-1">
              Plane {activeIndex + 1} {isActive ? '(active)' : '(disabled)'}
            </Text>
          </Accordion.Content>
        </Accordion.Item>

        {/* Presets */}
        <Accordion.Item value="presets" className="border-b border-[var(--gray-5)]">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left group">
              <Text size="2" weight="bold">Presets</Text>
              <span className="transform transition-transform duration-200 rotate-0 group-data-[state=open]:rotate-90">▶</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-2 py-2">
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyClipPlane(...preset.value)}
                  title={preset.label}
                  className={
                    'px-2.5 py-1.5 text-xs font-medium rounded border transition-colors ' +
                    (depth === preset.value[0] && azimuth === preset.value[1] && elevation === preset.value[2]
                      ? 'bg-[var(--accent-9)] text-[var(--color-background)] border-[var(--accent-9)]'
                      : 'bg-[var(--gray-2)] text-[var(--gray-11)] border-[var(--gray-6)] hover:bg-[var(--gray-4)]')
                  }
                  aria-label={`Clip plane preset: ${preset.label}`}
                >
                  {preset.short}
                </button>
              ))}
            </div>
          </Accordion.Content>
        </Accordion.Item>

        {/* Manual Controls */}
        <Accordion.Item value="controls" className="border-b border-[var(--gray-5)]">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left group">
              <Text size="2" weight="bold">Manual Controls</Text>
              <span className="transform transition-transform duration-200 rotate-0 group-data-[state=open]:rotate-90">▶</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-2 py-2 flex flex-col gap-4">
            {/* Depth */}
            <div>
              <div className="flex justify-between mb-1">
                <Text size="1" weight="medium">Depth</Text>
                <Text size="1" color="gray">{depth.toFixed(2)}</Text>
              </div>
              <Slider
                min={0}
                max={2}
                step={0.01}
                value={[depth]}
                onValueChange={([v]) => applyClipPlane(v, azimuth, elevation)}
                aria-label="Clip plane depth"
              />
              <Text size="1" color="gray">0 = center, &gt;1.8 = disabled</Text>
            </div>

            {/* Azimuth */}
            <div>
              <div className="flex justify-between mb-1">
                <Text size="1" weight="medium">Azimuth</Text>
                <Text size="1" color="gray">{azimuth}°</Text>
              </div>
              <Slider
                min={0}
                max={360}
                step={1}
                value={[azimuth]}
                onValueChange={([v]) => applyClipPlane(depth, v, elevation)}
                aria-label="Clip plane azimuth"
              />
            </div>

            {/* Elevation */}
            <div>
              <div className="flex justify-between mb-1">
                <Text size="1" weight="medium">Elevation</Text>
                <Text size="1" color="gray">{elevation}°</Text>
              </div>
              <Slider
                min={-90}
                max={90}
                step={1}
                value={[elevation]}
                onValueChange={([v]) => applyClipPlane(depth, azimuth, v)}
                aria-label="Clip plane elevation"
              />
            </div>
          </Accordion.Content>
        </Accordion.Item>

        {/* Appearance */}
        <Accordion.Item value="appearance" className="border-b border-[var(--gray-5)]">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left group">
              <Text size="2" weight="bold">Appearance</Text>
              <span className="transform transition-transform duration-200 rotate-0 group-data-[state=open]:rotate-90">▶</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-2 py-2 flex flex-col gap-3">
            <ColorPicker
              label="Clip Plane Color"
              colorRGBA10={clipColor}
              onChange={(e) => {
                const rgba = hexToRgba10(e.target.value)
                setClipColor(rgba)
                nv.setClipPlaneColor(rgba)
              }}
            />

            <div className="flex items-center gap-2">
              <Text size="2" weight="medium">Cutaway Mode</Text>
              <Switch
                checked={cutaway}
                onCheckedChange={(checked) => {
                  setCutaway(checked)
                  nv.opts.isClipPlanesCutaway = checked
                  nv.drawScene()
                }}
                aria-label="Cutaway mode"
              />
            </div>
          </Accordion.Content>
        </Accordion.Item>

      </Accordion.Root>
    </ScrollArea>
  )
}

export default ClipPlaneTab
