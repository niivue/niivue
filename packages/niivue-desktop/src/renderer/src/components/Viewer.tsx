// src/components/Viewer.tsx
import { useEffect, useRef } from 'react'
import { registerViewSync } from '../utils/viewSync.js'
import type { NiivueInstanceContext } from '../AppContext.js'

const electron = window.electron

interface ViewerProps {
  doc: NiivueInstanceContext
  sidebarCollapsed: boolean
  rightPanelOpen?: boolean
  onToggleRightPanel?: () => void
}

// src/components/Viewer.tsx
export function Viewer({ doc, sidebarCollapsed, rightPanelOpen, onToggleRightPanel }: ViewerProps): JSX.Element {
  const nv = doc.nvRef.current
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasInit = useRef(false)

  useEffect(() => {
    const hasBase = doc.volumes.length > 0
    if (hasBase) {
      electron.ipcRenderer.send('base-image-loaded')
    } else {
      electron.ipcRenderer.send('base-image-removed')
    }
  }, [doc.volumes])

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
  }, [doc.id, sidebarCollapsed, nv])

  return (
    <div className={`flex flex-col bg-black h-full ${sidebarCollapsed ? 'basis-5/6' : 'basis-2/3'}`}>
      <div className="h-12 bg-black flex items-center justify-end px-3 gap-2">
        {onToggleRightPanel && (
          <button
            onClick={onToggleRightPanel}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded hover:bg-gray-700"
            title={rightPanelOpen ? 'Close panel' : 'Open panel'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        )}
      </div>
      <canvas
        id={`gl-canvas-${doc.id}`}
        ref={canvasRef}
        className="w-full h-[calc(100%-48px)] block outline-none"
      />
    </div>
  )
}
