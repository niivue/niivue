// src/components/Viewer.tsx
import { useEffect, useRef } from 'react'
import { registerViewSync } from '../utils/viewSync.js'
import type { NiivueInstanceContext } from '../AppContext.js'

interface ViewerProps {
  doc: NiivueInstanceContext
  collapsed: boolean
}

// src/components/Viewer.tsx
export function Viewer({ doc, collapsed }: ViewerProps): JSX.Element {
  const nv = doc.nvRef.current
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasInit = useRef(false)

  useEffect(() => {
    const c = canvasRef.current!
    const ro = new ResizeObserver(([{ contentRect }]) => {
      const { width, height } = contentRect
      if (!width || !height) return

      if (!hasInit.current) {
        nv.attachToCanvas(c)
        registerViewSync(nv)
        nv.createEmptyDrawing() // one‐time allocate drawing texture
        nv.updateGLVolume()
        nv.drawScene()
        hasInit.current = true
      } else {
        nv.gl!.viewport(0, 0, width, height)
        nv.drawScene()
      }
    })

    ro.observe(c)
    return (): void => {
      ro.disconnect()
      hasInit.current = false
    }
  }, [doc.id, collapsed, nv])

  return (
    <div className={`flex flex-col bg-black h-full ${collapsed ? 'basis-5/6' : 'basis-2/3'}`}>
      <div className="h-12 bg-black" />
      <canvas
        id={`gl-canvas-${doc.id}`}
        ref={canvasRef}
        className="w-full h-[calc(100%-48px)] block outline-none"
      />
    </div>
  )
}
