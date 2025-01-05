import { useContext, useState, useEffect } from 'react'
import { AppContext } from '../App'
import { TextField, Button } from '@radix-ui/themes'

export const CrosshairSize = (): JSX.Element => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current
  const [crosshairWidth, setCrosshairWidth] = useState(nv.opts.crosshairWidth)

  useEffect(() => {
    nv.setCrosshairWidth(crosshairWidth)
  }, [crosshairWidth])

  return (
    <div className="flex flex-row items-center gap-x-1">
      <TextField.Root
        type="number"
        value={crosshairWidth}
        onChange={(e) => {
          setCrosshairWidth(parseInt(e.target.value))
        }}
        min={0}
        max={Number.POSITIVE_INFINITY}
        step={1}
        size="1"
      />
      {/* column of up and down arrows */}
      <div className="flex flex-col items-center justify-center">
        <Button
          onClick={() => {
            setCrosshairWidth((prev) => prev + 1)
          }}
          size="1"
          variant="ghost"
          className="font-mono mx-1 my-0.0"
          color="gray"
        >
          &#9650;
        </Button>
        <Button
          onClick={() => {
            setCrosshairWidth((prev) => (prev - 1 > 0 ? prev - 1 : 0))
          }}
          size="1"
          variant="ghost"
          className="font-mono mx-1 my-0.0"
          color="gray"
        >
          &#9660;
        </Button>
      </div>
    </div>
  )
}
