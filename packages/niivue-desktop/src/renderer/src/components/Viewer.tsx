import { useEffect, useRef } from 'react'
import { useContext } from 'react'
import { AppContext } from '../App'

export function Viewer(): JSX.Element {
  const context = useContext(AppContext)
  const { volumes } = context
  const { meshes } = context
  const { nvRef } = context
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const nv = nvRef.current
      nv.attachToCanvas(canvasRef.current)
    }
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

  // when meshes array changes (added, removed), update the scene
  useEffect(() => {
    if (meshes.length > 0 && canvasRef.current) {
      const nv = nvRef.current
      for (let i = 0; i < meshes.length; i++) {
        console.log('adding mesh', meshes[i])
        nv.addMesh(meshes[i])
      }
    }
  }, [meshes])

  return (
    <div className="flex flex-col bg-black basis-2/3 h-full">
      {/* toolbar (empty for now) */}
      <div className="flex flex-row h-12 bg-black"></div>
      <div>
        <canvas className="outline-none" ref={canvasRef} width={800} height={600}></canvas>
      </div>
    </div>
  )
}
