import { useEffect, useState, useRef, useMemo } from 'react'
import {
  Button,
  ContextMenu,
  Card,
  Text,
  Select,
  Popover,
  Slider,
  TextField
} from '@radix-ui/themes'
import { EyeOpenIcon, EyeNoneIcon } from '@radix-ui/react-icons'
import { NVMesh } from '@niivue/niivue'
import { baseName } from '../utils/baseName.js'
import { useSelectedInstance } from '../AppContext.js'
import { NVMeshLayer } from '@renderer/types/MeshLayer.js'

interface MeshLayerCardProps {
  image: NVMeshLayer
  idx: number
  parentMesh: NVMesh
}

type AnyNumberArray =
  | number[]
  | Float64Array
  | Float32Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Int32Array
  | Int16Array
  | Int8Array

/** compute min/max (works with typed arrays) */
function computeMeshLayerRange(layer: NVMeshLayer): { min: number; max: number } {
  const vals: AnyNumberArray = layer.values
  if (vals == null || typeof vals.length !== 'number' || vals.length === 0) return { min: 0, max: 1 }
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i]
    if (typeof v !== 'number' || !isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1 }
  return { min, max }
}

export function MeshLayerCard({ image, idx, parentMesh }: MeshLayerCardProps): JSX.Element {
  const [displayName, setDisplayName] = useState<string>(image.name ?? '')
  const [colormap, setColormap] = useState<string>(
    typeof image.colormap === 'string' && image.colormap !== '' ? image.colormap : 'warm'
  )
  const [colormapNeg, setColormapNeg] = useState<string>(
    typeof image.colormapNegative === 'string' && image.colormapNegative !== ''
      ? image.colormapNegative
      : 'none'
  )

  const meshRange = useMemo(
    () => computeMeshLayerRange(image),
    // include length so typed-array changes retrigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [image.values, image.values?.length]
  )

  const [posRange, setPosRange] = useState<number[]>([
    image.cal_min ?? Math.max(0, meshRange.min),
    image.cal_max ?? Math.max(meshRange.max, 1)
  ])
  const [negRange, setNegRange] = useState<number[]>([
    Number.isFinite(image.cal_minNeg) ? image.cal_minNeg : Math.min(meshRange.min, 0),
    Number.isFinite(image.cal_maxNeg) ? image.cal_maxNeg : Math.min(meshRange.max, 0)
  ])

  const initialPosRange = useRef<number[]>([posRange[0], posRange[1]])
  const initialNegRange = useRef<number[]>([negRange[0], negRange[1]])

  const [opacity, setOpacity] = useState<number>(image.opacity ?? 1)
  const [colormaps, setColormaps] = useState<string[]>([])
  const [visible, setVisible] = useState<boolean>(true)
  const [isOpacityDisabled, setIsOpacityDisabled] = useState<boolean>(false)

  // Master checkbox: enable negative mapping (sets cal_min = 0 and useNegativeCmap = true)
  const [enableNegativeMapping, setEnableNegativeMapping] = useState<boolean>(() => meshRange.min < 0)
  // Secondary checkbox: apply cal_minNeg / cal_maxNeg to Niivue (enables slider)
  const [useNegativeRange, setUseNegativeRange] = useState<boolean>(() =>
    Number.isFinite(image.cal_minNeg) || Number.isFinite(image.cal_maxNeg) ? true : meshRange.min < 0
  )

  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current
  const setMeshes = instance?.setMeshes
  if (!nv || !setMeshes) return <></>

  useEffect(() => {
    if (image.name) setDisplayName(baseName(image.name))
  }, [image.name])

  useEffect(() => {
    setColormaps(nv.colormaps())
  }, [nv])

  useEffect(() => {
    initialPosRange.current = [posRange[0], posRange[1]]
    initialNegRange.current = [negRange[0], negRange[1]]

    const meshIndex = nv.meshes.indexOf(parentMesh)
    requestAnimationFrame(() => {
      // numeric properties via nv.setMeshLayerProperty
      nv.setMeshLayerProperty(meshIndex, idx, 'opacity', opacity)
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_min', posRange[0])
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_max', posRange[1])
      // only commit neg if useNegativeRange is true
      if (useNegativeRange) {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', negRange[0])
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', negRange[1])
      } else {
        // explicitly set NaN if user initially had useNegativeRange === false
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', NaN)
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', NaN)
      }

      // strings via parentMesh.setLayerProperty
      try {
        parentMesh.setLayerProperty(idx, 'colormap', colormap, nv.gl)
        if (colormapNeg !== 'none') {
          parentMesh.setLayerProperty(idx, 'colormapNegative', colormapNeg, nv.gl)
        } else {
          parentMesh.setLayerProperty(idx, 'colormapNegative', '', nv.gl)
        }
        // ensure useNegativeCmap reflects state when appropriate
        parentMesh.setLayerProperty(idx, 'useNegativeCmap', enableNegativeMapping, nv.gl)
        nv.refreshColormaps?.()
        nv.updateGLVolume()
      } catch {
        // ignore
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // helpers to commit negative usage & cal_min
  const setEnableNegativeMappingAndCommit = (checked: boolean) => {
    setEnableNegativeMapping(checked)
    requestAnimationFrame(() => {
      // if enabling, set cal_min to 0 and enable useNegativeCmap
      if (checked) {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_min', 0)
        parentMesh.setLayerProperty(idx, 'useNegativeCmap', true, nv.gl)
      } else {
        // disabling negative mapping -> turn off useNegativeCmap
        parentMesh.setLayerProperty(idx, 'useNegativeCmap', false, nv.gl)
      }
      nv.refreshColormaps?.()
      nv.updateGLVolume()
    })
  }

  const commitNegRangeIfAllowed = (value: number[]) => {
    setNegRange(value)
    if (!useNegativeRange) {
      // when not applying negative range, ensure niivue receives NaN for both values
      requestAnimationFrame(() => {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', NaN)
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', NaN)
        nv.updateGLVolume()
      })
      return
    }
    requestAnimationFrame(() => {
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', value[0])
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', value[1])
      nv.updateGLVolume()
    })
  }

  // Visibility
  const handleVisibilityToggle = (): void => {
    const newVisibility = !visible
    setVisible(newVisibility)
    setIsOpacityDisabled(!newVisibility)
    const meshIndex = nv.meshes.indexOf(parentMesh)
    requestAnimationFrame(() => {
      nv.setMeshLayerProperty(meshIndex, idx, 'opacity', newVisibility ? opacity : 0)
    })
  }

  const handleRemove = (): void => {
    parentMesh.layers.splice(idx, 1)
    parentMesh.updateMesh(nv.gl)
    setMeshes((prev) => {
      const i = prev.findIndex((m) => m.id === parentMesh.id)
      if (i >= 0) prev[i] = parentMesh
      return [...prev]
    })
  }

  // Colormap handlers (when selecting negative colormap, enable negative mapping)
  const handleColormapChange = (value: string): void => {
    setColormap(value)
    requestAnimationFrame(() => {
      try {
        parentMesh.setLayerProperty(idx, 'colormap', value, nv.gl)
        nv.updateGLVolume()
      } catch {
        // ignore
      }
    })
  }

  const handleColormapNegChange = (value: string): void => {
    setColormapNeg(value)
    requestAnimationFrame(() => {
      try {
        if (value === 'none') {
          parentMesh.setLayerProperty(idx, 'useNegativeCmap', false, nv.gl)
          parentMesh.setLayerProperty(idx, 'colormapNegative', '', nv.gl)
          setEnableNegativeMapping(false)
        } else {
          parentMesh.setLayerProperty(idx, 'useNegativeCmap', true, nv.gl)
          parentMesh.setLayerProperty(idx, 'colormapNegative', value, nv.gl)
          setEnableNegativeMapping(true)
        }
        nv.refreshColormaps?.()
        nv.updateGLVolume()
      } catch {
        // ignore
      }
    })
  }

  // Positive handlers
  const handlePosRangeChange = (value: number[]): void => setPosRange(value)
  const handlePosRangeCommit = (value: number[]): void => {
    setPosRange(value)
    requestAnimationFrame(() => {
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_min', value[0])
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_max', value[1])
      nv.updateGLVolume()
    })
  }
  const handlePosMinChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value
    const parsed = parseFloat(v)
    if (v === '' || v === '-' || Number.isNaN(parsed)) return
    const updated: number[] = [parsed, posRange[1]]
    setPosRange(updated)
    handlePosRangeCommit(updated)
  }
  const handlePosMaxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value
    const parsed = parseFloat(v)
    if (v === '' || v === '-' || Number.isNaN(parsed)) return
    const updated: number[] = [posRange[0], parsed]
    setPosRange(updated)
    handlePosRangeCommit(updated)
  }
  const handlePosInputBlur = (maybeVal: string, which: 'min' | 'max'): void => {
    const parsed = parseFloat(maybeVal)
    if (Number.isNaN(parsed)) return
    if (which === 'min') handlePosRangeCommit([parsed, posRange[1]])
    else handlePosRangeCommit([posRange[0], parsed])
  }

  // Negative handlers (local updates always allowed; commit only when useNegativeRange is true; otherwise NaN)
  const handleNegRangeChange = (value: number[]): void => setNegRange(value)
  const handleNegRangeCommit = (value: number[]): void => {
    commitNegRangeIfAllowed(value)
  }
  const handleNegMinChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value
    const parsed = parseFloat(v)
    if (v === '' || v === '-' || Number.isNaN(parsed)) return
    const updated = [parsed, negRange[1]]
    setNegRange(updated)
    commitNegRangeIfAllowed(updated)
  }
  const handleNegMaxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value
    const parsed = parseFloat(v)
    if (v === '' || v === '-' || Number.isNaN(parsed)) return
    const updated = [negRange[0], parsed]
    setNegRange(updated)
    commitNegRangeIfAllowed(updated)
  }
  const handleNegInputBlur = (maybeVal: string, which: 'min' | 'max'): void => {
    const parsed = parseFloat(maybeVal)
    if (Number.isNaN(parsed)) return
    if (which === 'min') commitNegRangeIfAllowed([parsed, negRange[1]])
    else commitNegRangeIfAllowed([negRange[0], parsed])
  }

  // handle toggling useNegativeRange checkbox
  const handleUseNegativeRangeToggle = (checked: boolean) => {
    setUseNegativeRange(checked)
    if (checked) {
      // commit current negRange to Niivue
      requestAnimationFrame(() => {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', negRange[0])
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', negRange[1])
        nv.updateGLVolume()
      })
    } else {
      // set them to NaN to disable negative cal range
      requestAnimationFrame(() => {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', NaN)
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', NaN)
        nv.updateGLVolume()
      })
    }
  }

  const handleOpacityChange = (value: number[]): void => {
    const v = value[0]
    setOpacity(v)
    const meshIndex = nv.meshes.indexOf(parentMesh)
    requestAnimationFrame(() => {
      nv.setMeshLayerProperty(meshIndex, idx, 'opacity', v)
    })
  }

  // Auto / Reset positive
  const autoRangePos = (): void => {
    const { min: meshMin, max: meshMax } = meshRange
    let target: number[] = [posRange[0], posRange[1]]
    if (isFinite(meshMin) && isFinite(meshMax) && meshMax > 0) {
      target = [Math.max(0, meshMin), Math.max(0, meshMax)]
    } else {
      const span = Math.max(1e-6, Math.abs(posRange[1] - posRange[0]))
      target = [posRange[0] - 0.1 * span, posRange[1] + 0.1 * span]
    }
    handlePosRangeCommit(target)
  }
  const resetPos = (): void => handlePosRangeCommit(initialPosRange.current.slice(0))

  // Auto / Reset negative (UI updates always; commit if useNegativeRange true; otherwise set NaN)
  const autoRangeNeg = (): void => {
    const { min: meshMin, max: meshMax } = meshRange
    let target: number[] = [negRange[0], negRange[1]]
    if (isFinite(meshMin) && isFinite(meshMax) && meshMin < 0) {
      target = [meshMin, Math.min(0, meshMax)]
    } else {
      const span = Math.max(1e-6, Math.abs(negRange[1] - negRange[0]))
      target = [negRange[0] - 0.1 * span, negRange[1] + 0.1 * span]
    }
    setNegRange(target)
    if (useNegativeRange) {
      requestAnimationFrame(() => {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', target[0])
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', target[1])
        nv.updateGLVolume()
      })
    } else {
      requestAnimationFrame(() => {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', NaN)
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', NaN)
        nv.updateGLVolume()
      })
    }
  }
  const resetNeg = (): void => {
    const t = initialNegRange.current.slice(0)
    setNegRange(t)
    if (useNegativeRange) {
      requestAnimationFrame(() => {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', t[0])
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', t[1])
        nv.updateGLVolume()
      })
    } else {
      requestAnimationFrame(() => {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', NaN)
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', NaN)
        nv.updateGLVolume()
      })
    }
  }

  const hasNegativeRange = meshRange.min < 0

  // slider bounds derived from meshRange so negative slider can go below 0
  const negSliderMin = Math.min(meshRange.min, negRange[0], -1)
  const negSliderMax = Math.min(0, Math.max(meshRange.max, negRange[1], 0))

  return (
    <Card className="flex flex-col p-2 my-1 ml-8 gap-2 bg-white">
      <div className="flex flex-row gap-2 items-center">
        <ContextMenu.Root>
          <ContextMenu.Trigger className="mr-auto">
            <Text title={image.name} size="2" weight="bold" className="mr-auto" truncate>
              {displayName}
            </Text>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item onClick={handleRemove}>Remove</ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>

        <Button onClick={handleVisibilityToggle} variant="ghost" color="gray">
          {visible ? <EyeOpenIcon width="20" height="20" /> : <EyeNoneIcon width="20" height="20" />}
        </Button>
      </div>

      <div className="flex flex-row justify-between gap-2">
        <Popover.Root>
          <Popover.Trigger>
            <Text size="1" color="gray" className="hover:underline cursor-pointer">
              options
            </Text>
          </Popover.Trigger>
          <Popover.Content side="right">
            <div className="flex flex-col gap-2 w-[320px] min-w-[320px]">
              <div className="flex gap-1 justify-between items-center">
                <Text size="1">Layer colormap</Text>
                <Select.Root size="1" value={colormap} defaultValue="warm" onValueChange={handleColormapChange}>
                  <Select.Trigger className="truncate w-3/4 min-w-3/4" />
                  <Select.Content className="truncate">
                    {colormaps.map((cmap, i) => (
                      <Select.Item key={i} value={cmap}>
                        {cmap}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <div className="flex items-center justify-between">
                <Text size="1">Positive range</Text>
                <div className="flex gap-1">
                  <Button size="1" variant="ghost" color="gray" onClick={autoRangePos}>
                    Auto
                  </Button>
                  <Button size="1" variant="ghost" color="gray" onClick={resetPos}>
                    Reset
                  </Button>
                </div>
              </div>

              <div className="flex gap-1 items-center">
                <TextField.Root
                  onChange={handlePosMinChange}
                  onBlur={(e) => handlePosInputBlur(e.target.value, 'min')}
                  type="number"
                  size="1"
                  value={posRange[0].toFixed(2)}
                />
                <Slider
                  size="1"
                  color="gray"
                  defaultValue={[posRange[0], posRange[1]]}
                  min={Math.min(posRange[0], 0)}
                  max={Math.max(posRange[1], 1)}
                  step={Math.abs(posRange[1] - posRange[0]) > 10 ? 1 : 0.1}
                  value={posRange}
                  onValueChange={(v) => handlePosRangeChange(v as number[])}
                  onValueCommit={(v) => handlePosRangeCommit(v as number[])}
                />
                <TextField.Root
                  onChange={handlePosMaxChange}
                  onBlur={(e) => handlePosInputBlur(e.target.value, 'max')}
                  type="Number"
                  size="1"
                  value={posRange[1].toFixed(2)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Text size="1">Negative values colormap</Text>
                <Select.Root size="1" value={colormapNeg} onValueChange={(v) => handleColormapNegChange(v)}>
                  <Select.Trigger className="truncate w-3/4 min-w-3/4" />
                  <Select.Content className="truncate">
                    <Select.Item value="none">None</Select.Item>
                    {colormaps.map((cmap, i) => (
                      <Select.Item key={i} value={cmap}>
                        {cmap}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <div className="flex items-center justify-between">
                <Text size="1">Enable negative mapping</Text>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableNegativeMapping}
                    onChange={(e) => setEnableNegativeMappingAndCommit(e.target.checked)}
                  />
                  <span className="text-xs text-gray-600">sets cal_min = 0 & useNegativeCmap</span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <Text size="1">Negative range</Text>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={useNegativeRange}
                      onChange={(e) => handleUseNegativeRangeToggle(e.target.checked)}
                      disabled={!enableNegativeMapping}
                      title="If checked, cal_minNeg/cal_maxNeg will be applied to Niivue"
                    />
                    <span className="text-xs text-gray-600">Use negative cal range</span>
                  </label>
                  <Button size="1" variant="ghost" color="gray" onClick={autoRangeNeg} disabled={!hasNegativeRange}>
                    Auto
                  </Button>
                  <Button size="1" variant="ghost" color="gray" onClick={resetNeg} disabled={!hasNegativeRange}>
                    Reset
                  </Button>
                </div>
              </div>

              <div className="flex gap-1 items-center">
                <TextField.Root
                  onChange={handleNegMinChange}
                  onBlur={(e) => handleNegInputBlur(e.target.value, 'min')}
                  type="number"
                  size="1"
                  value={negRange[0].toFixed(2)}
                  disabled={!useNegativeRange}
                />
                <Slider
                  size="1"
                  color="gray"
                  min={negSliderMin}
                  max={negSliderMax}
                  step={Math.abs(negRange[1] - negRange[0]) > 10 ? 1 : 0.1}
                  value={negRange}
                  onValueChange={(v) => handleNegRangeChange(v as number[])}
                  onValueCommit={(v) => handleNegRangeCommit(v as number[])}
                  disabled={!useNegativeRange}
                />
                <TextField.Root
                  onChange={handleNegMaxChange}
                  onBlur={(e) => handleNegInputBlur(e.target.value, 'max')}
                  type="number"
                  size="1"
                  value={negRange[1].toFixed(2)}
                  disabled={!useNegativeRange}
                />
              </div>

              {!hasNegativeRange && (
                <Text size="1" color="gray">
                  No negative values detected — you can still enable negative mapping and pre-select a negative colormap.
                </Text>
              )}

              <Text size="1">Opacity</Text>
              <div className="flex gap-1 items-center">
                <Slider
                  size="1"
                  min={0}
                  max={1}
                  step={0.1}
                  defaultValue={[opacity]}
                  value={[opacity]}
                  onValueChange={(v) => handleOpacityChange(v as number[])}
                  disabled={isOpacityDisabled}
                />
              </div>
            </div>
          </Popover.Content>
        </Popover.Root>

        <Text size="1" color="gray">
          mesh layer
        </Text>
      </div>
    </Card>
  )
}
