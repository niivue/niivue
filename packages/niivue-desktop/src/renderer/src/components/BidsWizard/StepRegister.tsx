import { useEffect, useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
import { NVImage, Niivue, SLICE_TYPE } from '@niivue/niivue'
import type { BidsSeriesMapping } from '../../../../common/bidsTypes.js'
import { isBidsGuessT1 } from './bidsTreeUtil.js'
import { runWithConcurrency, defaultConcurrency } from '../../utils/concurrency.js'

const electron = window.electron

interface StepRegisterProps {
  mappings: BidsSeriesMapping[]
  onMappingsUpdate: (mappings: BidsSeriesMapping[]) => void
  nv: Niivue | null
  onLoadVolume?: (niftiPath: string) => Promise<void>
  onLoadWithOverlay?: (basePath: string, overlayPath: string) => Promise<void>
  /** Called by the wizard's Next button — if images are checked but not yet registered, runs registration first */
  registerBeforeNext?: React.MutableRefObject<(() => Promise<boolean>) | null>
}

type TargetMode = 'series' | 'standard' | 'file'

interface PreviewState {
  seriesIndex: number
  original: NVImage
  registered: NVImage
  originalPath: string
  registeredPath: string
}

export function StepRegister({
  mappings,
  onMappingsUpdate,
  nv,
  onLoadVolume,
  onLoadWithOverlay,
  registerBeforeNext
}: StepRegisterProps): JSX.Element {
  // Target selection
  const [targetMode, setTargetMode] = useState<TargetMode>('series')
  const [targetSeriesIndex, setTargetSeriesIndex] = useState<number>(-1)
  const [targetFilePath, setTargetFilePath] = useState('')
  const [standardTemplate, setStandardTemplate] = useState('mni152')

  // Registration options
  const [useCmass, setUseCmass] = useState(false)

  // Series to register
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // Processing state
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [originalPaths, setOriginalPaths] = useState<Map<number, string>>(new Map())

  const [showCompleteBanner, setShowCompleteBanner] = useState(false)

  const nonExcluded = mappings.filter((m) => !m.excluded)

  // Auto-select the first anat series as target
  useEffect(() => {
    if (targetSeriesIndex === -1 && nonExcluded.length > 0) {
      const anat = nonExcluded.find((m) => m.datatype === 'anat')
      if (anat) setTargetSeriesIndex(anat.index)
    }
  }, [nonExcluded, targetSeriesIndex])

  // Expose auto-run to the wizard's Next button
  useEffect(() => {
    if (!registerBeforeNext) return
    registerBeforeNext.current = async (): Promise<boolean> => {
      // Check if there are selected but not-yet-completed series
      const uncompleted = [...selectedIndices].filter((idx) => !completed.has(idx))
      if (uncompleted.length === 0) return true // nothing to do, proceed

      // Auto-run registration
      await handleRun()
      return true // proceed after registration completes
    }
    return () => {
      if (registerBeforeNext) registerBeforeNext.current = null
    }
  })

  const toggleIndex = (index: number): void => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const getTargetPath = async (): Promise<string | null> => {
    switch (targetMode) {
      case 'series': {
        const target = mappings.find((m) => m.index === targetSeriesIndex)
        return target?.niftiPath || null
      }
      case 'standard': {
        // Resolve the standard image path via IPC
        const path = await electron.ipcRenderer.invoke(
          'allineate:standard-path',
          standardTemplate
        ) as string | null
        return path
      }
      case 'file':
        return targetFilePath || null
    }
  }

  const handleBrowseTarget = async (): Promise<void> => {
    const paths = await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Select Target/Stationary Image',
      filters: [
        { name: 'NIfTI', extensions: ['nii', 'nii.gz', 'gz'] },
        { name: 'All files', extensions: ['*'] }
      ]
    }) as string[]
    if (paths && paths.length > 0) {
      setTargetFilePath(paths[0])
    }
  }

  const handleRun = async (): Promise<void> => {
    if (selectedIndices.size === 0) return

    const stationaryPath = await getTargetPath()
    if (!stationaryPath) {
      setError('No target/stationary image selected')
      return
    }

    setRunning(true)
    setError(null)
    setProgress(0)
    setPreview(null)

    const toProcess = mappings.filter(
      (m) => selectedIndices.has(m.index) && !m.excluded &&
        !(targetMode === 'series' && m.index === targetSeriesIndex)
    )
    const updatedMappings = [...mappings]
    const newCompleted = new Set(completed)
    let processedCount = 0
    setStatus(`Registering: 0/${toProcess.length} complete`)

    try {
      const tasks = toProcess.map((mapping) => async () => {
        const seriesLabel = mapping.seriesDescription || `Series ${mapping.index}`
        const outputPath = mapping.niftiPath.replace(/\.nii(\.gz)?$/, '_reg.nii.gz')

        // Build allineate options
        const cost = isBidsGuessT1(mapping) ? 'ls' : 'hel'
        const opts: string[] = ['-cost', cost]
        if (useCmass) opts.push('-cmass')

        const cmdLine = `allineate ${mapping.niftiPath} ${stationaryPath} ${opts.join(' ')} ${outputPath}`
        console.log(`[allineate] ${cmdLine}`)

        const result = await electron.allineateRegister(
          mapping.niftiPath,
          stationaryPath,
          outputPath,
          opts
        )

        if (!result.success) {
          throw new Error(`Registration failed for ${seriesLabel}: ${result.error}`)
        }

        return { mapping, outputPath }
      })

      await runWithConcurrency(tasks, defaultConcurrency, (result, _i) => {
        const { mapping, outputPath } = result

        // Store original path before updating
        setOriginalPaths((prev) => new Map(prev).set(mapping.index, mapping.niftiPath))

        // Update mapping to point to registered file
        const idx = updatedMappings.findIndex((m) => m.index === mapping.index)
        if (idx >= 0) {
          updatedMappings[idx] = { ...updatedMappings[idx], niftiPath: outputPath }
        }

        newCompleted.add(mapping.index)
        setCompleted(new Set(newCompleted))
        processedCount++
        setProgress(Math.round((processedCount / toProcess.length) * 100))
        setStatus(`Registering: ${processedCount}/${toProcess.length} complete`)
      })

      // Load preview for the last processed series
      const lastResult = toProcess[toProcess.length - 1]
      if (nv && lastResult) {
        const lastOutputPath = lastResult.niftiPath.replace(/\.nii(\.gz)?$/, '_reg.nii.gz')
        try {
          const [origB64, regB64] = await Promise.all([
            electron.ipcRenderer.invoke('loadFromFile', lastResult.niftiPath) as Promise<string>,
            electron.ipcRenderer.invoke('loadFromFile', lastOutputPath) as Promise<string>
          ])
          const [origVol, regVol] = await Promise.all([
            NVImage.loadFromBase64({ base64: origB64, name: lastResult.niftiPath }),
            NVImage.loadFromBase64({ base64: regB64, name: lastOutputPath })
          ])
          setPreview({
            seriesIndex: lastResult.index,
            original: origVol,
            registered: regVol,
            originalPath: lastResult.niftiPath,
            registeredPath: lastOutputPath
          })
        } catch {
          // Preview is non-critical
        }
      }

      setStatus(`Registration complete (${processedCount} series)`)
      setShowCompleteBanner(true)
      onMappingsUpdate(updatedMappings)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('Registration failed')
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
      const origPath = originalPaths.get(mapping.index) || mapping.niftiPath
      const regPath = mapping.niftiPath

      const [origB64, regB64] = await Promise.all([
        electron.ipcRenderer.invoke('loadFromFile', origPath) as Promise<string>,
        electron.ipcRenderer.invoke('loadFromFile', regPath) as Promise<string>
      ])
      const [origVol, regVol] = await Promise.all([
        NVImage.loadFromBase64({ base64: origB64, name: origPath }),
        NVImage.loadFromBase64({ base64: regB64, name: regPath })
      ])

      setPreview({
        seriesIndex: mapping.index,
        original: origVol,
        registered: regVol,
        originalPath: origPath,
        registeredPath: regPath
      })
    } catch {
      // Silently fail preview
    }
  }

  // Determine which series can be registered (only exclude the target when using a series as target)
  const registerableSeries = nonExcluded.filter((m) =>
    !(targetMode === 'series' && m.index === targetSeriesIndex)
  )

  return (
    <div className="flex flex-col gap-3">
      <Text size="2" weight="bold">Registration (Optional)</Text>
      <Text size="1" color="gray">
        Co-register images to a target using affine registration.
        Common use: register fMRI or DWI to an anatomical T1, or register T1 to MNI standard space.
        You can skip this step by clicking Next.
      </Text>

      {/* Target selection */}
      <div className="flex flex-col gap-2 p-3 bg-[var(--gray-2)] rounded border">
        <Text size="1" weight="medium">Target (Stationary) Image</Text>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-xs">
            <input
              type="radio"
              name="targetMode"
              checked={targetMode === 'series'}
              onChange={() => setTargetMode('series')}
              disabled={running}
            />
            From series
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="radio"
              name="targetMode"
              checked={targetMode === 'standard'}
              onChange={() => setTargetMode('standard')}
              disabled={running}
            />
            Standard template
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="radio"
              name="targetMode"
              checked={targetMode === 'file'}
              onChange={() => setTargetMode('file')}
              disabled={running}
            />
            Browse file
          </label>
        </div>

        {targetMode === 'series' && (
          <select
            className="border rounded px-2 py-1 text-xs"
            value={targetSeriesIndex}
            onChange={(e) => setTargetSeriesIndex(Number(e.target.value))}
            disabled={running}
          >
            <option value={-1}>Select target series...</option>
            {nonExcluded.map((m) => (
              <option key={m.index} value={m.index}>
                {m.seriesDescription || `Series ${m.index}`} ({m.datatype}/{m.suffix})
              </option>
            ))}
          </select>
        )}

        {targetMode === 'standard' && (
          <select
            className="border rounded px-2 py-1 text-xs"
            value={standardTemplate}
            onChange={(e) => setStandardTemplate(e.target.value)}
            disabled={running}
          >
            <option value="mni152">MNI152 (1mm, skull-stripped)</option>
          </select>
        )}

        {targetMode === 'file' && (
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-2 py-1 text-xs flex-1"
              value={targetFilePath}
              onChange={(e) => setTargetFilePath(e.target.value)}
              placeholder="Path to target NIfTI..."
              disabled={running}
            />
            <Button size="1" variant="soft" onClick={() => void handleBrowseTarget()} disabled={running}>
              Browse
            </Button>
          </div>
        )}
      </div>

      {/* Cost function info + options */}
      <div className="flex items-center gap-4">
        <Text size="1" color="gray">
          Cost: Least Squares for T1w, Hellinger for others (automatic)
        </Text>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={useCmass}
            onChange={(e) => setUseCmass(e.target.checked)}
            disabled={running}
          />
          Center-of-mass init
        </label>
      </div>

      {/* Series selection */}
      <div className="border rounded overflow-auto max-h-[140px]">
        <table className="w-full text-xs">
          <thead className="bg-[var(--gray-2)] sticky top-0">
            <tr>
              <th className="py-1 px-2 text-left font-medium w-8"></th>
              <th className="py-1 px-2 text-left font-medium">Series</th>
              <th className="py-1 px-2 text-left font-medium">Type</th>
              <th className="py-1 px-2 text-left font-medium">Cost</th>
              <th className="py-1 px-2 text-left font-medium">Status</th>
              {onLoadVolume && <th className="py-1 px-2 text-left font-medium">Viewer</th>}
            </tr>
          </thead>
          <tbody>
            {registerableSeries.map((m) => (
              <tr
                key={m.index}
                className={
                  'border-t hover:bg-[var(--gray-2)] cursor-pointer' +
                  (preview?.seriesIndex === m.index ? ' bg-[var(--accent-3)]' : '')
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
                <td className="py-1 px-2">{isBidsGuessT1(m) ? 'ls' : 'hel'}</td>
                <td className="py-1 px-2">
                  {completed.has(m.index) ? (
                    <span className="text-[var(--green-11)]">Done</span>
                  ) : running && selectedIndices.has(m.index) ? (
                    <span className="text-[var(--accent-11)]">Pending</span>
                  ) : (
                    <span className="text-[var(--gray-8)]">-</span>
                  )}
                </td>
                {onLoadVolume && (
                  <td className="py-1 px-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {completed.has(m.index) && originalPaths.has(m.index) ? (
                        <>
                          <button
                            className="text-[var(--accent-11)] hover:underline text-[10px] disabled:text-[var(--gray-6)]"
                            disabled={running}
                            onClick={() => void onLoadVolume(originalPaths.get(m.index)!)}
                          >
                            Original
                          </button>
                          <button
                            className="text-[var(--accent-11)] hover:underline text-[10px] disabled:text-[var(--gray-6)]"
                            disabled={running}
                            onClick={() => void onLoadVolume(m.niftiPath)}
                          >
                            Registered
                          </button>
                          {onLoadWithOverlay && (
                            <button
                              className="text-[var(--purple-11)] hover:underline text-[10px] disabled:text-[var(--gray-6)]"
                              disabled={running}
                              onClick={() => void onLoadWithOverlay(originalPaths.get(m.index)!, m.niftiPath)}
                            >
                              Overlay
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          className="text-[var(--accent-11)] hover:underline text-[10px] disabled:text-[var(--gray-6)]"
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

      {/* Run button + progress */}
      <div className="flex items-center gap-3">
        <Button
          size="1"
          onClick={() => void handleRun()}
          disabled={running || selectedIndices.size === 0}
        >
          {running ? 'Registering...' : `Register (${selectedIndices.size} series)`}
        </Button>
        {running && (
          <div className="flex-1">
            <div className="w-full bg-[var(--gray-4)] rounded-full h-2">
              <div
                className="h-2 rounded-full bg-[var(--accent-9)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      {running && <Text size="1" color="gray">{status}</Text>}

      {/* Completion banner */}
      {showCompleteBanner && !running && (
        <div className="p-2 text-xs text-[var(--green-11)] bg-[var(--green-3)] rounded border border-[var(--green-6)] flex items-center justify-between">
          <span>Registration complete ({completed.size} series registered successfully)</span>
          <button className="ml-2 underline text-[var(--green-11)]" onClick={() => setShowCompleteBanner(false)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <RegisterPreview
          original={preview.original}
          registered={preview.registered}
          originalPath={preview.originalPath}
          registeredPath={preview.registeredPath}
          onLoadVolume={onLoadVolume}
          onLoadWithOverlay={onLoadWithOverlay}
        />
      )}

      {/* Error */}
      {error && (
        <div className="p-2 text-xs text-[var(--red-11)] bg-[var(--red-3)] rounded border border-[var(--red-6)]">
          {error}
        </div>
      )}
    </div>
  )
}

/** Side-by-side Niivue preview of original vs registered volume */
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

function RegisterPreview({
  original,
  registered,
  originalPath,
  registeredPath,
  onLoadVolume,
  onLoadWithOverlay
}: {
  original: NVImage
  registered: NVImage
  originalPath: string
  registeredPath: string
  onLoadVolume?: (niftiPath: string) => Promise<void>
  onLoadWithOverlay?: (basePath: string, overlayPath: string) => Promise<void>
}): JSX.Element {
  const [origImage, setOrigImage] = useState<string | null>(null)
  const [regImage, setRegImage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [origUrl, regUrl] = await Promise.all([
        renderToImage(original),
        renderToImage(registered)
      ])
      if (!cancelled) {
        setOrigImage(origUrl)
        setRegImage(regUrl)
      }
    })()
    return () => { cancelled = true }
  }, [original, registered])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <Text size="1" weight="medium">Original</Text>
            {onLoadVolume && (
              <button
                className="text-[var(--accent-11)] hover:underline text-[10px]"
                onClick={() => void onLoadVolume(originalPath)}
              >
                Load in Viewer
              </button>
            )}
          </div>
          {origImage ? (
            <img src={origImage} className="w-full h-[160px] bg-black rounded object-contain" />
          ) : (
            <div className="w-full h-[160px] bg-black rounded flex items-center justify-center text-[var(--gray-9)] text-xs">
              Rendering...
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <Text size="1" weight="medium">Registered</Text>
            {onLoadVolume && (
              <button
                className="text-[var(--accent-11)] hover:underline text-[10px]"
                onClick={() => void onLoadVolume(registeredPath)}
              >
                Load in Viewer
              </button>
            )}
          </div>
          {regImage ? (
            <img src={regImage} className="w-full h-[160px] bg-black rounded object-contain" />
          ) : (
            <div className="w-full h-[160px] bg-black rounded flex items-center justify-center text-[var(--gray-9)] text-xs">
              Rendering...
            </div>
          )}
        </div>
      </div>
      {onLoadWithOverlay && (
        <button
          className="text-[var(--purple-11)] hover:underline text-xs text-center"
          onClick={() => void onLoadWithOverlay(registeredPath, originalPath)}
        >
          Load Registered + Original Overlay in Viewer
        </button>
      )}
    </div>
  )
}
