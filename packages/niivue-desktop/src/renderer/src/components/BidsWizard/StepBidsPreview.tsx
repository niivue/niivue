import React, { useCallback, useEffect, useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
import { CheckIcon } from '@radix-ui/react-icons'
import { Niivue, NVImage, SLICE_TYPE } from '@niivue/niivue'
import type {
  BidsSeriesMapping,
  DetectedSubject,
  BidsValidationIssue
} from '../../../../common/bidsTypes.js'
import { buildBidsTree, generateBidsPath } from './bidsTreeUtil.js'

const electron = window.electron

interface StepBidsPreviewProps {
  context: Record<string, unknown>
  onFieldChange: (fieldName: string, value: unknown) => void
  onLoadFile?: (niftiPath: string) => Promise<void>
}

interface ValidationResult {
  valid: boolean
  errors: BidsValidationIssue[]
  warnings: BidsValidationIssue[]
}

/** Render a single NIfTI file to a static thumbnail, releasing the GL context immediately.
 * Uses readPixels + 2D canvas because Niivue's WebGL context is created without
 * preserveDrawingBuffer, so canvas.toDataURL() on the WebGL canvas returns blank. */
async function renderPreviewImage(niftiPath: string): Promise<string | null> {
  const W = 120
  const H = 120
  const glCanvas = document.createElement('canvas')
  glCanvas.width = W
  glCanvas.height = H
  glCanvas.style.position = 'absolute'
  glCanvas.style.left = '-9999px'
  document.body.appendChild(glCanvas)

  const nv = new Niivue({
    isResizeCanvas: false,
    show3Dcrosshair: false,
    backColor: [0, 0, 0, 1],
    crosshairWidth: 0
  })

  try {
    await nv.attachToCanvas(glCanvas)
    const base64: string = await electron.ipcRenderer.invoke('loadFromFile', niftiPath)
    if (!base64) {
      console.warn('[bids-preview] loadFromFile returned empty for', niftiPath)
      return null
    }
    const vol = await NVImage.loadFromBase64({ base64, name: niftiPath })
    nv.addVolume(vol)
    nv.setSliceType(SLICE_TYPE.RENDER)
    nv.updateGLVolume()
    nv.drawScene()

    const gl = nv.gl
    if (!gl) return null
    const pixels = new Uint8Array(W * H * 4)
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    // WebGL pixel rows are bottom-up; ImageData expects top-down — flip Y.
    const flipped = new Uint8ClampedArray(W * H * 4)
    const rowBytes = W * 4
    for (let y = 0; y < H; y++) {
      const srcStart = (H - 1 - y) * rowBytes
      flipped.set(pixels.subarray(srcStart, srcStart + rowBytes), y * rowBytes)
    }
    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    const ctx = out.getContext('2d')
    if (!ctx) return null
    ctx.putImageData(new ImageData(flipped, W, H), 0, 0)
    return out.toDataURL('image/png')
  } catch (err) {
    console.warn('[bids-preview] renderPreviewImage failed for', niftiPath, err)
    return null
  } finally {
    nv.volumes = []
    const ext = nv.gl?.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
    document.body.removeChild(glCanvas)
  }
}

/** Hook that renders all preview thumbnails sequentially (one GL context at a time) */
function useSeriesPreviews(paths: string[]): Map<string, string> {
  const [images, setImages] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      for (const path of paths) {
        if (cancelled) break
        const url = await renderPreviewImage(path)
        if (cancelled) break
        if (url) {
          setImages((prev) => new Map(prev).set(path, url))
        }
      }
    })()
    return () => { cancelled = true }
  }, [paths.join('\n')])

  return images
}

export function StepBidsPreview({ context, onLoadFile }: StepBidsPreviewProps): React.ReactElement {
  const mappings = (context.series_list as BidsSeriesMapping[]) || []
  const subjects = (context.subjects as DetectedSubject[]) || []
  const datasetName = (context.dataset_name as string) || 'my_bids_dataset'
  const outputDir = (context.output_dir as string) || ''

  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [loadedPaths, setLoadedPaths] = useState<Set<string>>(new Set())

  const handleOpenInViewer = useCallback(
    async (path: string): Promise<void> => {
      if (!onLoadFile) return
      await onLoadFile(path)
      setLoadedPaths((prev) => (prev.has(path) ? prev : new Set(prev).add(path)))
    },
    [onLoadFile]
  )

  const originalPaths = (context._originalPaths as Record<number, string>) || {}
  const included = mappings.filter((m) => !m.excluded)
  const excluded = mappings.filter((m) => m.excluded)

  // If skull-stripping ran for this series, the stripped file lives at the
  // conventional `.brain.nii.gz` location next to the original. We derive it
  // from `_originalPaths` instead of trusting `m.niftiPath`, because heuristics
  // that re-fire on section entry (bids-classify) may reset niftiPath back to
  // the sidecar-derived original even though the stripped file still exists.
  const strippedPathFor = (m: BidsSeriesMapping): string => {
    const orig = originalPaths[m.index]
    if (!orig) return m.niftiPath
    return orig.replace(/\.nii(\.gz)?$/, '.brain.nii.gz')
  }

  // Collect all unique NIfTI paths that need previews
  const previewPaths = React.useMemo(() => {
    const paths: string[] = []
    for (const m of included) {
      paths.push(strippedPathFor(m))
      const orig = originalPaths[m.index]
      if (orig) paths.push(orig)
    }
    return paths
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [included, originalPaths])

  // Render all thumbnails sequentially (one GL context at a time)
  const previewImages = useSeriesPreviews(previewPaths)
  const includedSubjects = subjects.filter((s) => !s.excluded)
  const tree = buildBidsTree(mappings, originalPaths)

  // Count files by datatype
  const datatypeCounts: Record<string, number> = {}
  for (const m of included) {
    datatypeCounts[m.datatype] = (datatypeCounts[m.datatype] || 0) + 1
  }

  // Re-validate whenever the mappings, subjects, or dataset metadata change.
  // Mappings/subjects are populated asynchronously by heuristics (bids-classify
  // and detect-subjects fire after the section mounts), so a mount-only effect
  // sees empty data and reports "No series selected for conversion" forever.
  useEffect(() => {
    let cancelled = false
    const validate = async (): Promise<void> => {
      setValidating(true)
      try {
        const allDemographics: Record<string, import('../../../../common/bidsTypes.js').ParticipantDemographics> = {}
        for (const sub of subjects) {
          if (!sub.excluded) {
            allDemographics[sub.label] = sub.demographics
          }
        }

        const result = await electron.ipcRenderer.invoke('bids:validate', {
          config: {
            name: context.dataset_name || '',
            bidsVersion: context.dataset_version || '1.9.0',
            license: context.license || 'CC0',
            authors: ((context.authors as string) || '').split(',').map((a: string) => a.trim()).filter(Boolean),
            readme: context.readme || '',
            outputDir: context.output_dir || ''
          },
          mappings,
          allDemographics,
          fieldmapIntendedFor: context._fieldmapIntendedFor
        })
        if (!cancelled) setValidation(result as ValidationResult)
      } catch {
        // Validation is optional — don't block the UI
      } finally {
        if (!cancelled) setValidating(false)
      }
    }
    validate()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappings, subjects, context.dataset_name, context.dataset_version, context.license, context.authors, context.readme, context.output_dir])

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--accent-3)] border border-[var(--accent-6)] rounded p-3 text-center">
          <Text size="4" weight="bold" color="blue">{includedSubjects.length}</Text>
          <Text size="1" color="gray" as="p">Subject{includedSubjects.length !== 1 ? 's' : ''}</Text>
        </div>
        <div className="bg-[var(--green-3)] border border-[var(--green-6)] rounded p-3 text-center">
          <Text size="4" weight="bold" color="green">{included.length}</Text>
          <Text size="1" color="gray" as="p">Series included</Text>
        </div>
        {excluded.length > 0 && (
          <div className="bg-[var(--orange-3)] border border-[var(--orange-6)] rounded p-3 text-center">
            <Text size="4" weight="bold" color="orange">{excluded.length}</Text>
            <Text size="1" color="gray" as="p">Series excluded</Text>
          </div>
        )}
      </div>

      {/* Datatype breakdown */}
      {Object.keys(datatypeCounts).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(datatypeCounts).map(([dt, count]) => (
            <span
              key={dt}
              className="px-2 py-1 bg-[var(--gray-3)] rounded text-xs font-medium text-[var(--gray-11)]"
            >
              {dt}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Series list with NIfTI previews */}
      {included.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1">
          <Text size="2" weight="medium" className="mb-1">Series</Text>
          <div className="flex-1 min-h-[200px] overflow-y-auto flex flex-col gap-1.5">
            {included.flatMap((m) => {
              const bidsPath = generateBidsPath(m)
              const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
              const origPath = originalPaths[m.index]
              const mainPath = strippedPathFor(m)
              const rows: React.ReactElement[] = []

              // Skull-stripped version (or regular if no skull stripping)
              rows.push(
                <div
                  key={`${m.index}-main`}
                  className="flex items-center gap-3 px-3 py-1.5 bg-[var(--gray-2)] rounded hover:bg-[var(--gray-3)]"
                >
                  {previewImages.has(mainPath)
                    ? <img src={previewImages.get(mainPath)} width={60} height={60} className="rounded flex-shrink-0" />
                    : <div className="rounded bg-black flex-shrink-0 flex items-center justify-center" style={{ width: 60, height: 60 }}>
                        <div className="animate-spin w-3 h-3 border border-[var(--gray-9)] border-t-transparent rounded-full" />
                      </div>
                  }
                  <div className="flex flex-col min-w-0 flex-1">
                    <Text size="2" className="truncate">{bidsPath}{ext}</Text>
                    <Text size="1" color="gray" className="truncate">
                      {m.seriesDescription}
                    </Text>
                    <Text size="1" color="blue">
                      {m.datatype}/{m.suffix}{origPath ? ' (skull stripped)' : ''}
                    </Text>
                  </div>
                  {onLoadFile && (
                    <Button
                      size="1"
                      variant={loadedPaths.has(mainPath) ? 'outline' : 'soft'}
                      color={loadedPaths.has(mainPath) ? 'green' : undefined}
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleOpenInViewer(mainPath)
                      }}
                    >
                      {loadedPaths.has(mainPath) ? (
                        <><CheckIcon /> Loaded</>
                      ) : (
                        'Open in Viewer'
                      )}
                    </Button>
                  )}
                </div>
              )

              // Original anatomy (before skull stripping)
              if (origPath) {
                rows.push(
                  <div
                    key={`${m.index}-original`}
                    className="flex items-center gap-3 px-3 py-1.5 bg-[var(--gray-2)] rounded hover:bg-[var(--gray-3)]"
                  >
                    {previewImages.has(origPath)
                      ? <img src={previewImages.get(origPath)} width={60} height={60} className="rounded flex-shrink-0" />
                      : <div className="rounded bg-black flex-shrink-0 flex items-center justify-center" style={{ width: 60, height: 60 }}>
                          <div className="animate-spin w-3 h-3 border border-[var(--gray-9)] border-t-transparent rounded-full" />
                        </div>
                    }
                    <div className="flex flex-col min-w-0 flex-1">
                      <Text size="2" className="truncate">{bidsPath}{ext}</Text>
                      <Text size="1" color="gray" className="truncate">
                        {m.seriesDescription}
                      </Text>
                      <Text size="1" color="gray">(original)</Text>
                    </div>
                    {onLoadFile && (
                      <Button
                        size="1"
                        variant={loadedPaths.has(origPath) ? 'outline' : 'soft'}
                        color={loadedPaths.has(origPath) ? 'green' : undefined}
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleOpenInViewer(origPath)
                        }}
                      >
                        {loadedPaths.has(origPath) ? (
                          <><CheckIcon /> Loaded</>
                        ) : (
                          'Open in Viewer'
                        )}
                      </Button>
                    )}
                  </div>
                )
              }

              return rows
            })}
          </div>
        </div>
      )}

      {/* Subject demographics table */}
      {includedSubjects.length > 0 && (
        <div>
          <Text size="2" weight="medium" className="mb-1">Participants</Text>
          <div className="border border-[var(--gray-5)] rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--gray-2)]">
                  <th className="text-left px-2 py-1 font-medium">Subject</th>
                  <th className="text-left px-2 py-1 font-medium">Age</th>
                  <th className="text-left px-2 py-1 font-medium">Sex</th>
                  <th className="text-left px-2 py-1 font-medium">Sessions</th>
                  <th className="text-left px-2 py-1 font-medium">Series</th>
                </tr>
              </thead>
              <tbody>
                {includedSubjects.map((sub) => {
                  const totalSeries = sub.sessions.reduce((sum, ses) => sum + ses.seriesIndices.length, 0)
                  return (
                    <tr key={sub.label} className="border-t border-[var(--gray-4)]">
                      <td className="px-2 py-1 font-mono">sub-{sub.label}</td>
                      <td className="px-2 py-1">{sub.demographics.age || '-'}</td>
                      <td className="px-2 py-1">{sub.demographics.sex || '-'}</td>
                      <td className="px-2 py-1">{sub.sessions.length}</td>
                      <td className="px-2 py-1">{totalSeries}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation results */}
      {validating && (
        <div className="flex items-center gap-2 text-sm text-[var(--gray-9)]">
          <div className="animate-spin w-3 h-3 border-2 border-[var(--accent-9)] border-t-transparent rounded-full" />
          Validating...
        </div>
      )}
      {validation && !validating && (
        <div>
          {validation.valid && validation.errors.length === 0 && (
            <div className="bg-[var(--green-3)] border border-[var(--green-6)] rounded p-2">
              <Text size="2" color="green">Validation passed</Text>
            </div>
          )}
          {validation.errors.length > 0 && (
            <div className="bg-[var(--red-3)] border border-[var(--red-6)] rounded p-2">
              <Text size="2" weight="medium" color="red">
                {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
              </Text>
              <ul className="mt-1 text-xs text-[var(--red-11)] list-disc pl-4">
                {validation.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
                {validation.errors.length > 10 && (
                  <li className="italic">...and {validation.errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="bg-[var(--yellow-3)] border border-[var(--yellow-6)] rounded p-2 mt-2">
              <Text size="2" weight="medium" color="yellow">
                {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
              </Text>
              <ul className="mt-1 text-xs text-[var(--yellow-11)] list-disc pl-4">
                {validation.warnings.slice(0, 5).map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
                {validation.warnings.length > 5 && (
                  <li className="italic">...and {validation.warnings.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Output path */}
      {outputDir && (
        <div className="text-xs text-[var(--gray-9)]">
          Output: <span className="font-mono">{outputDir}/{(datasetName || 'bids-dataset').replace(/[^a-zA-Z0-9_-]/g, '_')}/</span>
        </div>
      )}

      {/* File tree */}
      <div>
        <Text size="2" weight="medium" className="mb-1">File tree</Text>
        <div className="bg-[var(--gray-12)] text-[var(--green-9)] rounded p-3 text-xs font-mono overflow-auto max-h-[250px]">
          <div>{(datasetName || 'my_bids_dataset').replace(/[^a-zA-Z0-9_-]/g, '_')}/</div>
          <div className="ml-3">dataset_description.json</div>
          <div className="ml-3">participants.tsv</div>
          <div className="ml-3">participants.json</div>
          <div className="ml-3">README.md</div>
          <div className="ml-3">.bidsignore</div>
          {tree.map((filePath, i) => {
            const parts = filePath.split('/')
            return (
              <div key={i} className="ml-3">
                {parts.map((part, j) => (
                  <span key={j}>
                    {j > 0 && '/'}
                    {part}
                  </span>
                ))}
              </div>
            )
          })}
          {tree.length === 0 && (
            <div className="ml-3 text-[var(--gray-9)] italic">No series selected</div>
          )}
        </div>
      </div>
    </div>
  )
}
