import { useContext, useEffect, useState } from 'react'
import { AppContext } from '../App'
import { Slider, Text, Button, Checkbox } from '@radix-ui/themes'
import { INITIAL_SCENE_DATA } from '@niivue/niivue'

export const ZoomSlider = (): JSX.Element => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current
  const [zoom, setZoom] = useState([nv.scene.pan2Dxyzmm[3]])
  const [yoke2d3d, setYoke2d3d] = useState(false)

  useEffect(() => {
    nv.setPan2Dxyzmm([
      nv.scene.pan2Dxyzmm[0],
      nv.scene.pan2Dxyzmm[1],
      nv.scene.pan2Dxyzmm[2],
      zoom[0]
    ])
  }, [zoom])

  const handleReset = (): void => {
    const defaultZoom = INITIAL_SCENE_DATA.pan2Dxyzmm[3]
    setZoom([defaultZoom])
  }

  return (
    <div className="flex flex-row w-full items-center gap-x-1">
      {/* Button to reset */}
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
        onValueChange={(value) => {
          setZoom(value)
        }}
      />
      <Checkbox
        checked={yoke2d3d}
        onCheckedChange={(checked) => {
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
