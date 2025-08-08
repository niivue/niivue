import { useEffect, useState } from 'react'
import { Slider, Text, Button, Checkbox } from '@radix-ui/themes'
import { INITIAL_SCENE_DATA } from '@niivue/niivue'
import { useSelectedInstance } from '../AppContext.js'

export const ZoomSlider = (): JSX.Element => {
  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current

  const initialZoom = nv?.scene.pan2Dxyzmm[3] ?? INITIAL_SCENE_DATA.pan2Dxyzmm[3]
  const [zoom, setZoom] = useState([initialZoom])
  const [yoke2d3d, setYoke2d3d] = useState(false)

  useEffect(() => {
    if (!nv) return
    const currentZoom = nv.scene.pan2Dxyzmm[3]
    if (Math.abs(currentZoom - zoom[0]) > 1e-3) {
      nv.setPan2Dxyzmm([
        nv.scene.pan2Dxyzmm[0],
        nv.scene.pan2Dxyzmm[1],
        nv.scene.pan2Dxyzmm[2],
        zoom[0]
      ])
    }
  }, [zoom, nv])

  const handleReset = (): void => {
    setZoom([INITIAL_SCENE_DATA.pan2Dxyzmm[3]])
  }

  if (!nv) return <></> // don't render if no selected document

  return (
    <div className="flex flex-row w-full items-center gap-x-1">
      <Button size="1" onClick={handleReset} className="font-mono" color="gray">
        reset
      </Button>
      <Slider
        style={{ width: '40%' }}
        size="1"
        id="sliderZoom"
        min={INITIAL_SCENE_DATA.pan2Dxyzmm[3]}
        max={10}
        step={0.1}
        value={zoom}
        onValueChange={(value) => setZoom(value)}
      />
      <Checkbox
        checked={yoke2d3d}
        onCheckedChange={(checked) => {
          if (!nv) return
          if (checked === true) {
            setYoke2d3d(true)
            nv.opts.yoke3Dto2DZoom = true
            nv.volScaleMultiplier = zoom[0]
          }
          if (checked === false) {
            setYoke2d3d(false)
            nv.opts.yoke3Dto2DZoom = false
          }
        }}
      />
      <Text size="1">Yoke 3D</Text>
    </div>
  )
}
