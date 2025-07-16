import { useEffect, useRef } from 'react'
import { NiivueInstanceContext } from '../AppContext.js'
import { loadDroppedFiles } from '../utils/dragAndDrop.js'
import { registerViewSync } from '@renderer/utils/viewSync.js'

type ViewerProps = {
  doc: NiivueInstanceContext
  collapsed: boolean
}

export function Viewer({ doc, collapsed }: ViewerProps): JSX.Element {
  const nv = doc.nvRef.current
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement> | DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement> | DragEvent): void => {
    if (!e.dataTransfer || !nv) return
    e.preventDefault()
    e.stopPropagation()
    nv.volumes = []
    nv.meshes = []
    nv.updateGLVolume()
    loadDroppedFiles(e, doc.setVolumes, doc.setMeshes, nv.gl)
  }

  useEffect(() => {
    if (!canvasRef.current || !nv) return

    nv.attachToCanvas(canvasRef.current)
    registerViewSync(nv)

    canvasRef.current.addEventListener('dragover', handleDragOver)
    canvasRef.current.addEventListener('drop', handleDrop)

    return (): void => {
      canvasRef.current?.removeEventListener('dragover', handleDragOver)
      canvasRef.current?.removeEventListener('drop', handleDrop)
    }
  }, [nv])

  useEffect(() => {
    if (!nv || !canvasRef.current) return
    nv.volumes = []
    doc.volumes.forEach((v) => nv.addVolume(v))
  }, [doc.volumes])

  useEffect(() => {
    if (!nv || !canvasRef.current) return
    nv.meshes = []
    doc.meshes.forEach((m) => nv.addMesh(m))
  }, [doc.meshes])

  return (
    <div
      className={
        `flex flex-col bg-black h-full grow relative transition-all duration-200 ` +
        (collapsed
          ? 'basis-5/6' // when sidebar is collapsed, viewer takes more space
          : 'basis-2/3') // when sidebar is open
      }
    >
      <div className="flex flex-row h-12 bg-black" />
      <div className="w-full h-[calc(100%-48px)]">
        <canvas
          id={`gl-canvas-${doc.id}`}
          className="w-full h-full block outline-none"
          ref={canvasRef}
          tabIndex={0}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      </div>
    </div>
  )
}
