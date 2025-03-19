import { useEffect, useRef } from 'react'
import { useContext } from 'react'
import { AppContext } from '../App'
import { loadDroppedFiles } from '../utils/dragAndDrop'

export function Viewer(): JSX.Element {
  const context = useContext(AppContext)
  const { volumes, meshes, setVolumes, setMeshes, nvRef } = context
  const nv = nvRef.current
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement> | DragEvent): void => {
    console.log('drag over')
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement> | DragEvent): void => {
    if (!e.dataTransfer) {
      throw new Error('No dataTransfer object found on drag event object')
    }
    e.preventDefault()
    e.stopPropagation()
    nv.volumes = []
    nv.meshes = []
    nv.updateGLVolume()
    console.log('dropped files', e.dataTransfer.files)
    loadDroppedFiles(e, setVolumes, setMeshes, nv.gl)
  }

  useEffect(() => {
    if (canvasRef.current) {
      const nv = nvRef.current
      // register dragover and drop events
      canvasRef.current.addEventListener('dragover', handleDragOver)
      canvasRef.current.addEventListener('drop', handleDrop)
      await nv.attachToCanvas(canvasRef.current)
    }
  }, [])

  // when volumes array changes (added, removed), update the scene
  useEffect(() => {
    if (volumes.length > 0 && canvasRef.current) {
      const nv = nvRef.current
      nv.volumes = []
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
      nv.meshes = []
      for (let i = 0; i < meshes.length; i++) {
        console.log('adding mesh', meshes[i])
        nv.addMesh(meshes[i])
      }
    }
  }, [meshes])

  return (
    <div className="flex flex-col bg-black basis-2/3 h-full grow">
      {/* toolbar (empty for now) */}
      <div className="flex flex-row h-12 bg-black"></div>
      {/* 
        must account for h-12 (48px) toolbar height here or the resize
        behavior could get stuck in a loop
       */}
      <div className="w-full h-[calc(100%-48px)]">
        <canvas
          className="outline-none"
          ref={canvasRef}
          width={800}
          height={600}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        ></canvas>
      </div>
    </div>
  )
}
