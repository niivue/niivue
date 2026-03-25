import { useEffect, useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
import { NVImage, Niivue, SLICE_TYPE } from '@niivue/niivue'
import { brainchopService } from '../../services/brainchop/index.js'
import type { BidsSeriesMapping } from '../../../../common/bidsTypes.js'
import { generateBidsPath, isBidsGuessT1 } from './bidsTreeUtil.js'
import { dilateMask3D } from '../../services/brainchop/dilate3D.js'
import { runWithConcurrency, defaultConcurrency } from '../../utils/concurrency.js'

const electron = window.electron

type Engine = 'none' | 'allineate' | 'brainchop'
type Scope = 'anat' | 'all'

interface StepSkullStripProps {
  mappings: BidsSeriesMapping[]
  onMappingsUpdate: (mappings: BidsSeriesMapping[]) => void
  nv: Niivue | null
  onLoadVolume?: (niftiPath: string) => Promise<void>
  onLoadWithOverlay?: (basePath: string, overlayPath: string) => Promise<void>
  initialOriginalPaths?: Map<number, string>
  onOriginalPathsChange?: (paths: Map<number, string>) => void
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
  onLoadWithOverlay,
  initialOriginalPaths,
  onOriginalPathsChange
}: StepSkullStripProps): JSX.Element {
  const [engine, setEngine] = useState<Engine>('none')
  const [scope, setScope] = useState<Scope>('anat')
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
  const [commandLine, setCommandLine] = useState<string | null>(null)
  const [generatePreviews, setGeneratePreviews] = useState(true)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [originalPaths, setOriginalPaths] = useState<Map<number, string>>(
    () => initialOriginalPaths ?? new Map()
  )
  const [useStripped, setUseStripped] = useState<Map<number, boolean>>(new Map())

  const nonExcluded = mappings.filter((m) => !m.excluded)

  // Update selectedIndices when scope changes
  useEffect(() => {
    if (engine === 'none') return
    const indices = new Set<number>()
    for (const m of nonExcluded) {
      if (scope === 'anat' && m.datatype === 'anat') {
        indices.add(m.index)
      } else if (scope === 'all') {
        indices.add(m.index)
      }
    }
    setSelectedIndices(indices)
  }, [scope, engine])

  const toggleIndex = (index: number): void => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  /** Run allineate skull-strip for a single series */
  const runAllineateSkullStrip = async (
    mapping: BidsSeriesMapping,
    onProgress: (pct: number) => void
  ): Promise<string> => {
    // Resolve paths to MNI152 head template and brain mask
    const [templatePath, maskPath] = await Promise.all([
      electron.ipcRenderer.invoke('allineate:standard-path', 'mni152_head') as Promise<
        string | null
      >,
      electron.ipcRenderer.invoke('allineate:standard-path', 'mniMask') as Promise<string | null>
    ])

    if (!templatePath) throw new Error('MNI152 head template not found')
    if (!maskPath) throw new Error('MNI brain mask not found')

    const outputPath = mapping.niftiPath.replace(/\.nii(\.gz)?$/, '_brain.nii.gz')

    // Use ls cost for T1 images (same-modality to MNI T1 template), hellinger for others (cross-modal)
    const cost = isBidsGuessT1(mapping) ? 'ls' : 'hel'

    // Show the exact command being run
    const cmd = `allineate ${templatePath} ${mapping.niftiPath} -cost ${cost} -skullstrip ${maskPath} ${outputPath}`
    console.log(`[allineate] ${cmd}`)
    setCommandLine(cmd)

    onProgress(10)

    // Run allineate with -skullstrip flag
    // Moving = MNI152 head template, Stationary = subject's image
    const result = await electron.allineateRegister(templatePath, mapping.niftiPath, outputPath, [
      '-cost',
      cost,
      '-skullstrip',
      maskPath
    ])

    if (!result.success) {
      throw new Error(`Allineate skull strip failed: ${result.error || result.stderr}`)
    }

    onProgress(100)
    return outputPath
  }

  /** Run brainchop skull-strip for a single series */
  const runBrainchopSkullStrip = async (
    mapping: BidsSeriesMapping,
    onProgress: (pct: number, msg?: string) => void
  ): Promise<string> => {
    if (!nv) throw new Error('No viewer instance available')

    // Load NIfTI from disk
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', mapping.niftiPath)
    const vol = await NVImage.loadFromBase64({ base64, name: mapping.niftiPath })

    // Conform to 256^3 @ 1mm
    const conformed = await nv.conform(vol, false)

    // Run brain extraction with MindGrab model
    const result = await brainchopService.runSegmentation(conformed, 'brain-extract-mindgrab', {
      onProgress: (pct, msg) => {
        onProgress(pct, msg)
      }
    })

    // Apply brain mask with 3-voxel dilation
    const brain = conformed.img!
    const mask = result.volume.img!
    const dilatedMask = dilateMask3D(mask, 256, 256, 256, 3)
    for (let i = 0; i < brain.length; i++) {
      if (dilatedMask[i] === 0) brain[i] = 0
    }

    // Save skull-stripped NIfTI
    const niftiBytes = await conformed.saveToUint8Array('brain.nii.gz')
    const b64out = uint8ArrayToBase64(niftiBytes)
    const outputPath = mapping.niftiPath.replace(/\.nii(\.gz)?$/, '_brain.nii.gz')
    const saveResult = await electron.headlessSaveNifti(b64out, outputPath)

    if (!saveResult.success) {
      throw new Error(`Failed to save skull-stripped file: ${saveResult.error}`)
    }

    // Set up preview with original and stripped (only if user opted in)
    if (generatePreviews) {
      const originalClone = vol
      setPreview({
        seriesIndex: mapping.index,
        original: originalClone,
        stripped: conformed,
        originalPath: mapping.niftiPath,
        strippedPath: outputPath
      })
    }

    return outputPath
  }

  const handleRun = async (): Promise<void> => {
    if (engine === 'none' || selectedIndices.size === 0) return
    if (engine === 'brainchop' && !nv) return

    if (engine === 'brainchop') {
      await brainchopService.initialize()
    }

    setRunning(true)
    setError(null)
    setProgress(0)
    setPreview(null)

    const toProcess = mappings.filter((m) => selectedIndices.has(m.index) && !m.excluded)
    const updatedMappings = [...mappings]
    const newCompleted = new Set(completed)
    const newOriginalPaths = new Map(originalPaths)
    let processedCount = 0

    try {
      if (engine === 'allineate') {
        // Parallel execution for allineate — each job spawns an independent child process
        setStatus(`Skull stripping (allineate): 0/${toProcess.length} complete`)

        const tasks = toProcess.map((mapping) => async () => {
          const outputPath = await runAllineateSkullStrip(mapping, () => {
            // Individual progress not meaningful for parallel — we track by completion count
          })
          return { mapping, outputPath }
        })

        await runWithConcurrency(tasks, defaultConcurrency, (result) => {
          const { mapping, outputPath } = result

          newOriginalPaths.set(mapping.index, mapping.niftiPath)

          const idx = updatedMappings.findIndex((m) => m.index === mapping.index)
          if (idx >= 0) {
            updatedMappings[idx] = { ...updatedMappings[idx], niftiPath: outputPath }
          }

          newCompleted.add(mapping.index)
          setCompleted(new Set(newCompleted))
          setUseStripped((prev) => new Map(prev).set(mapping.index, true))
          processedCount++
          setProgress(Math.round((processedCount / toProcess.length) * 100))
          setStatus(`Skull stripping (allineate): ${processedCount}/${toProcess.length} complete`)
        })

        // Load preview for the last processed series (only if user opted in)
        const lastMapping = toProcess[toProcess.length - 1]
        if (nv && generatePreviews && lastMapping) {
          const lastOutputPath = lastMapping.niftiPath.replace(/\.nii(\.gz)?$/, '_brain.nii.gz')
          try {
            const [origB64, strippedB64] = await Promise.all([
              electron.ipcRenderer.invoke('loadFromFile', lastMapping.niftiPath) as Promise<string>,
              electron.ipcRenderer.invoke('loadFromFile', lastOutputPath) as Promise<string>
            ])
            const [origVol, strippedVol] = await Promise.all([
              NVImage.loadFromBase64({ base64: origB64, name: lastMapping.niftiPath }),
              NVImage.loadFromBase64({ base64: strippedB64, name: lastOutputPath })
            ])
            setPreview({
              seriesIndex: lastMapping.index,
              original: origVol,
              stripped: strippedVol,
              originalPath: lastMapping.niftiPath,
              strippedPath: lastOutputPath
            })
          } catch {
            // Preview is non-critical
          }
        }
      } else {
        // Serial execution for brainchop — uses shared WebGL context
        for (const mapping of toProcess) {
          const seriesLabel = mapping.seriesDescription || `Series ${mapping.index}`
          setStatus(`Skull stripping (brainchop): ${seriesLabel}`)

          const outputPath = await runBrainchopSkullStrip(mapping, (pct, msg) => {
            const overallPct = ((processedCount + pct / 100) / toProcess.length) * 100
            setProgress(Math.round(overallPct))
            if (msg) setStatus(`${seriesLabel}: ${msg}`)
          })

          newOriginalPaths.set(mapping.index, mapping.niftiPath)

          const idx = updatedMappings.findIndex((m) => m.index === mapping.index)
          if (idx >= 0) {
            updatedMappings[idx] = { ...updatedMappings[idx], niftiPath: outputPath }
          }

          newCompleted.add(mapping.index)
          setCompleted(new Set(newCompleted))
          setUseStripped((prev) => new Map(prev).set(mapping.index, true))
          processedCount++
          setProgress(Math.round((processedCount / toProcess.length) * 100))
        }
      }

      // Persist all original paths at once after the loop
      setOriginalPaths(newOriginalPaths)
      onOriginalPathsChange?.(newOriginalPaths)

      setStatus(`Skull stripping complete (${processedCount} series)`)
      onMappingsUpdate(updatedMappings)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('Skull stripping failed')
      // Still commit any successful results
      if (processedCount > 0) {
        onMappingsUpdate(updatedMappings)
      }
    } finally {
      setRunning(false)
    }
  }

  const handlePreviewSeries = async (mapping: BidsSeriesMapping): Promise<void> => {
    if (!nv) return
    try {
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
      // Silently fail preview
    }
  }

  const isActive = engine !== 'none'

  return (
    <div className="flex flex-col gap-3">
      <Text size="2" weight="bold">
        Skull Stripping (Optional)
      </Text>
      <Text size="1" color="gray">
        Optionally remove non-brain tissue. Choose an engine below or select None to skip.
      </Text>

      {/* Engine selector */}
      <div className="flex items-center gap-2">
        <Text size="1" weight="medium">
          Engine:
        </Text>
        <div className="flex gap-1">
          {(
            [
              ['none', 'None (Skip)'],
              ['allineate', 'Allineate'],
              ['brainchop', 'Brainchop (MindGrab)']
            ] as [Engine, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              className={
                'px-3 py-1 text-xs rounded border transition-colors ' +
                (engine === value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')
              }
              onClick={() => setEngine(value)}
              disabled={running}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scope selector */}
      {isActive && (
        <div className="flex items-center gap-2">
          <Text size="1" weight="medium">
            Scope:
          </Text>
          <div className="flex gap-1">
            {(
              [
                ['anat', 'Anatomical Only'],
                ['all', 'All Series']
              ] as [Scope, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                className={
                  'px-3 py-1 text-xs rounded border transition-colors ' +
                  (scope === value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')
                }
                onClick={() => setScope(value)}
                disabled={running}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Series selection table */}
      {isActive && (
        <div className="border rounded overflow-auto max-h-[140px]">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="py-1 px-2 text-left font-medium w-8"></th>
                <th className="py-1 px-2 text-left font-medium">Series</th>
                <th className="py-1 px-2 text-left font-medium">Type</th>
                <th className="py-1 px-2 text-left font-medium">Status</th>
                <th className="py-1 px-2 text-left font-medium">Output</th>
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
                  <td className="py-1 px-2">
                    {m.datatype}/{m.suffix}
                  </td>
                  <td className="py-1 px-2">
                    {completed.has(m.index) ? (
                      <span className="text-green-600">Done</span>
                    ) : running && selectedIndices.has(m.index) ? (
                      <span className="text-blue-600">Pending</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-1 px-2" onClick={(e) => e.stopPropagation()}>
                    {completed.has(m.index) ? (
                      <select
                        className="text-xs border rounded px-1 py-0.5"
                        value={useStripped.get(m.index) !== false ? 'stripped' : 'original'}
                        onChange={(e) => {
                          const wantStripped = e.target.value === 'stripped'
                          setUseStripped((prev) => new Map(prev).set(m.index, wantStripped))
                          const origPath = originalPaths.get(m.index)
                          if (origPath) {
                            const strippedPath = origPath.replace(/\.nii(\.gz)?$/, '_brain.nii.gz')
                            onMappingsUpdate(
                              mappings.map((mp) =>
                                mp.index === m.index
                                  ? { ...mp, niftiPath: wantStripped ? strippedPath : origPath }
                                  : mp
                              )
                            )
                          }
                        }}
                        disabled={running}
                      >
                        <option value="stripped">Skull Stripped</option>
                        <option value="original">Original</option>
                      </select>
                    ) : (
                      <span className="text-gray-400 text-xs">Original</span>
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
                                onClick={() =>
                                  void onLoadWithOverlay(originalPaths.get(m.index)!, m.niftiPath)
                                }
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
      {isActive && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button
              size="1"
              onClick={() => void handleRun()}
              disabled={running || selectedIndices.size === 0 || (engine === 'brainchop' && !nv)}
            >
              {running ? 'Running...' : `Run Skull Strip (${selectedIndices.size} series)`}
            </Button>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={generatePreviews}
                onChange={(e) => setGeneratePreviews(e.target.checked)}
                disabled={running}
                className="w-3 h-3"
              />
              Generate previews
            </label>
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
        </div>
      )}

      {/* Status text */}
      {running && (
        <Text size="1" color="gray">
          {status}
        </Text>
      )}
      {!running && completed.size > 0 && (
        <Text size="1" color="green">
          {status}
        </Text>
      )}

      {/* Command line display */}
      {commandLine && (
        <div className="p-2 bg-gray-900 text-green-400 rounded text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
          $ {commandLine}
        </div>
      )}

      {/* Side-by-side preview */}
      {completed.size > 1 && preview && (
        <Text size="1" color="gray">
          Click a completed row above to preview a different series.
        </Text>
      )}
      {preview && (() => {
        const previewMapping = mappings.find((m) => m.index === preview.seriesIndex)
        const bidsPath = previewMapping ? generateBidsPath(previewMapping) : `Series ${preview.seriesIndex}`
        return (
          <SkullStripPreview
            key={preview.seriesIndex}
            bidsPath={bidsPath}
            original={preview.original}
            stripped={preview.stripped}
            originalPath={preview.originalPath}
            strippedPath={preview.strippedPath}
            onLoadVolume={onLoadVolume}
            onLoadWithOverlay={onLoadWithOverlay}
          />
        )
      })()}

      {/* Error */}
      {error && (
        <div className="p-2 text-xs text-red-700 bg-red-50 rounded border border-red-200">
          {error}
        </div>
      )}

      {engine === 'brainchop' && !nv && (
        <Text size="1" color="orange">
          No viewer instance available. Open a document first to enable Brainchop skull stripping.
        </Text>
      )}
    </div>
  )
}

/** Render a volume to an offscreen canvas, capture as data URL, release GL context */
async function renderToImage(volume: NVImage): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 160
  canvas.style.position = 'absolute'
  canvas.style.left = '-9999px'
  document.body.appendChild(canvas)

  const nv = new Niivue({ dragAndDropEnabled: false, isResizeCanvas: false })
  try {
    await nv.attachToCanvas(canvas)
    nv.addVolume(volume)
    nv.setSliceType(SLICE_TYPE.MULTIPLANAR)
    nv.updateGLVolume()
    nv.drawScene()
    return canvas.toDataURL('image/png')
  } finally {
    nv.volumes = []
    const ext = nv.gl?.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
    document.body.removeChild(canvas)
  }
}

/** Side-by-side Niivue preview of original vs skull-stripped volume */
function SkullStripPreview({
  bidsPath,
  original,
  stripped,
  originalPath,
  strippedPath,
  onLoadVolume,
  onLoadWithOverlay
}: {
  bidsPath: string
  original: NVImage
  stripped: NVImage
  originalPath: string
  strippedPath: string
  onLoadVolume?: (niftiPath: string) => Promise<void>
  onLoadWithOverlay?: (basePath: string, overlayPath: string) => Promise<void>
}): JSX.Element {
  const [origImage, setOrigImage] = useState<string | null>(null)
  const [stripImage, setStripImage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [origUrl, stripUrl] = await Promise.all([
        renderToImage(original),
        renderToImage(stripped)
      ])
      if (!cancelled) {
        setOrigImage(origUrl)
        setStripImage(stripUrl)
      }
    })()
    return () => { cancelled = true }
  }, [original, stripped])

  return (
    <div className="flex flex-col gap-2">
      <Text size="1" weight="bold" className="text-gray-700">
        Preview: {bidsPath}
      </Text>
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <Text size="1" weight="medium">
              Original
            </Text>
            {onLoadVolume && (
              <button
                className="text-blue-600 hover:underline text-[10px]"
                onClick={() => void onLoadVolume(originalPath)}
              >
                Load in Viewer
              </button>
            )}
          </div>
          {origImage ? (
            <img src={origImage} className="w-full h-[160px] bg-black rounded object-contain" />
          ) : (
            <div className="w-full h-[160px] bg-black rounded flex items-center justify-center text-gray-500 text-xs">
              Rendering...
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <Text size="1" weight="medium">
              Skull Stripped
            </Text>
            {onLoadVolume && (
              <button
                className="text-blue-600 hover:underline text-[10px]"
                onClick={() => void onLoadVolume(strippedPath)}
              >
                Load in Viewer
              </button>
            )}
          </div>
          {stripImage ? (
            <img src={stripImage} className="w-full h-[160px] bg-black rounded object-contain" />
          ) : (
            <div className="w-full h-[160px] bg-black rounded flex items-center justify-center text-gray-500 text-xs">
              Rendering...
            </div>
          )}
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
