import { Text, Slider } from '@radix-ui/themes'
import { useState, useContext } from 'react'
import { AppContext } from '../App'

export const SliderMeshDepth2D = (): JSX.Element => {
  const { nvRef } = useContext(AppContext)
  const [clippingDepth, setClippingDepth] = useState([11])
  const nv = nvRef.current

  const handleClippingDepthChange = (value: number[]): void => {
    let clip = value[0]
    if (clip > 10) clip = Infinity
    setClippingDepth(value)
    nv.setMeshThicknessOn2D(clip)
  }

  return (
    <div className="flex flex-col">
      {/* Slider for clipping depth */}
      <Text size="2" className="mb-1">
        Mesh depth on 2D
      </Text>
      <Slider
        size="1"
        min={0}
        max={11}
        step={1}
        value={clippingDepth}
        className="mb-2"
        style={{ width: '90%' }}
        onValueChange={handleClippingDepthChange}
      />
    </div>
  )
}
