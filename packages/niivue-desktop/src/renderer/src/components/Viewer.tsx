// src/components/Viewer.tsx
import { useEffect, useRef } from 'react'
import { NVImage, NVMesh } from '@niivue/niivue'
import { registerViewSync } from '../utils/viewSync.js'
import type { NiivueInstanceContext } from '../AppContext.js'
import { MESH_EXTENSIONS } from '../../../common/extensions.js'

const electron = window.electron

interface ViewerProps {
  doc: NiivueInstanceContext
  sidebarCollapsed: boolean
  rightPanelOpen?: boolean
  onToggleRightPanel?: () => void
}

// src/components/Viewer.tsx
export function Viewer({
  doc,
  sidebarCollapsed,
  rightPanelOpen,
  onToggleRightPanel
}: ViewerProps): JSX.Element {
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

  // Handle file drops on the canvas via native listener.
  // The core library's drop handler calls stopPropagation before checking
  // dragAndDropEnabled, so we attach our own listener directly on the canvas.
  useEffect(() => {
    const c = canvasRef.current!
    const dropHandler = async (e: DragEvent): Promise<void> => {
      const files = e.dataTransfer?.files
      if (!files?.length) return

      for (const file of Array.from(files)) {
        const base64 = await electron.ipcRenderer.invoke('loadFromFile', file.path)
        const name = file.name
        const ext = name.replace(/\.gz$/i, '').split('.').pop()?.toUpperCase() ?? ''
        const isMesh = MESH_EXTENSIONS.includes(ext)

        if (isMesh) {
          const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
          const mesh = await NVMesh.loadFromFile({
            file: new File([arrayBuffer], name),
            gl: nv.gl,
            name
          })
          nv.addMesh(mesh)
          doc.setMeshes([...nv.meshes])
        } else {
          const vol = await NVImage.loadFromBase64({ base64, name: file.path })
          nv.addVolume(vol)
          doc.setVolumes([...nv.volumes])
        }
      }
      nv.drawScene()
    }

    c.addEventListener('drop', dropHandler)
    return (): void => {
      c.removeEventListener('drop', dropHandler)
    }
  }, [nv, doc])

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
    <div
      data-testid="viewer"
      className={`flex flex-col bg-black h-full ${sidebarCollapsed ? 'basis-5/6' : 'basis-2/3'}`}
    >
      <div className="h-12 bg-black flex items-center justify-end px-3 gap-2">
        {onToggleRightPanel && (
          <button
            data-testid="toggle-right-panel"
            onClick={onToggleRightPanel}
            className="text-[var(--gray-8)] hover:text-white transition-colors p-1.5 rounded hover:bg-[var(--gray-11)]"
            title={rightPanelOpen ? 'Close panel' : 'Open panel'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        )}
      </div>
      <canvas
        data-testid="viewer-canvas"
        id={`gl-canvas-${doc.id}`}
        ref={canvasRef}
        className="w-full h-[calc(100%-48px)] block outline-none"
      />
    </div>
  )
}
