import { Text, Slider } from '@radix-ui/themes'
import { useState } from 'react'
import { useSelectedInstance } from '../AppContext.js'

export const SliderMeshXRay = (): JSX.Element => {
  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current
  if (!nv) return <></>

  const [xRay, setXRay] = useState([0])

  const handleXRayChange = (value: number[]): void => {
    setXRay(value)
    nv.opts.meshXRay = value[0]
    nv.drawScene()
  }

  return (
    <div className="flex flex-col">
      {/* Slider for clipping depth */}
      <Text size="2" className="mb-1">
        Mesh XRay
      </Text>
      <Slider
        size="1"
        min={0}
        max={1}
        step={0.1}
        value={xRay}
        className="mb-2"
        style={{ width: '90%' }}
        onValueChange={handleXRayChange}
      />
    </div>
  )
}
