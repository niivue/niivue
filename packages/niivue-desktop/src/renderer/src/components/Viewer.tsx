import { useEffect, useRef } from 'react'
import { Niivue } from '@niivue/niivue'
import { useContext } from 'react'
import { AppContext } from '../App'

export function Viewer(): JSX.Element {
  const context = useContext(AppContext)
  const { volumes } = context
  const { nvRef } = context
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // const nvRef = useRef<Niivue>(
  //   new Niivue({
  //     loadingText: ''
  //   })
  // )
  // if (!nv) {
  //   nv = nvRef
  // }

  useEffect(() => {
    if (canvasRef.current) {
      const nv = nvRef.current
      nv.attachToCanvas(canvasRef.current)
    }
    window.api.onToggleCrosshair((state: boolean) => {
      const nv = nvRef.current
      if (state) {
        nv.setCrosshairWidth(1)
      } else {
        nv.setCrosshairWidth(0)
      }
    })
  }, [])

  // when volumes array changes (added, removed), update the scene
  useEffect(() => {
    if (volumes.length > 0 && canvasRef.current) {
      const nv = nvRef.current
      for (let i = 0; i < volumes.length; i++) {
        console.log('adding volume', volumes[i])
        nv.addVolume(volumes[i])
      }
    }
  }, [volumes])

  return (
    <div className="flex flex-col bg-black basis-2/3 h-full">
      {/* toolbar */}
      <div className="flex flex-row h-12 bg-black"></div>
      <div>
        <canvas className="outline-none" ref={canvasRef} width={800} height={600}></canvas>
      </div>
    </div>
  )
}
