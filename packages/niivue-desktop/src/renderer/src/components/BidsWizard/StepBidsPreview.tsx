import React, { useEffect, useRef, useState } from 'react'
import { Button, Text } from '@radix-ui/themes'
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

/** Small NiiVue preview that loads a single volume on demand */
function SeriesPreview({ niftiPath }: { niftiPath: string }): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const nvRef = useRef<Niivue | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      const canvas = canvasRef.current
      if (!canvas) return

      if (nvRef.current) {
        nvRef.current.volumes = []
        nvRef.current = null
      }

      const nv = new Niivue({
        isResizeCanvas: false,
        show3Dcrosshair: false,
        backColor: [0, 0, 0, 1],
        crosshairWidth: 0
      })
      nvRef.current = nv
      await nv.attachToCanvas(canvas)

      try {
        const base64: string = await electron.ipcRenderer.invoke('loadFromFile', niftiPath)
        if (cancelled || !base64) return
        const vol = await NVImage.loadFromBase64({ base64, name: niftiPath })
        if (cancelled) return
        nv.addVolume(vol)
        nv.setSliceType(SLICE_TYPE.RENDER)
        nv.updateGLVolume()
      } catch {
        // Preview is best-effort
      }
    }
    void load()

    return () => {
      cancelled = true
      if (nvRef.current) {
        nvRef.current.volumes = []
        nvRef.current = null
      }
    }
  }, [niftiPath])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={120}
      className="rounded bg-black flex-shrink-0"
      style={{ width: 60, height: 60 }}
    />
  )
}

export function StepBidsPreview({ context, onLoadFile }: StepBidsPreviewProps): React.ReactElement {
  const mappings = (context.series_list as BidsSeriesMapping[]) || []
  const subjects = (context.subjects as DetectedSubject[]) || []
  const datasetName = (context.dataset_name as string) || 'my_bids_dataset'
  const outputDir = (context.output_dir as string) || ''

  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)

  const included = mappings.filter((m) => !m.excluded)
  const excluded = mappings.filter((m) => m.excluded)
  const includedSubjects = subjects.filter((s) => !s.excluded)
  const tree = buildBidsTree(mappings)

  // Count files by datatype
  const datatypeCounts: Record<string, number> = {}
  for (const m of included) {
    datatypeCounts[m.datatype] = (datatypeCounts[m.datatype] || 0) + 1
  }

  // Run validation on mount
  useEffect(() => {
    let cancelled = false
    const validate = async (): Promise<void> => {
      setValidating(true)
      try {
        // Build demographics map from detected subjects
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
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
          <Text size="4" weight="bold" color="blue">{includedSubjects.length}</Text>
          <Text size="1" color="gray" as="p">Subject{includedSubjects.length !== 1 ? 's' : ''}</Text>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
          <Text size="4" weight="bold" color="green">{included.length}</Text>
          <Text size="1" color="gray" as="p">Series included</Text>
        </div>
        {excluded.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded p-3 text-center">
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
              className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700"
            >
              {dt}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Series list with NIfTI previews */}
      {included.length > 0 && (
        <div>
          <Text size="2" weight="medium" className="mb-1">Series</Text>
          <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1.5">
            {included.map((m) => {
              const bidsPath = generateBidsPath(m)
              const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
              return (
                <div
                  key={m.index}
                  className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded hover:bg-gray-100"
                >
                  <SeriesPreview niftiPath={m.niftiPath} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <Text size="2" className="truncate">{bidsPath}{ext}</Text>
                    <Text size="1" color="gray" className="truncate">
                      {m.seriesDescription}
                    </Text>
                    <Text size="1" color="blue">{m.datatype}/{m.suffix}</Text>
                  </div>
                  {onLoadFile && (
                    <Button
                      size="1"
                      variant="soft"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        void onLoadFile(m.niftiPath)
                      }}
                    >
                      Open in Viewer
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Subject demographics table */}
      {includedSubjects.length > 0 && (
        <div>
          <Text size="2" weight="medium" className="mb-1">Participants</Text>
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
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
                    <tr key={sub.label} className="border-t border-gray-100">
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
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" />
          Validating...
        </div>
      )}
      {validation && !validating && (
        <div>
          {validation.valid && validation.errors.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <Text size="2" color="green">Validation passed</Text>
            </div>
          )}
          {validation.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <Text size="2" weight="medium" color="red">
                {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
              </Text>
              <ul className="mt-1 text-xs text-red-700 list-disc pl-4">
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
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
              <Text size="2" weight="medium" color="yellow">
                {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
              </Text>
              <ul className="mt-1 text-xs text-yellow-700 list-disc pl-4">
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
        <div className="text-xs text-gray-500">
          Output: <span className="font-mono">{outputDir}/{(datasetName || 'bids-dataset').replace(/[^a-zA-Z0-9_-]/g, '_')}/</span>
        </div>
      )}

      {/* File tree */}
      <div>
        <Text size="2" weight="medium" className="mb-1">File tree</Text>
        <div className="bg-gray-900 text-green-400 rounded p-3 text-xs font-mono overflow-auto max-h-[250px]">
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
            <div className="ml-3 text-gray-500 italic">No series selected</div>
          )}
        </div>
      </div>
    </div>
  )
}
