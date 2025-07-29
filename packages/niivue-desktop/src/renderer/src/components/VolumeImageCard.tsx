import { useEffect, useState } from 'react'
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
import { NVImage } from '@niivue/niivue'
import { baseName } from '../utils/baseName.js'
import { useSelectedInstance } from '../AppContext.js' //
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
  // Local state based on image properties and UI controls
  const [displayName, setDisplayName] = useState<string>(image.name)
  const [colormap, setColormap] = useState<string>(
    typeof image.colormap === 'string' ? image.colormap : 'gray'
  )
  const [intensity, setIntensity] = useState<number[]>([image.cal_min!, image.cal_max!])
  const [opacity, setOpacity] = useState<number>(1.0)
  const [colormaps, setColormaps] = useState<string[]>([])
  const [visible, setVisible] = useState<boolean>(true)
  const [isOpacityDisabled, setIsOpacityDisabled] = useState(false)
  const [currentFrame, setCurrentFrame] = useState<number>(image.frame4D)

  // State to control the header dialog (to show NIfTI header info)
  const [headerDialogOpen, setHeaderDialogOpen] = useState<boolean>(false)

  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current
  if (!nv) return <></>

  // ——— Drag & Drop Handlers ———

  // Show copy cursor when dragging over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  // On drop, load each file as NVImage and add to Niivue + React state
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.dataTransfer) return

    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      // Skip mesh files
      if (nv.isMeshExt(file.name)) {
        continue
      }

      // Otherwise treat as volume (NIfTI, etc.)
      const base64 = await window.electron.ipcRenderer.invoke('loadFromFile', file.path)
      const vol = await NVImage.loadFromBase64({ base64, name: file.name })

      // 1) Add into Niivue
      nv.addVolume(vol)
      // 2) Push into React state
      instance.setVolumes(nv.volumes)
    }
    nv.updateGLVolume()
    nv.drawScene()
  }

  // Update the display name when image.name changes
  useEffect(() => {
    setDisplayName(baseName(image.name))
  }, [image.name])

  // Update available colormaps on load/update
  useEffect(() => {
    setColormaps(nv.colormaps())
  }, [nv])

  // Polling frame number if there are multiple frames
  useEffect(() => {
    const id = setInterval(() => {
      const frame = image.frame4D
      setCurrentFrame((prev) => (prev !== frame ? frame : prev))
    }, 100)
    return (): void => clearInterval(id)
  }, [image])

  const handleColormapChange = (value: string): void => {
    const id = image.id
    setColormap(value)
    // Request animation frame removes UI update lag from niivue update
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

  const handlePrevFrame = (): void => {
    let frame = nv.getFrame4D(image.id)
    frame = Math.max(0, frame - 1)
    nv.setFrame4D(image.id, frame)
    setCurrentFrame(frame)
  }

  const handleNextFrame = (): void => {
    const maxFrame = image.nFrame4D! - 1
    let frame = nv.getFrame4D(image.id)
    frame = Math.min(maxFrame, frame + 1)
    nv.setFrame4D(image.id, frame)
    setCurrentFrame(frame)
  }

  return (
    <Card
      className="flex flex-col p-2 my-1 gap-2 bg-white"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-row gap-2 items-center">
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <div className="flex items-center gap-2">
              <Text title={image.name} size="2" weight="bold" className="mr-auto">
                {displayName}
              </Text>
              {image.nFrame4D! > 1 && (
                <Text size="1" color="gray">
                  Frame {currentFrame + 1} / {image.nFrame4D}
                </Text>
              )}
              {image.nFrame4D! > 1 && (
                <div className="flex items-center gap-1">
                  <Button onClick={handlePrevFrame} variant="ghost" color="gray" size="1">
                    ◀
                  </Button>
                  <Button onClick={handleNextFrame} variant="ghost" color="gray" size="1">
                    ▶
                  </Button>
                </div>
              )}
            </div>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item onClick={() => onRemoveVolume(image)}>Remove</ContextMenu.Item>
            <ContextMenu.Item onClick={() => onMoveVolumeUp(image)}>Move Up</ContextMenu.Item>
            <ContextMenu.Item onClick={() => onMoveVolumeDown(image)}>Move Down</ContextMenu.Item>
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
              <div className="flex gap-1 items-center">
                <Slider
                  size="1"
                  min={0}
                  max={1}
                  step={0.1}
                  defaultValue={[1.0]}
                  value={[opacity]}
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

      {/* Dialog for displaying NIfTI header information */}
      <Dialog.Root open={headerDialogOpen} onOpenChange={setHeaderDialogOpen}>
        <Dialog.Trigger>
          {/* Invisible button to satisfy Dialog.Trigger */}
          <button style={{ display: 'none' }}>Open Header</button>
        </Dialog.Trigger>
        <Dialog.Content
          className="p-4 bg-white rounded shadow"
          style={{ width: 400, maxHeight: '80vh', overflowY: 'auto' }}
        >
          <Dialog.Title>NIfTI Header Information</Dialog.Title>
          <Dialog.Description className="mb-2">
            Detailed header info for <strong>{image.name}</strong>
          </Dialog.Description>
          <NiftiHeaderView image={image} />
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

// A helper component to render NIfTI header details from the NVImage
function NiftiHeaderView({ image }: { image: NVImage }): JSX.Element {
  const hdr = image.hdr
  if (!hdr) {
    return <Text>No header information available.</Text>
  }

  // Get a human-readable datatype string using hdr.getDatatypeCodeString
  const datatype = hdr.getDatatypeCodeString(hdr.datatypeCode)
  const dims = hdr.dims
  const pixDims = hdr.pixDims
  const littleEndian = hdr.littleEndian
  const vox_offset = hdr.vox_offset
  const xyzt_units = hdr.xyzt_units

  // Helper for spatial units (for dimensions I, J, K)
  const interpretSpatialUnits = (unitsVal: number | undefined): string => {
    switch (unitsVal) {
      case 2:
        return 'Millimeters'
      case 10:
        return 'Centimeters'
      case 1:
        return 'Meters'
      default:
        return `Unit code: ${unitsVal ?? 'unknown'}`
    }
  }

  // Helper for time units. In NIfTI, time units are stored in bits 3-5 of xyzt_units.
  const interpretTimeUnits = (unitsVal: number | undefined): string => {
    if (unitsVal === undefined) return 'unknown'
    const timeUnitCode = unitsVal & 0x38 // extract time-related bits
    switch (timeUnitCode) {
      case 8:
        return 'Seconds'
      case 16:
        return 'Milliseconds'
      case 24:
        return 'Microseconds'
      case 32:
        return 'Hertz'
      case 40:
        return 'PPM'
      default:
        return `Unit code: ${timeUnitCode || 'unknown'}`
    }
  }

  return (
    <div>
      {/* Dimensions Table */}
      <Text size="2" className="font-bold mb-1">
        Dimensions
      </Text>
      <table className="table-auto border-collapse w-full text-sm text-left mb-3">
        <tbody>
          <tr>
            <th className="p-1 font-bold">I:</th>
            <td className="p-1">{dims[1]}</td>
            <th className="p-1 font-bold">Spacing:</th>
            <td className="p-1">
              {pixDims?.[1]?.toFixed(4)} {interpretSpatialUnits(xyzt_units)}
            </td>
          </tr>
          <tr>
            <th className="p-1 font-bold">J:</th>
            <td className="p-1">{dims[2]}</td>
            <th className="p-1 font-bold">Spacing:</th>
            <td className="p-1">
              {pixDims?.[2]?.toFixed(4)} {interpretSpatialUnits(xyzt_units)}
            </td>
          </tr>
          <tr>
            <th className="p-1 font-bold">K:</th>
            <td className="p-1">{dims[3]}</td>
            <th className="p-1 font-bold">Spacing:</th>
            <td className="p-1">
              {pixDims?.[3]?.toFixed(4)} {interpretSpatialUnits(xyzt_units)}
            </td>
          </tr>
          {dims[0] >= 4 && (
            <>
              <tr>
                <th className="p-1 font-bold">Time:</th>
                <td className="p-1">{dims[4]}</td>
                <th className="p-1 font-bold">Spacing:</th>
                <td className="p-1">{pixDims?.[4]?.toFixed(4)}</td>
              </tr>
              <tr>
                <th className="p-1 font-bold">Time Units:</th>
                <td className="p-1" colSpan={3}>
                  {interpretTimeUnits(xyzt_units)}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {/* Other header fields in a description list */}
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-bold">Datatype</dt>
          <dd>{datatype}</dd>
        </div>
        <div>
          <dt className="font-bold">Voxel Offset</dt>
          <dd>{vox_offset}</dd>
        </div>
        <div>
          <dt className="font-bold">Endianness</dt>
          <dd>{littleEndian ? 'Little Endian' : 'Big Endian'}</dd>
        </div>
      </dl>
    </div>
  )
}
