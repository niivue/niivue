import { useContext } from 'react'
import { AppContext } from '../App'
import { Button } from '@radix-ui/themes'

export const SliceSelection = (): JSX.Element => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  const handleL = (): void => {
    nv.moveCrosshairInVox(-1, 0, 0)
  }

  const handleR = (): void => {
    nv.moveCrosshairInVox(1, 0, 0)
  }

  const handleA = (): void => {
    nv.moveCrosshairInVox(0, 1, 0)
  }

  const handleP = (): void => {
    nv.moveCrosshairInVox(0, -1, 0)
  }

  const handleS = (): void => {
    nv.moveCrosshairInVox(0, 0, 1)
  }

  const handleI = (): void => {
    nv.moveCrosshairInVox(0, 0, -1)
  }

  return (
    <div className="flex flex-row">
      {/* column for the L button, centered vertically and horizontally in the column */}
      <div className="flex flex-col items-center justify-center mx-1">
        <Button size="1" onClick={handleL} className="font-mono" color="gray">
          L
        </Button>
      </div>
      {/* column for the A, P buttons centered horizontally and vertically */}
      <div className="flex flex-col items-center justify-center space-y-1 mx-1">
        <Button size="1" onClick={handleA} className="font-mono" color="gray">
          A
        </Button>
        <Button size="1" onClick={handleP} className="font-mono" color="gray">
          P
        </Button>
      </div>
      {/* column for the R button, centered vertically and horizontally in the column */}
      <div className="flex flex-col items-center justify-center mx-1">
        <Button size="1" onClick={handleR} className="font-mono" color="gray">
          R
        </Button>
      </div>
      {/* column for the S and I buttons */}
      <div className="flex flex-col items-center justify-center space-y-1 ml-4 mr-4">
        <Button size="1" onClick={handleS} className="font-mono" color="gray">
          S
        </Button>
        <Button size="1" onClick={handleI} className="font-mono" color="gray">
          I
        </Button>
      </div>
    </div>
  )
}
