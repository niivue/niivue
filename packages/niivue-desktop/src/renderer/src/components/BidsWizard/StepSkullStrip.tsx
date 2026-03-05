import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
import { NVImage, Niivue, SLICE_TYPE } from '@niivue/niivue'
import { brainchopService } from '../../services/brainchop/index.js'
import type { ModelInfo } from '../../services/brainchop/types.js'
import type { BidsSeriesMapping } from '../../../../common/bidsTypes.js'
import { dilateMask3D } from '../../services/brainchop/dilate3D.js'

const electron = window.electron

interface StepSkullStripProps {
  mappings: BidsSeriesMapping[]
  onMappingsUpdate: (mappings: BidsSeriesMapping[]) => void
  nv: Niivue | null
  onLoadVolume?: (niftiPath: string) => Promise<void>
  onLoadWithOverlay?: (basePath: string, overlayPath: string) => Promise<void>
}

interface PreviewState {
  seriesIndex: number
  original: NVImage
  stripped: NVImage
  originalPath: string
  strippedPath: string
}

export function StepSkullStrip({
  mappings,
  onMappingsUpdate,
  nv,
  onLoadVolume,
  onLoadWithOverlay
}: StepSkullStripProps): JSX.Element {
  const [modelId, setModelId] = useState('')
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => {
    const anatIndices = new Set<number>()
    for (const m of mappings) {
      if (!m.excluded && m.datatype === 'anat') {
        anatIndices.add(m.index)
      }
    }
    return anatIndices
  })
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  // Track original paths so we can offer loading both original and stripped
  const [originalPaths, setOriginalPaths] = useState<Map<number, string>>(new Map())

  const brainModels: ModelInfo[] = brainchopService.getModelsByType('brain-extraction')

  const toggleIndex = (index: number): void => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleRun = async (): Promise<void> => {
    if (!modelId || !nv || selectedIndices.size === 0) return

    setRunning(true)
    setError(null)
    setProgress(0)
    setPreview(null)

    const toProcess = mappings.filter((m) => selectedIndices.has(m.index) && !m.excluded)
    const updatedMappings = [...mappings]
    const newCompleted = new Set(completed)
    let processedCount = 0

    try {
      await brainchopService.initialize()

      for (const mapping of toProcess) {
        const seriesLabel = mapping.seriesDescription || `Series ${mapping.index}`
        setStatus(`Skull stripping: ${seriesLabel}`)

        // Load NIfTI from disk
        const base64 = await electron.ipcRenderer.invoke('loadFromFile', mapping.niftiPath)
        const vol = await NVImage.loadFromBase64({ base64, name: mapping.niftiPath })

        // Conform to 256^3 @ 1mm
        const conformed = await nv.conform(vol, false)

        // Clone the conformed volume before masking so we can show original
        const originalClone = conformed.clone()

        // Run brain extraction segmentation
        const result = await brainchopService.runSegmentation(conformed, modelId, {
          onProgress: (pct, msg) => {
            const overallPct = ((processedCount + pct / 100) / toProcess.length) * 100
            setProgress(Math.round(overallPct))
            if (msg) setStatus(`${seriesLabel}: ${msg}`)
          }
        })

        // Apply brain mask to conformed volume (with 3-voxel dilation for safety margin)
        const brain = conformed.img!
        const mask = result.volume.img!
        const dilatedMask = dilateMask3D(mask, 256, 256, 256, 3)
        for (let i = 0; i < brain.length; i++) {
          if (dilatedMask[i] === 0) brain[i] = 0
        }

        // Save skull-stripped NIfTI back to disk
        const niftiBytes = await conformed.saveToUint8Array('brain.nii.gz')
        const b64out = uint8ArrayToBase64(niftiBytes)
        const outputPath = mapping.niftiPath.replace(/\.nii(\.gz)?$/, '_brain.nii.gz')
        const saveResult = await electron.headlessSaveNifti(b64out, outputPath)

        if (!saveResult.success) {
          throw new Error(`Failed to save skull-stripped file: ${saveResult.error}`)
        }

        // Update preview with original and skull-stripped volumes
        setPreview({
          seriesIndex: mapping.index,
          original: originalClone,
          stripped: conformed,
          originalPath: mapping.niftiPath,
          strippedPath: outputPath
        })

        // Store original path before updating
        setOriginalPaths((prev) => new Map(prev).set(mapping.index, mapping.niftiPath))

        // Update mapping to point to skull-stripped file
        const idx = updatedMappings.findIndex((m) => m.index === mapping.index)
        if (idx >= 0) {
          updatedMappings[idx] = { ...updatedMappings[idx], niftiPath: outputPath }
        }

        newCompleted.add(mapping.index)
        setCompleted(new Set(newCompleted))
        processedCount++
        setProgress(Math.round((processedCount / toProcess.length) * 100))
      }

      setStatus(`Skull stripping complete (${processedCount} series)`)
      onMappingsUpdate(updatedMappings)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('Skull stripping failed')
    } finally {
      setRunning(false)
    }
  }

  // Allow clicking a completed series row to preview it
  const handlePreviewSeries = async (mapping: BidsSeriesMapping): Promise<void> => {
    if (!nv) return
    try {
      // Load the original (pre-skull-strip) NIfTI
      // The original path is the current niftiPath if not yet processed,
      // or we derive it from the _brain suffix
      const origPath = mapping.niftiPath.replace(/_brain\.nii(\.gz)?$/, '.nii.gz')
      const strippedPath = mapping.niftiPath

      const [origB64, strippedB64] = await Promise.all([
        electron.ipcRenderer.invoke('loadFromFile', origPath) as Promise<string>,
        electron.ipcRenderer.invoke('loadFromFile', strippedPath) as Promise<string>
      ])

      const [origVol, strippedVol] = await Promise.all([
        NVImage.loadFromBase64({ base64: origB64, name: origPath }),
        NVImage.loadFromBase64({ base64: strippedB64, name: strippedPath })
      ])

      setPreview({
        seriesIndex: mapping.index,
        original: origVol,
        stripped: strippedVol,
        originalPath: origPath,
        strippedPath: strippedPath
      })
    } catch {
      // Silently fail preview — not critical
    }
  }

  const nonExcluded = mappings.filter((m) => !m.excluded)
  const isSkipping = !modelId

  return (
    <div className="flex flex-col gap-3">
      <Text size="2" weight="bold">Skull Stripping (Optional)</Text>
      <Text size="1" color="gray">
        Optionally remove non-brain tissue from anatomical volumes using a brain extraction model.
        You can skip this step by clicking Next.
      </Text>

      {/* Model selector */}
      <div className="flex items-center gap-2">
        <Text size="1" weight="medium">Model:</Text>
        <select
          className="border rounded px-2 py-1 text-xs flex-1"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          disabled={running}
        >
          <option value="">Skip skull stripping</option>
          {brainModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.estimatedTimeSeconds}s est.)
            </option>
          ))}
        </select>
      </div>

      {/* Series selection */}
      {!isSkipping && (
        <div className="border rounded overflow-auto max-h-[140px]">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="py-1 px-2 text-left font-medium w-8"></th>
                <th className="py-1 px-2 text-left font-medium">Series</th>
                <th className="py-1 px-2 text-left font-medium">Type</th>
                <th className="py-1 px-2 text-left font-medium">Status</th>
                {onLoadVolume && <th className="py-1 px-2 text-left font-medium">Viewer</th>}
              </tr>
            </thead>
            <tbody>
              {nonExcluded.map((m) => (
                <tr
                  key={m.index}
                  className={
                    'border-t hover:bg-gray-50 cursor-pointer' +
                    (preview?.seriesIndex === m.index ? ' bg-blue-50' : '')
                  }
                  onClick={() => {
                    if (completed.has(m.index)) void handlePreviewSeries(m)
                  }}
                >
                  <td className="py-1 px-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIndices.has(m.index)}
                      onChange={() => toggleIndex(m.index)}
                      disabled={running}
                    />
                  </td>
                  <td className="py-1 px-2">{m.seriesDescription || `Series ${m.index}`}</td>
                  <td className="py-1 px-2">{m.datatype}/{m.suffix}</td>
                  <td className="py-1 px-2">
                    {completed.has(m.index) ? (
                      <span className="text-green-600">Done</span>
                    ) : running && selectedIndices.has(m.index) ? (
                      <span className="text-blue-600">Pending</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  {onLoadVolume && (
                    <td className="py-1 px-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {completed.has(m.index) && originalPaths.has(m.index) ? (
                          <>
                            <button
                              className="text-blue-600 hover:underline text-[10px] disabled:text-gray-300 disabled:no-underline"
                              disabled={running}
                              onClick={() => void onLoadVolume(originalPaths.get(m.index)!)}
                            >
                              Load Original
                            </button>
                            <button
                              className="text-blue-600 hover:underline text-[10px] disabled:text-gray-300 disabled:no-underline"
                              disabled={running}
                              onClick={() => void onLoadVolume(m.niftiPath)}
                            >
                              Load Stripped
                            </button>
                            {onLoadWithOverlay && (
                              <button
                                className="text-purple-600 hover:underline text-[10px] disabled:text-gray-300 disabled:no-underline"
                                disabled={running}
                                onClick={() => void onLoadWithOverlay(originalPaths.get(m.index)!, m.niftiPath)}
                              >
                                Original + Stripped
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            className="text-blue-600 hover:underline text-[10px] disabled:text-gray-300 disabled:no-underline"
                            disabled={running}
                            onClick={() => void onLoadVolume(m.niftiPath)}
                          >
                            Load
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Run button + progress */}
      {!isSkipping && (
        <div className="flex items-center gap-3">
          <Button
            size="1"
            onClick={() => void handleRun()}
            disabled={running || selectedIndices.size === 0 || !nv}
          >
            {running ? 'Running...' : `Run Skull Strip (${selectedIndices.size} series)`}
          </Button>
          {running && (
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status text */}
      {running && <Text size="1" color="gray">{status}</Text>}
      {!running && completed.size > 0 && <Text size="1" color="green">{status}</Text>}

      {/* Side-by-side preview */}
      {preview && (
        <SkullStripPreview
          original={preview.original}
          stripped={preview.stripped}
          originalPath={preview.originalPath}
          strippedPath={preview.strippedPath}
          onLoadVolume={onLoadVolume}
          onLoadWithOverlay={onLoadWithOverlay}
        />
      )}

      {/* Error */}
      {error && (
        <div className="p-2 text-xs text-red-700 bg-red-50 rounded border border-red-200">
          {error}
        </div>
      )}

      {!nv && !isSkipping && (
        <Text size="1" color="orange">
          No viewer instance available. Open a document first to enable skull stripping.
        </Text>
      )}
    </div>
  )
}

/** Side-by-side Niivue preview of original vs skull-stripped volume */
function SkullStripPreview({
  original,
  stripped,
  originalPath,
  strippedPath,
  onLoadVolume,
  onLoadWithOverlay
}: {
  original: NVImage
  stripped: NVImage
  originalPath: string
  strippedPath: string
  onLoadVolume?: (niftiPath: string) => Promise<void>
  onLoadWithOverlay?: (basePath: string, overlayPath: string) => Promise<void>
}): JSX.Element {
  const origCanvasRef = useRef<HTMLCanvasElement>(null)
  const stripCanvasRef = useRef<HTMLCanvasElement>(null)
  const origNvRef = useRef<Niivue | null>(null)
  const stripNvRef = useRef<Niivue | null>(null)

  const setupViewer = useCallback(async (
    canvas: HTMLCanvasElement | null,
    nvRef: React.MutableRefObject<Niivue | null>,
    volume: NVImage
  ): Promise<void> => {
    if (!canvas) return

    // Dispose previous instance
    if (nvRef.current) {
      try { nvRef.current.closeDrawing() } catch { /* ignore */ }
      nvRef.current = null
    }

    const viewer = new Niivue({ dragAndDropEnabled: false, isResizeCanvas: false })
    nvRef.current = viewer
    await viewer.attachToCanvas(canvas)
    viewer.addVolume(volume)
    viewer.setSliceType(SLICE_TYPE.MULTIPLANAR)
    viewer.updateGLVolume()
    viewer.drawScene()
  }, [])

  useEffect(() => {
    void setupViewer(origCanvasRef.current, origNvRef, original)
    void setupViewer(stripCanvasRef.current, stripNvRef, stripped)

    return (): void => {
      origNvRef.current = null
      stripNvRef.current = null
    }
  }, [original, stripped, setupViewer])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <Text size="1" weight="medium">Original</Text>
            {onLoadVolume && (
              <button
                className="text-blue-600 hover:underline text-[10px]"
                onClick={() => void onLoadVolume(originalPath)}
              >
                Load in Viewer
              </button>
            )}
          </div>
          <canvas
            ref={origCanvasRef}
            width={360}
            height={160}
            className="w-full h-[160px] bg-black rounded"
          />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <Text size="1" weight="medium">Skull Stripped</Text>
            {onLoadVolume && (
              <button
                className="text-blue-600 hover:underline text-[10px]"
                onClick={() => void onLoadVolume(strippedPath)}
              >
                Load in Viewer
              </button>
            )}
          </div>
          <canvas
            ref={stripCanvasRef}
            width={360}
            height={160}
            className="w-full h-[160px] bg-black rounded"
          />
        </div>
      </div>
      {onLoadWithOverlay && (
        <button
          className="text-purple-600 hover:underline text-xs text-center"
          onClick={() => void onLoadWithOverlay(originalPath, strippedPath)}
        >
          Load Original + Stripped Overlay in Viewer
        </button>
      )}
    </div>
  )
}

/** Convert Uint8Array to base64 in chunks to avoid stack overflow */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    parts.push(String.fromCharCode(...chunk))
  }
  return btoa(parts.join(''))
}
