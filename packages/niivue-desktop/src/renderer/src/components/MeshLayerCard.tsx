import { useEffect, useState, useRef, useMemo } from 'react'
import {
  Button,
  ContextMenu,
  Card,
  Text,
  Select,
  Popover,
  Slider,
  TextField,
  Dialog
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
  if (vals == null || typeof vals.length !== 'number' || vals.length === 0)
    return { min: 0, max: 1 }
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

/** small epsilon for float comparisons to avoid clobbering during typing */
const EPS = 1e-6

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
    [image.values, image.values?.length]
  )

  // Initialize posRange from the image properties (image.cal_min/cal_max)
  const [posRange, setPosRange] = useState<number[]>([
    typeof image.cal_min === 'number' && isFinite(image.cal_min)
      ? image.cal_min
      : Math.max(0, meshRange.min),
    typeof image.cal_max === 'number' && isFinite(image.cal_max)
      ? image.cal_max
      : Math.max(meshRange.max, 1)
  ])

  // Initialize negRange from image properties (image.cal_minNeg/cal_maxNeg)
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
  const [enableNegativeMapping, setEnableNegativeMapping] = useState<boolean>(
    () => meshRange.min < 0
  )
  // Secondary checkbox: apply cal_minNeg / cal_maxNeg to Niivue (enables slider)
  const [useNegativeRange, setUseNegativeRange] = useState<boolean>(() =>
    Number.isFinite(image.cal_minNeg) || Number.isFinite(image.cal_maxNeg)
      ? true
      : meshRange.min < 0
  )

  const [headerDialogOpen, setHeaderDialogOpen] = useState<boolean>(false)

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

  // Bind posRange to image.cal_min / image.cal_max: update UI when underlying layer props change
  useEffect(() => {
    const newMin =
      typeof image.cal_min === 'number' && isFinite(image.cal_min) ? image.cal_min : posRange[0]
    const newMax =
      typeof image.cal_max === 'number' && isFinite(image.cal_max) ? image.cal_max : posRange[1]
    // only apply if difference is meaningful to avoid fighting user typing
    if (Math.abs(newMin - posRange[0]) > EPS || Math.abs(newMax - posRange[1]) > EPS) {
      setPosRange([newMin, newMax])
    }
  }, [image.cal_min, image.cal_max])

  // Bind negRange to image.cal_minNeg / image.cal_maxNeg
  useEffect(() => {
    const newMinNeg = Number.isFinite(image.cal_minNeg) ? image.cal_minNeg : negRange[0]
    const newMaxNeg = Number.isFinite(image.cal_maxNeg) ? image.cal_maxNeg : negRange[1]
    if (Math.abs(newMinNeg - negRange[0]) > EPS || Math.abs(newMaxNeg - negRange[1]) > EPS) {
      setNegRange([newMinNeg, newMaxNeg])
    }
  }, [image.cal_minNeg, image.cal_maxNeg])

  // initial mount: ensure Niivue has current properties (and set NaN for neg if not used)
  useEffect(() => {
    initialPosRange.current = [posRange[0], posRange[1]]
    initialNegRange.current = [negRange[0], negRange[1]]

    const meshIndex = nv.meshes.indexOf(parentMesh)
    requestAnimationFrame(() => {
      nv.setMeshLayerProperty(meshIndex, idx, 'opacity', opacity)
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_min', posRange[0])
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_max', posRange[1])
      if (useNegativeRange) {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', negRange[0])
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', negRange[1])
      } else {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', NaN)
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', NaN)
      }

      try {
        parentMesh.setLayerProperty(idx, 'colormap', colormap, nv.gl)
        if (colormapNeg !== 'none') {
          parentMesh.setLayerProperty(idx, 'colormapNegative', colormapNeg, nv.gl)
        } else {
          parentMesh.setLayerProperty(idx, 'colormapNegative', '', nv.gl)
        }
        parentMesh.setLayerProperty(idx, 'useNegativeCmap', enableNegativeMapping, nv.gl)
        nv.refreshColormaps?.()
        nv.updateGLVolume()
      } catch {
        // ignore
      }
    })
  }, [])

  // helpers to commit negative usage & cal_min
  const setEnableNegativeMappingAndCommit = (checked: boolean): void => {
    setEnableNegativeMapping(checked)
    requestAnimationFrame(() => {
      if (checked) {
        // when enabling negative mapping we set cal_min to 0 (and update UI immediately)
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_min', 0)
        parentMesh.setLayerProperty(idx, 'useNegativeCmap', true, nv.gl)
        setPosRange((prev) => [0, prev[1]]) // <- ensure textbox/slider reflects cal_min = 0
      } else {
        parentMesh.setLayerProperty(idx, 'useNegativeCmap', false, nv.gl)
        // disable negative range and set cal_minNeg/cal_maxNeg to NaN
        setUseNegativeRange(false)
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', NaN)
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', NaN)
        // do NOT modify posRange here (leave positive min as-is)
      }
      nv.refreshColormaps?.()
      nv.updateGLVolume()
    })
  }

  const commitNegRangeIfAllowed = (value: number[]): void => {
    setNegRange(value)
    if (!useNegativeRange) {
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
          // ensure UI shows cal_min = 0 when a negative cmap is selected
          setPosRange((prev) => [0, prev[1]])
          // also request that niivue set cal_min to 0 to keep things consistent
          nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_min', 0)
        }
        nv.refreshColormaps?.()
        nv.updateGLVolume()
      } catch {
        // ignore
      }
    })
  }

  // Positive handlers
  // NOW: write to Niivue immediately when slider/textfield changes
  const handlePosRangeChange = (value: number[]): void => {
    setPosRange(value)
    requestAnimationFrame(() => {
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_min', value[0])
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_max', value[1])
      nv.updateGLVolume()
    })
  }
  // keep commit handler to support onValueCommit if used elsewhere
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
    // allow typing '-' or empty: don't write invalid values
    if (v === '' || v === '-') {
      setPosRange([posRange[0], posRange[1]])
      return
    }
    if (Number.isNaN(parsed)) return
    const updated: number[] = [parsed, posRange[1]]
    setPosRange(updated)
    // immediate write
    requestAnimationFrame(() => {
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_min', updated[0])
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_max', updated[1])
      nv.updateGLVolume()
    })
  }
  const handlePosMaxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value
    const parsed = parseFloat(v)
    if (v === '' || v === '-') {
      setPosRange([posRange[0], posRange[1]])
      return
    }
    if (Number.isNaN(parsed)) return
    const updated: number[] = [posRange[0], parsed]
    setPosRange(updated)
    requestAnimationFrame(() => {
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_min', updated[0])
      nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_max', updated[1])
      nv.updateGLVolume()
    })
  }
  const handlePosInputBlur = (maybeVal: string, which: 'min' | 'max'): void => {
    const parsed = parseFloat(maybeVal)
    if (Number.isNaN(parsed)) return
    if (which === 'min') {
      requestAnimationFrame(() => {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_min', parsed)
        nv.updateGLVolume()
      })
    } else {
      requestAnimationFrame(() => {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_max', parsed)
        nv.updateGLVolume()
      })
    }
  }

  // Negative handlers (now immediate on slider changes)
  const handleNegRangeChange = (value: number[]): void => {
    // respect apply toggle inside commit function
    commitNegRangeIfAllowed(value)
  }
  const handleNegRangeCommit = (value: number[]): void => {
    commitNegRangeIfAllowed(value)
  }
  const handleNegMinChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value
    const parsed = parseFloat(v)
    if (v === '' || v === '-') {
      setNegRange([negRange[0], negRange[1]])
      return
    }
    if (Number.isNaN(parsed)) return
    const updated = [parsed, negRange[1]]
    setNegRange(updated)
    commitNegRangeIfAllowed(updated)
  }
  const handleNegMaxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value
    const parsed = parseFloat(v)
    if (v === '' || v === '-') {
      setNegRange([negRange[0], negRange[1]])
      return
    }
    if (Number.isNaN(parsed)) return
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
  const handleUseNegativeRangeToggle = (checked: boolean): void => {
    setUseNegativeRange(checked)
    if (checked) {
      requestAnimationFrame(() => {
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_minNeg', negRange[0])
        nv.setMeshLayerProperty(parentMesh.id, idx, 'cal_maxNeg', negRange[1])
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
            {/* removed 'truncate' so the header text can wrap */}
            <Text
              title={image.name}
              size="2"
              weight="bold"
              className="mr-auto max-w-full break-words whitespace-normal"
            >
              {displayName}
            </Text>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item onClick={handleRemove}>Remove</ContextMenu.Item>
            <ContextMenu.Item onClick={() => setHeaderDialogOpen(true)}>
              Show Header
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>

        <Button onClick={handleVisibilityToggle} variant="ghost" color="gray">
          {visible ? (
            <EyeOpenIcon width="20" height="20" />
          ) : (
            <EyeNoneIcon width="20" height="20" />
          )}
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
                <Select.Root
                  size="1"
                  value={colormap}
                  defaultValue="warm"
                  onValueChange={handleColormapChange}
                >
                  {/* removed truncate props on triggers so dropdowns can wrap if needed */}
                  <Select.Trigger className="w-3/4 min-w-3/4" />
                  <Select.Content>
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
                  type="number"
                  size="1"
                  value={posRange[1].toFixed(2)}
                />
              </div>

              {/* === Grouped negative mapping section === */}
              <div className="p-2 rounded border bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <Text size="1">Enable negative mapping</Text>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enableNegativeMapping}
                      onChange={(e) => setEnableNegativeMappingAndCommit(e.target.checked)}
                    />
                    <span className="text-xs text-gray-600">
                      sets cal_min = 0 & useNegativeCmap
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <Text size="1">Negative values colormap</Text>
                  <Select.Root
                    size="1"
                    value={colormapNeg}
                    onValueChange={(v) => handleColormapNegChange(v)}
                    disabled={!enableNegativeMapping}
                  >
                    <Select.Trigger className="w-3/4 min-w-3/4" />
                    <Select.Content>
                      <Select.Item value="none">None</Select.Item>
                      {colormaps.map((cmap, i) => (
                        <Select.Item key={i} value={cmap}>
                          {cmap}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>

                <div className="flex items-center justify-between mt-2">
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
                    <Button
                      size="1"
                      variant="ghost"
                      color="gray"
                      onClick={autoRangeNeg}
                      disabled={!hasNegativeRange || !enableNegativeMapping}
                    >
                      Auto
                    </Button>
                    <Button
                      size="1"
                      variant="ghost"
                      color="gray"
                      onClick={resetNeg}
                      disabled={!hasNegativeRange || !enableNegativeMapping}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="flex gap-1 items-center mt-2">
                  <TextField.Root
                    onChange={handleNegMinChange}
                    onBlur={(e) => handleNegInputBlur(e.target.value, 'min')}
                    type="number"
                    size="1"
                    value={negRange[0].toFixed(2)}
                    disabled={!useNegativeRange || !enableNegativeMapping}
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
                    disabled={!useNegativeRange || !enableNegativeMapping}
                  />
                  <TextField.Root
                    onChange={handleNegMaxChange}
                    onBlur={(e) => handleNegInputBlur(e.target.value, 'max')}
                    type="number"
                    size="1"
                    value={negRange[1].toFixed(2)}
                    disabled={!useNegativeRange || !enableNegativeMapping}
                  />
                </div>

                {!hasNegativeRange && (
                  <Text size="1" color="gray">
                    No negative values detected — you can still enable negative mapping and
                    pre-select a negative colormap.
                  </Text>
                )}
              </div>
              {/* === end negative group === */}

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

      {/* Header dialog (SurfIce-style summary + details + histogram) */}
      <Dialog.Root open={headerDialogOpen} onOpenChange={setHeaderDialogOpen}>
        <Dialog.Trigger>
          {/* invisible trigger - we open via context menu */}
          <button style={{ display: 'none' }} type="button">
            Open Header
          </button>
        </Dialog.Trigger>
        <Dialog.Content
          className="p-4 bg-white rounded shadow"
          // reduce width to avoid horizontal overflow; dialog will expand vertically as needed
          style={{
            width: 680,
            maxWidth: 'calc(100vw - 48px)',
            maxHeight: 'none',
            overflowY: 'visible',
            wordBreak: 'break-word'
          }}
        >
          <Dialog.Title className="break-words whitespace-normal">{`Layer header — ${displayName}`}</Dialog.Title>
          <Dialog.Description className="mb-2">
            Summary for layer <strong>{displayName}</strong>
          </Dialog.Description>

          <MeshHeaderView
            image={image}
            idx={idx}
            meshRange={meshRange}
            posRange={posRange}
            negRange={negRange}
            useNegativeRange={useNegativeRange}
          />

          <div className="mt-4">
            <Button color="gray" onClick={() => setHeaderDialogOpen(false)}>
              Close
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </Card>
  )
}

/** Mesh header view: surf-ice style single-line summary + detailed table + histogram.
 * Detects atlases via atlasValues (typed arrays or arrays) and prints labels if present.
 *
 * Responsive histogram: measures container width and sizes canvas accordingly to avoid overflow.
 */
function MeshHeaderView({
  image,
  idx,
  meshRange,
  useNegativeRange
}: {
  image: NVMeshLayer
  idx: number
  meshRange: { min: number; max: number }
  posRange: number[]
  negRange: number[]
  useNegativeRange: boolean
}): JSX.Element {
  // Detect atlas by presence of atlasValues (works for arrays or typed arrays)
  const atlasVals = (image as unknown as { atlasValues?: AnyNumberArray }).atlasValues
  const isAtlas =
    atlasVals != null &&
    typeof (atlasVals as AnyNumberArray).length === 'number' &&
    (atlasVals as AnyNumberArray).length > 0

  const minIntensity =
    typeof image.cal_min === 'number' && isFinite(image.cal_min) ? image.cal_min : meshRange.min
  const maxIntensity =
    typeof image.cal_max === 'number' && isFinite(image.cal_max) ? image.cal_max : meshRange.max

  // Canvas ref for histogram + container ref for resizing
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // drawHistogram function uses measured width
  const drawHistogram = (widthPx: number, heightPx: number): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const DPR = window.devicePixelRatio || 1
    const width = Math.max(160, Math.floor(widthPx)) // ensure some minimal width
    const height = Math.max(80, Math.floor(heightPx))
    canvas.width = Math.round(width * DPR)
    canvas.height = Math.round(height * DPR)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Get values array
    const vals = (image.values ?? []) as AnyNumberArray
    if (
      !vals ||
      typeof (vals as AnyNumberArray).length !== 'number' ||
      (vals as AnyNumberArray).length === 0
    ) {
      // draw "no data"
      ctx.fillStyle = '#eee'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#666'
      ctx.font = '12px sans-serif'
      ctx.fillText('No numeric data for histogram', 8, Math.floor(height / 2))
      return
    }

    // Histogram parameters
    const N_BINS = 128
    const dataMin = meshRange.min
    const dataMax = meshRange.max === dataMin ? dataMin + 1 : meshRange.max
    const binWidth = (dataMax - dataMin) / N_BINS
    const counts = new Array(N_BINS).fill(0)

    for (let i = 0; i < (vals as AnyNumberArray).length; i++) {
      const v = vals[i] as number
      if (typeof v !== 'number' || !isFinite(v)) continue
      let bin = Math.floor((v - dataMin) / binWidth)
      if (bin < 0) bin = 0
      if (bin >= N_BINS) bin = N_BINS - 1
      counts[bin]++
    }

    const maxCount = Math.max(...counts, 1)

    // Background
    ctx.fillStyle = '#f8fafc' // light
    ctx.fillRect(0, 0, width, height)

    // Draw bars
    const paddingLeft = 8
    const paddingRight = 8
    const paddingTop = 8
    const paddingBottom = 26
    const drawW = width - paddingLeft - paddingRight
    const drawH = height - paddingTop - paddingBottom

    for (let b = 0; b < N_BINS; b++) {
      const cx = paddingLeft + (b / N_BINS) * drawW
      const w = Math.max(1, drawW / N_BINS - 1)
      const h = (counts[b] / maxCount) * drawH
      // bar color
      ctx.fillStyle = '#cbd5e1'
      ctx.fillRect(cx, paddingTop + (drawH - h), w, h)
    }

    // Overlay: visible range (cal_min..cal_max)
    const clampToCanvasX = (v: number): number =>
      paddingLeft + ((v - dataMin) / (dataMax - dataMin)) * drawW

    // cal_min / cal_max lines
    ctx.lineWidth = 2
    ctx.strokeStyle = '#ef4444' // red for positive visible range
    const calMin =
      typeof image.cal_min === 'number' && isFinite(image.cal_min) ? image.cal_min : NaN
    const calMax =
      typeof image.cal_max === 'number' && isFinite(image.cal_max) ? image.cal_max : NaN
    if (isFinite(calMin)) {
      const x = clampToCanvasX(calMin)
      ctx.beginPath()
      ctx.moveTo(x, paddingTop)
      ctx.lineTo(x, paddingTop + drawH)
      ctx.stroke()
    }
    if (isFinite(calMax)) {
      const x = clampToCanvasX(calMax)
      ctx.beginPath()
      ctx.moveTo(x, paddingTop)
      ctx.lineTo(x, paddingTop + drawH)
      ctx.stroke()
    }

    // Negative cal range (if applied) in blue (dashed)
    const calMinNeg =
      typeof image.cal_minNeg === 'number' && isFinite(image.cal_minNeg) ? image.cal_minNeg : NaN
    const calMaxNeg =
      typeof image.cal_maxNeg === 'number' && isFinite(image.cal_maxNeg) ? image.cal_maxNeg : NaN
    if (useNegativeRange && isFinite(calMinNeg)) {
      ctx.save()
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 2
      ctx.strokeStyle = '#2563eb' // blue
      const x1 = clampToCanvasX(calMinNeg)
      ctx.beginPath()
      ctx.moveTo(x1, paddingTop)
      ctx.lineTo(x1, paddingTop + drawH)
      ctx.stroke()
      if (isFinite(calMaxNeg)) {
        const x2 = clampToCanvasX(calMaxNeg)
        ctx.beginPath()
        ctx.moveTo(x2, paddingTop)
        ctx.lineTo(x2, paddingTop + drawH)
        ctx.stroke()
      }
      ctx.restore()
    }

    // Axis / labels: min/max numbers
    ctx.fillStyle = '#374151'
    ctx.font = '12px sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillText(dataMin.toFixed(3), paddingLeft, height - 18)
    ctx.textAlign = 'right'
    ctx.fillText(dataMax.toFixed(3), width - paddingRight, height - 18)
    ctx.textAlign = 'left'
  }

  // Resize observer to keep histogram fitting container width
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const heightPx = 120
    // initial draw at current width
    const rect = container.getBoundingClientRect()
    const widthPx = Math.max(160, rect.width - 0) // allow some minimal padding
    drawHistogram(widthPx, heightPx)

    // observe for later resizes
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.max(160, entry.contentRect.width)
          drawHistogram(w, heightPx)
        }
      })
      resizeObserverRef.current.observe(container)
    } else {
      // fallback: window resize
      const onResize = (): void => {
        const r = container.getBoundingClientRect()
        const w = Math.max(160, r.width)
        drawHistogram(w, heightPx)
      }
      window.addEventListener('resize', onResize)
      return (): void => {
        window.removeEventListener('resize', onResize)
      }
    }
    return (): void => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
    }
  }, [
    image.values,
    meshRange.min,
    meshRange.max,
    image.cal_min,
    image.cal_max,
    image.cal_minNeg,
    image.cal_maxNeg,
    useNegativeRange
  ])

  return (
    <div>
      {/* SurfIce-style one-line summary */}
      <Text size="1" className="mb-2 break-words whitespace-normal">
        <strong>{isAtlas ? 'Atlas' : 'Layer'}</strong> {idx + 1}
      </Text>

      {/* Histogram container: responsive, will size canvas inside */}
      <div ref={containerRef} className="mb-3" style={{ width: '100%', maxWidth: 600 }}>
        <canvas
          ref={canvasRef}
          // style width/height are controlled by drawHistogram; set a small default so it occupies space
          style={{ width: '100%', height: '120px', borderRadius: 4, display: 'block' }}
        />
      </div>

      {/* Detailed table */}
      <table className="table-auto border-collapse w-full text-sm text-left mb-3">
        <tbody>
          <tr>
            <th className="p-1 font-bold">Type</th>
            <td className="p-1">
              {isAtlas ? 'Atlas (discrete labels)' : 'Intensity (continuous)'}
            </td>
          </tr>

          <tr>
            <th className="p-1 font-bold">Layer Index</th>
            <td className="p-1">{idx + 1}</td>
          </tr>

          <tr>
            <th className="p-1 font-bold">Visible Range (cal_min..cal_max)</th>
            <td className="p-1">
              {minIntensity.toFixed(6)} .. {maxIntensity.toFixed(6)}
            </td>
          </tr>

          <tr>
            <th className="p-1 font-bold">Actual Data Range</th>
            <td className="p-1">
              {meshRange.min.toFixed(6)} .. {meshRange.max.toFixed(6)}
            </td>
          </tr>

          <tr>
            <th className="p-1 font-bold">Filename</th>
            {/* allow long filenames to wrap instead of causing scrolling */}
            <td
              className="p-1 break-words whitespace-normal max-w-full"
              style={{ wordBreak: 'break-word' }}
            >
              {image.name ?? '(no name)'}
            </td>
          </tr>

          <tr>
            <th className="p-1 font-bold">Value Count</th>
            <td className="p-1">
              {(image.values && (image.values as AnyNumberArray).length) ?? 'unknown'}
            </td>
          </tr>

          {isAtlas && (
            <>
              <tr>
                <th className="p-1 font-bold">Atlas Values</th>
                <td className="p-1">{(atlasVals as AnyNumberArray).length}</td>
              </tr>

              {Array.isArray(image.labels) && image.labels.length > 0 && (
                <tr>
                  <th className="p-1 font-bold align-top">Labels</th>
                  <td className="p-1">
                    <div className="text-xs max-h-48 overflow-auto">
                      {image.labels!.slice(0, 200).map((lab, i) => (
                        <div key={i}>
                          <strong>{lab.value ?? i}:</strong> {lab.name ?? lab.label ?? 'unnamed'}
                        </div>
                      ))}
                      {image.labels!.length > 200 && <div>... (truncated)</div>}
                    </div>
                  </td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>

      <Text size="1" color="gray">
        {isAtlas
          ? 'This layer appears to be an atlas (discrete label map). Use the colormap/legend controls to toggle label rendering.'
          : 'Continuous intensity layer. Use the positive / negative ranges and colormaps to adjust visualization.'}
      </Text>
    </div>
  )
}
