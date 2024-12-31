import { useEffect, useState, useContext } from 'react'
import {
  ContextMenu,
  Card,
  Text,
  Checkbox,
  Select,
  Popover,
  Slider,
  TextField
} from '@radix-ui/themes'
import { NVImage } from '@niivue/niivue'
import { baseName } from '../utils/baseName'
import { AppContext } from '@renderer/App'

export function VolumeImageCard({ image }: { image: NVImage }): JSX.Element {
  const [displayName, setDisplayName] = useState<string>(image.name)
  const [colormap, setColormap] = useState<string>(
    typeof image.colormap === 'string' ? image.colormap : 'gray'
  )
  const [intensity, setIntensity] = useState<number[]>([image.cal_min, image.cal_max])
  const [colormaps, setColormaps] = useState<string[]>([])
  const [visible, setVisible] = useState<boolean>(true)
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  useEffect(() => {
    setDisplayName(baseName(image.name))
  }, [image.name])

  useEffect(() => {
    // if (nv.volumes.length > 0) {
    setColormaps(nv.colormaps())
    // }
  }, [nv])

  const handleColormapChange = (value: string): void => {
    const id = image.id
    setColormap(value)
    // request animation frame removes the lag between react state rerenders and niivue updates
    requestAnimationFrame(() => {
      nv.setColormap(id, value)
    })
  }

  const handleIntensityChange = (value: number[]): void => {
    setIntensity(value)
  }

  const handleIntensityCommit = (value: number[]): void => {
    const id = image.id
    const volIdx = nv.getVolumeIndexByID(id)
    const vol = nv.volumes[volIdx]
    const [min, max] = value
    // request animation frame removes the lag between react state rerenders and niivue updates
    requestAnimationFrame(() => {
      vol.cal_min = min
      vol.cal_max = max
      nv.updateGLVolume()
    })
  }

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseFloat(e.target.value)
    setIntensity([value, intensity[1]])
    handleIntensityCommit([value, intensity[1]])
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseFloat(e.target.value)
    setIntensity([intensity[0], value])
    handleIntensityCommit([intensity[0], value])
  }

  const handleVisibilityChange = (value: boolean): void => {
    const id = image.id
    const volIdx = nv.getVolumeIndexByID(id)
    const checked = value
    setVisible(checked)
    // request animation frame removes the lag between react state rerenders and niivue updates
    requestAnimationFrame(() => {
      nv.setOpacity(volIdx, checked ? 1 : 0)
    })
  }

  return (
    <Card className="flex flex-col p-2 my-1 gap-2 bg-white">
      <div className="flex flex-row gap-2 items-center">
        <ContextMenu.Root>
          <ContextMenu.Trigger className="mr-auto">
            <Text title={image.name} size="2" weight="bold" className="mr-auto" truncate>
              {displayName}
            </Text>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item>Open</ContextMenu.Item>
            <ContextMenu.Item>Close</ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
        <Checkbox checked={visible} onCheckedChange={handleVisibilityChange} />
      </div>
      <div className="flex flex-row justify-between gap-2">
        <Popover.Root>
          <Popover.Trigger>
            <Text size="1" color="gray" className="hover:underline cursor-pointer">
              options
            </Text>
          </Popover.Trigger>
          <Popover.Content side="right">
            <div className="flex flex-col gap-2 width-[200px] min-w-[200px]">
              <div className="flex gap-1 justify-between items-center">
                <Text size="1">Colormap</Text>
                <Select.Root
                  size="1"
                  value={colormap}
                  defaultValue="gray"
                  onValueChange={handleColormapChange}
                >
                  <Select.Trigger className="truncate w-3/4 min-w-3/4" />
                  <Select.Content className="truncate">
                    {/* <Select.Item value="gray">gra</Select.Item>
                  <Select.Item value="red">red</Select.Item>
                  <Select.Item value="blue">blue</Select.Item> */}
                    {colormaps.map((cmap, idx) => (
                      <Select.Item key={idx} value={cmap}>
                        {cmap}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>

              <Text size="1">Intensity range</Text>
              {/* slider for intensity range */}
              <div className="flex gap-1 items-center">
                <TextField.Root
                  onChange={handleMinChange}
                  type="number"
                  size="1"
                  value={intensity[0]}
                />
                <Slider
                  size="1"
                  color="gray"
                  defaultValue={[image.cal_min, image.cal_max]}
                  min={image.global_min}
                  max={image.global_max}
                  step={intensity[1] > 10 ? 1 : 0.1}
                  value={intensity}
                  onValueChange={handleIntensityChange}
                  onValueCommit={handleIntensityCommit}
                />
                <TextField.Root
                  onChange={handleMaxChange}
                  type="number"
                  size="1"
                  value={intensity[1]}
                />
              </div>
            </div>
          </Popover.Content>
        </Popover.Root>
      </div>
    </Card>
  )
}
