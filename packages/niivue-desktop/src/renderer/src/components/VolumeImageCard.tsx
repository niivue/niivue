import { useEffect, useState, useContext } from 'react'
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
import { NVImage } from '@niivue/niivue'
import { baseName } from '../utils/baseName'
import { AppContext } from '@renderer/App'
import { EyeOpenIcon, EyeNoneIcon } from '@radix-ui/react-icons'

interface VolumeImageCardProps {
  image: NVImage
  onRemoveVolume: (volume: NVImage) => void
  onMoveVolumeUp: (volume: NVImage) => void
  onMoveVolumeDown: (volume: NVImage) => void
}

export function VolumeImageCard({
  image,
  onRemoveVolume,
  onMoveVolumeUp,
  onMoveVolumeDown
}: VolumeImageCardProps): JSX.Element {
  const [displayName, setDisplayName] = useState<string>(image.name)
  const [colormap, setColormap] = useState<string>(
    typeof image.colormap === 'string' ? image.colormap : 'gray'
  )
  const [intensity, setIntensity] = useState<number[]>([image.cal_min!, image.cal_max!])
  const [opacity, setOpacity] = useState<number>(1.0)
  const [colormaps, setColormaps] = useState<string[]>([])
  const [visible, setVisible] = useState<boolean>(true)
  const [isOpacityDisabled, setIsOpacityDisabled] = useState(false)
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

  const handleOpacityChange = (e: number[]): void => {
    const value = e[0]
    setOpacity(value)
    const volIdx = nv.getVolumeIndexByID(image.id)
    // request animation frame removes the lag between react state rerenders and niivue updates
    requestAnimationFrame(() => {
      nv.setOpacity(volIdx, value)
      nv.updateGLVolume()
    })
  }

  const handleVisibilityToggle = (): void => {
    const id = image.id
    const volIdx = nv.getVolumeIndexByID(id)
    const newVisibility = !visible
    setVisible(newVisibility)
    setIsOpacityDisabled(!newVisibility)
    requestAnimationFrame(() => {
      nv.setOpacity(volIdx, newVisibility ? 1 : 0)
      nv.updateGLVolume()
    })
  }

  return (
    <Card className="flex flex-col p-2 my-1 gap-2 bg-white">
      <div className="flex flex-row gap-2 items-center">
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <Text title={image.name} size="2" weight="bold" className="mr-auto">
              {displayName}
            </Text>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item
              onClick={() => {
                onRemoveVolume(image)
              }}
            >
              Remove
            </ContextMenu.Item>
            <ContextMenu.Item
              onClick={() => {
                onMoveVolumeUp(image)
              }}
            >
              Move Up
            </ContextMenu.Item>
            <ContextMenu.Item
              onClick={() => {
                onMoveVolumeDown(image)
              }}
            >
              Move Down
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
                  defaultValue={[image.cal_min!, image.cal_max!]}
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

              <Text size="1">Opacity</Text>
              {/* slider for volume alpha */}
              <div className="flex gap-1 items-center">
                <Slider
                  size="1"
                  min={0}
                  max={1}
                  step={0.1}
                  defaultValue={[1.0]}
                  value={opacity[0]}
                  onValueChange={handleOpacityChange}
                  disabled={isOpacityDisabled}
                />
              </div>
            </div>
          </Popover.Content>
        </Popover.Root>
        <Text size="1" color="gray">
          volume
        </Text>
      </div>
    </Card>
  )
}