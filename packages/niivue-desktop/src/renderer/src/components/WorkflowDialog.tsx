import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Theme, Button, Text } from '@radix-ui/themes'
import { Cross2Icon } from '@radix-ui/react-icons'
import type {
  WorkflowDefinition,
  ContextFieldDef,
  FormSectionDef
} from '../../../common/workflowTypes.js'
import type {
  BidsSeriesMapping,
  FieldmapIntendedFor,
  ParticipantDemographics,
  DetectedSubject
} from '../../../common/bidsTypes.js'
import { Niivue, NVImage, SLICE_TYPE } from '@niivue/niivue'
import { marked } from 'marked'
import { StepClassification } from './BidsWizard/StepClassification.js'
import { StepSubjectSession } from './BidsWizard/StepSubjectSession.js'
import { StepSkullStrip } from './BidsWizard/StepSkullStrip.js'
import { StepBidsPreview } from './BidsWizard/StepBidsPreview.js'
import { generateBidsPath } from './BidsWizard/bidsTreeUtil.js'

const electron = window.electron

// ── Markdown README editor ───────────────────────────────────────────

const MARKDOWN_PREVIEW_STYLES = `
  .markdown-preview h1 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0 0.3em; }
  .markdown-preview h2 { font-size: 1.25em; font-weight: 600; margin: 0.5em 0 0.3em; }
  .markdown-preview h3 { font-size: 1.1em; font-weight: 600; margin: 0.4em 0 0.2em; }
  .markdown-preview p { margin: 0.4em 0; }
  .markdown-preview ul, .markdown-preview ol { margin: 0.3em 0; padding-left: 1.5em; }
  .markdown-preview li { margin: 0.15em 0; }
  .markdown-preview code { background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.9em; }
  .markdown-preview pre { background: #f3f4f6; padding: 0.6em; border-radius: 4px; overflow-x: auto; margin: 0.4em 0; }
  .markdown-preview pre code { background: none; padding: 0; }
  .markdown-preview blockquote { border-left: 3px solid #d1d5db; padding-left: 0.8em; margin: 0.4em 0; color: #6b7280; }
  .markdown-preview a { color: #2563eb; text-decoration: underline; }
  .markdown-preview em { font-style: italic; }
  .markdown-preview strong { font-weight: 700; }
  .markdown-preview hr { border: none; border-top: 1px solid #e5e7eb; margin: 0.6em 0; }
`

function MarkdownField({
  value,
  onChange,
  datasetName
}: {
  value: unknown
  onChange: (value: unknown) => void
  datasetName: string
}): React.ReactElement {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  const placeholder = `# ${datasetName || 'My Dataset'}

## Description

## Funding

## Ethics Approvals

## References and Links

## License
`

  const content = String(value ?? '')
  const displayContent = content || placeholder

  const renderedHtml = useMemo(() => {
    return marked.parse(displayContent, { async: false }) as string
  }, [displayContent])

  return (
    <div className="flex flex-col gap-1 py-1">
      <style>{MARKDOWN_PREVIEW_STYLES}</style>
      <div className="flex items-center justify-between">
        <Text size="2" weight="medium">README.md</Text>
        <div className="flex border border-gray-300 rounded overflow-hidden">
          <button
            className={`px-3 py-0.5 text-xs ${tab === 'edit' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setTab('edit')}
          >
            Edit
          </button>
          <button
            className={`px-3 py-0.5 text-xs ${tab === 'preview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
        </div>
      </div>

      {tab === 'edit' ? (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={8}
          className="px-3 py-2 text-sm border border-gray-300 rounded font-mono resize-y"
        />
      ) : (
        <div
          className="px-3 py-2 text-sm border border-gray-300 rounded bg-white min-h-[192px] max-h-[300px] overflow-y-auto markdown-preview"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}
      <Text size="1" color="gray">
        Supports Markdown formatting. A detailed README avoids validator warnings.
      </Text>
    </div>
  )
}

// ── Auto-generated field controls ────────────────────────────────────

function AutoField({
  fieldName,
  fieldDef,
  value,
  onChange
}: {
  fieldName: string
  fieldDef: ContextFieldDef
  value: unknown
  onChange: (value: unknown) => void
}): React.ReactElement {
  const label = fieldDef.description || fieldName

  if (fieldDef.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 py-1">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4"
        />
        <Text size="2">{label}</Text>
      </label>
    )
  }

  if (fieldDef.type === 'string' && fieldDef.enum) {
    return (
      <div className="flex flex-col gap-1 py-1">
        <Text size="2" weight="medium">{label}</Text>
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded bg-white text-sm"
        >
          {fieldDef.enum.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (fieldDef.type === 'number' && fieldDef.min != null && fieldDef.max != null) {
    return (
      <div className="flex flex-col gap-1 py-1">
        <Text size="2" weight="medium">
          {label}: {String(value ?? fieldDef.min)}
        </Text>
        <input
          type="range"
          min={fieldDef.min}
          max={fieldDef.max}
          value={Number(value ?? fieldDef.min)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
      </div>
    )
  }

  if (fieldDef.type === 'number') {
    return (
      <div className="flex flex-col gap-1 py-1">
        <Text size="2" weight="medium">{label}</Text>
        <input
          type="number"
          value={String(value ?? '')}
          onChange={(e) => onChange(Number(e.target.value))}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </div>
    )
  }

  // Default: string text input
  return (
    <div className="flex flex-col gap-1 py-1">
      <Text size="2" weight="medium">{label}</Text>
      <input
        type="text"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 border border-gray-300 rounded text-sm"
      />
    </div>
  )
}

// ── Directory picker field ───────────────────────────────────────────

function DirectoryPickerField({
  label,
  value,
  onChange
}: {
  label: string
  value: unknown
  onChange: (value: unknown) => void
}): React.ReactElement {
  const handleBrowse = async (): Promise<void> => {
    const dir = await electron.ipcRenderer.invoke('workflow:select-directory', {
      title: label
    })
    if (dir) onChange(dir)
  }

  return (
    <div className="flex flex-col gap-1 py-1">
      <Text size="2" weight="medium">{label}</Text>
      <div className="flex gap-2">
        <input
          type="text"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Select a directory..."
          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
        <Button variant="soft" size="1" onClick={handleBrowse}>
          Browse...
        </Button>
      </div>
    </div>
  )
}

// ── Series list with proper checkbox tracking ────────────────────────

interface DicomSeriesItem {
  seriesNumber: number
  text: string
  seriesDescription?: string
  images?: number
}

function SeriesListField({
  value,
  onChange,
  loading
}: {
  value: unknown
  onChange: (value: unknown) => void
  loading: boolean
}): React.ReactElement {
  // Store full series items in a ref so they survive context updates
  // (onChange sends back just numbers, which would overwrite the objects)
  const itemsRef = useRef<DicomSeriesItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // When value contains DicomSeriesItem objects (from heuristic), capture them
  useEffect(() => {
    if (!Array.isArray(value) || value.length === 0) return
    // Check if value contains objects (from heuristic) vs plain numbers (from user selection)
    if (typeof value[0] === 'object' && value[0] !== null && 'seriesNumber' in value[0]) {
      itemsRef.current = value as DicomSeriesItem[]
      // Select all by default
      const all = new Set((value as DicomSeriesItem[]).map((s) => s.seriesNumber))
      setSelected(all)
      // Send back selected numbers without overwriting the stored items
      onChange(Array.from(all))
    }
  }, [value])

  const seriesItems = itemsRef.current

  const toggle = (n: number): void => {
    const next = new Set(selected)
    if (next.has(n)) next.delete(n)
    else next.add(n)
    setSelected(next)
    onChange(Array.from(next))
  }

  const allChecked = seriesItems.length > 0 && selected.size === seriesItems.length

  const toggleAll = (): void => {
    if (allChecked) {
      setSelected(new Set())
      onChange([])
    } else {
      const all = new Set(seriesItems.map((s) => s.seriesNumber))
      setSelected(all)
      onChange(Array.from(all))
    }
  }

  if (loading) {
    return (
      <div className="py-4 text-center">
        <Text size="2" color="gray">Loading DICOM series...</Text>
      </div>
    )
  }

  if (seriesItems.length === 0) {
    return (
      <div className="py-4 text-center">
        <Text size="2" color="gray">No series found</Text>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          className="w-3.5 h-3.5"
        />
        <Text size="2" weight="medium">Select all ({seriesItems.length} series)</Text>
      </div>
      <div className="border border-gray-200 rounded max-h-60 overflow-y-auto">
        {seriesItems.map((s, i) => (
          <label
            key={`${s.seriesNumber}-${i}`}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(s.seriesNumber)}
              onChange={() => toggle(s.seriesNumber)}
              className="w-3.5 h-3.5"
            />
            <Text size="2" className="flex-1">{s.text || s.seriesDescription || `Series ${s.seriesNumber}`}</Text>
            {typeof s.images === 'number' && (
              <Text size="1" color="gray">{s.images} img</Text>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Classification table adapter ─────────────────────────────────────

function ClassificationAdapter({
  context,
  onFieldChange
}: {
  context: Record<string, unknown>
  onFieldChange: (fieldName: string, value: unknown) => void
}): React.ReactElement {
  const mappings = (context.series_list as BidsSeriesMapping[]) || []
  const fieldmapIntendedFor = (context._fieldmapIntendedFor as FieldmapIntendedFor[]) || []

  const handleUpdateMapping = (index: number, changes: Partial<BidsSeriesMapping>): void => {
    const updated = mappings.map((m) => (m.index === index ? { ...m, ...changes } : m))
    onFieldChange('series_list', updated)
  }

  const handleUpdateSidecar = (index: number, field: string, value: unknown): void => {
    const updated = mappings.map((m) => {
      if (m.index !== index) return m
      return {
        ...m,
        sidecarData: {
          original: m.sidecarData?.original || {},
          overrides: { ...m.sidecarData?.overrides, [field]: value }
        }
      }
    })
    onFieldChange('series_list', updated)
  }

  const handleUpdateFieldmapMappings = (fmMappings: FieldmapIntendedFor[]): void => {
    onFieldChange('_fieldmapIntendedFor', fmMappings)
  }

  return (
    <StepClassification
      mappings={mappings}
      onUpdateMapping={handleUpdateMapping}
      onUpdateSidecar={handleUpdateSidecar}
      datasetName={(context.dataset_name as string) || 'My Dataset'}
      fieldmapIntendedFor={fieldmapIntendedFor}
      onUpdateFieldmapMappings={handleUpdateFieldmapMappings}
    />
  )
}

// ── Subject/session editor adapter ───────────────────────────────────

function SubjectSessionAdapter({
  context,
  onFieldChange
}: {
  context: Record<string, unknown>
  onFieldChange: (fieldName: string, value: unknown) => void | Promise<void>
}): React.ReactElement {
  const mappings = (context.series_list as BidsSeriesMapping[]) || []
  const detectedSubjects = (context.subjects as DetectedSubject[]) || []
  const subject = (context._subject as string) || '01'
  const session = (context._session as string) || ''
  const demographics = (context._demographics as ParticipantDemographics) || {
    age: '',
    sex: '',
    handedness: '',
    group: ''
  }

  return (
    <StepSubjectSession
      subject={subject}
      setSubject={(s) => onFieldChange('_subject', s)}
      session={session}
      setSession={(s) => onFieldChange('_session', s)}
      mappings={mappings}
      demographics={demographics}
      setDemographics={(d) => onFieldChange('_demographics', d)}
      detectedSubjects={detectedSubjects}
      onUpdateDetectedSubject={(index, changes) => {
        const old = detectedSubjects[index]
        const updated = detectedSubjects.map((ds, i) =>
          i === index ? { ...ds, ...changes } : ds
        )

        // If excluded changed, cascade to series_list mappings
        // Apply both updates sequentially to avoid race conditions
        if (changes.excluded !== undefined) {
          const subLabel = old.label
          const updatedMappings = mappings.map((m) => {
            if (m.subject === subLabel) {
              return {
                ...m,
                excluded: changes.excluded!,
                exclusionReason: changes.excluded ? 'Subject excluded' : undefined
              }
            }
            return m
          })
          void (async () => {
            await onFieldChange('subjects', updated)
            await onFieldChange('series_list', updatedMappings)
          })()
          return
        }

        // If label changed, cascade to series_list mappings
        if (changes.label && changes.label !== old.label) {
          const updatedMappings = mappings.map((m) => {
            if (m.subject === old.label) {
              return { ...m, subject: changes.label! }
            }
            return m
          })
          void (async () => {
            await onFieldChange('subjects', updated)
            await onFieldChange('series_list', updatedMappings)
          })()
          return
        }

        void onFieldChange('subjects', updated)
      }}
      onUpdateDetectedSession={(subjectIndex, sessionIndex, changes) => {
        const sub = detectedSubjects[subjectIndex]
        const ses = sub.sessions[sessionIndex]
        const updated = detectedSubjects.map((ds, si) => {
          if (si !== subjectIndex) return ds
          const sessions = ds.sessions.map((s, sei) =>
            sei === sessionIndex ? { ...s, ...changes } : s
          )
          return { ...ds, sessions }
        })

        // If excluded changed, cascade to series_list mappings for this session
        // Apply both updates sequentially to avoid race conditions
        if (changes.excluded !== undefined) {
          const updatedMappings = mappings.map((m) => {
            if (m.subject === sub.label && m.session === ses.label) {
              return {
                ...m,
                excluded: changes.excluded!,
                exclusionReason: changes.excluded ? 'Session excluded' : undefined
              }
            }
            return m
          })
          void (async () => {
            await onFieldChange('subjects', updated)
            await onFieldChange('series_list', updatedMappings)
          })()
          return
        }

        void onFieldChange('subjects', updated)
      }}
      onUpdateDetectedSubjectDemographics={(index, field, value) => {
        const updated = detectedSubjects.map((ds, i) =>
          i === index
            ? { ...ds, demographics: { ...ds.demographics, [field]: value } }
            : ds
        )
        onFieldChange('subjects', updated)
      }}
      onUpdateDetectedSessionLabel={(subjectIndex, sessionIndex, label) => {
        const sub = detectedSubjects[subjectIndex]
        const oldLabel = sub.sessions[sessionIndex].label
        const updated = detectedSubjects.map((ds, si) => {
          if (si !== subjectIndex) return ds
          const sessions = ds.sessions.map((ses, sei) =>
            sei === sessionIndex ? { ...ses, label } : ses
          )
          return { ...ds, sessions }
        })

        // Cascade session label change to series_list mappings
        // Apply both updates sequentially to avoid race conditions
        if (label !== oldLabel) {
          const updatedMappings = mappings.map((m) => {
            if (m.subject === sub.label && m.session === oldLabel) {
              return { ...m, session: label }
            }
            return m
          })
          void (async () => {
            await onFieldChange('subjects', updated)
            await onFieldChange('series_list', updatedMappings)
          })()
          return
        }

        void onFieldChange('subjects', updated)
      }}
    />
  )
}

// ── Skull strip adapter ─────────────────────────────────────────────

function SkullStripAdapter({
  context,
  onFieldChange
}: {
  context: Record<string, unknown>
  onFieldChange: (fieldName: string, value: unknown) => void
}): React.ReactElement {
  const mappings = (context.series_list as BidsSeriesMapping[]) || []
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // Use state (not ref) so the component re-renders once the NiiVue instance is ready
  const [nvInstance, setNvInstance] = useState<Niivue | null>(null)

  // Restore originalPaths from context
  const savedOriginalPaths = (context._originalPaths as Record<number, string>) || {}
  const initialOriginalPaths = useMemo(() => {
    const map = new Map<number, string>()
    for (const [k, v] of Object.entries(savedOriginalPaths)) {
      map.set(Number(k), v)
    }
    return map
  }, [])

  // Create a hidden 1×1 NiiVue instance for Brainchop's nv.conform() call
  useEffect(() => {
    if (nvInstance) return
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    canvas.style.position = 'absolute'
    canvas.style.left = '-9999px'
    canvas.style.top = '-9999px'
    document.body.appendChild(canvas)
    canvasRef.current = canvas

    const nv = new Niivue({ isResizeCanvas: false })
    nv.attachToCanvas(canvas)
    setNvInstance(nv)

    return () => {
      setNvInstance(null)
      if (canvasRef.current) {
        document.body.removeChild(canvasRef.current)
        canvasRef.current = null
      }
    }
  }, [])

  const handleMappingsUpdate = useCallback(
    (updated: BidsSeriesMapping[]) => {
      onFieldChange('series_list', updated)
    },
    [onFieldChange]
  )

  const handleOriginalPathsChange = useCallback(
    (paths: Map<number, string>) => {
      const record: Record<number, string> = {}
      paths.forEach((v, k) => { record[k] = v })
      onFieldChange('_originalPaths', record)
    },
    [onFieldChange]
  )

  return (
    <StepSkullStrip
      mappings={mappings}
      onMappingsUpdate={handleMappingsUpdate}
      nv={nvInstance}
      initialOriginalPaths={initialOriginalPaths}
      onOriginalPathsChange={handleOriginalPathsChange}
    />
  )
}

// ── Subject selection adapter (shown before classification) ──────────

function SubjectSelectAdapter({
  context,
  onFieldChange
}: {
  context: Record<string, unknown>
  onFieldChange: (fieldName: string, value: unknown) => void | Promise<void>
}): React.ReactElement {
  const detectedSubjects = (context.subjects as DetectedSubject[]) || []

  if (detectedSubjects.length <= 1) {
    return (
      <div className="flex flex-col gap-2">
        <Text size="2" weight="bold">Subjects</Text>
        <Text size="1" color="gray">
          {detectedSubjects.length === 1
            ? `1 subject detected: ${detectedSubjects[0].rawId}`
            : 'No subjects detected from DICOM headers.'}
        </Text>
      </div>
    )
  }

  const toggleSubject = (index: number): void => {
    const old = detectedSubjects[index]
    const updated = detectedSubjects.map((ds, i) =>
      i === index ? { ...ds, excluded: !old.excluded } : ds
    )
    void onFieldChange('subjects', updated)
  }

  const includedCount = detectedSubjects.filter((s) => !s.excluded).length

  return (
    <div className="flex flex-col gap-3">
      <Text size="2" weight="bold">Select Subjects</Text>
      <Text size="1" color="gray">
        {detectedSubjects.length} subjects detected from DICOM headers.
        Uncheck any subjects you want to exclude from the BIDS dataset.
      </Text>

      <div className="overflow-auto max-h-[300px] border rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="py-1.5 px-2 text-left font-medium w-8">Include</th>
              <th className="py-1.5 px-2 text-left font-medium">Patient ID</th>
              <th className="py-1.5 px-2 text-left font-medium">Subject</th>
              <th className="py-1.5 px-2 text-left font-medium">Sessions</th>
              <th className="py-1.5 px-2 text-left font-medium">Age</th>
              <th className="py-1.5 px-2 text-left font-medium">Sex</th>
              <th className="py-1.5 px-2 text-left font-medium">Series</th>
            </tr>
          </thead>
          <tbody>
            {detectedSubjects.map((ds, si) => {
              const totalSeries = ds.sessions.reduce((sum, s) => sum + s.seriesIndices.length, 0)
              const isExcluded = !!ds.excluded
              return (
                <tr key={si} className={`border-t border-gray-100${isExcluded ? ' opacity-50' : ''}`}>
                  <td className="py-1.5 px-2">
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => toggleSubject(si)}
                      className="w-3.5 h-3.5"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <Text size="1" className="block truncate max-w-[160px]" title={ds.rawId}>
                      {ds.rawId}
                    </Text>
                  </td>
                  <td className="py-1.5 px-2">
                    <Text size="1" className="font-mono">sub-{ds.label}</Text>
                  </td>
                  <td className="py-1.5 px-2">{ds.sessions.length}</td>
                  <td className="py-1.5 px-2">{ds.demographics.age || '-'}</td>
                  <td className="py-1.5 px-2">{ds.demographics.sex || '-'}</td>
                  <td className="py-1.5 px-2">{totalSeries}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Text size="1" color="gray">
        {includedCount} of {detectedSubjects.length} subjects included
      </Text>
    </div>
  )
}

// ── Component registry ───────────────────────────────────────────────

interface CustomComponentProps {
  context: Record<string, unknown>
  onFieldChange: (fieldName: string, value: unknown) => void
  onLoadFile?: (niftiPath: string) => Promise<void>
}

const COMPONENT_REGISTRY: Record<string, React.FC<CustomComponentProps>> = {
  'subject-select': SubjectSelectAdapter,
  'bids-classification-table': ClassificationAdapter,
  'subject-session-editor': SubjectSessionAdapter,
  'skull-strip-editor': SkullStripAdapter,
  'bids-preview': StepBidsPreview
}

// ── Form section renderer ────────────────────────────────────────────

function FormSection({
  section,
  definition,
  context,
  onFieldChange,
  heuristicLoading,
  onLoadFile
}: {
  section: FormSectionDef
  definition: WorkflowDefinition
  context: Record<string, unknown>
  onFieldChange: (fieldName: string, value: unknown) => void
  heuristicLoading: Set<string>
  onLoadFile?: (niftiPath: string) => Promise<void>
}): React.ReactElement {
  const fields = definition.context?.fields ?? {}

  // Custom component — render from registry
  if (section.component) {
    const CustomComponent = COMPONENT_REGISTRY[section.component]
    if (CustomComponent) {
      // Check if any fields are still loading
      const isLoading = section.fields.some((f) => heuristicLoading.has(f))
      if (isLoading) {
        return (
          <div className="py-8 text-center">
            <Text size="2" color="gray">Preparing data...</Text>
          </div>
        )
      }
      return (
        <div className="flex flex-col gap-3">
          <div>
            <Text size="3" weight="bold">{section.title}</Text>
            {section.description && (
              <Text size="2" color="gray" as="p" className="mt-1">
                {section.description}
              </Text>
            )}
          </div>
          <CustomComponent context={context} onFieldChange={onFieldChange} onLoadFile={onLoadFile} />
        </div>
      )
    }
    // Unknown component — fall through to auto-generated
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Text size="3" weight="bold">{section.title}</Text>
        {section.description && (
          <Text size="2" color="gray" as="p" className="mt-1">
            {section.description}
          </Text>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {section.fields.map((fieldName) => {
          const fieldDef = fields[fieldName]
          if (!fieldDef) return null

          // Series list with descriptions
          if (fieldDef.heuristic === 'list-dicom-series') {
            return (
              <SeriesListField
                key={fieldName}
                value={context[fieldName]}
                onChange={(v) => onFieldChange(fieldName, v)}
                loading={heuristicLoading.has(fieldName)}
              />
            )
          }

          // Markdown editor for readme field
          if (fieldName === 'readme') {
            return (
              <MarkdownField
                key={fieldName}
                value={context[fieldName]}
                onChange={(v) => onFieldChange(fieldName, v)}
                datasetName={(context.dataset_name as string) || 'My Dataset'}
              />
            )
          }

          // Directory picker for output paths
          if (fieldName === 'output_dir' || fieldDef.type === 'directory') {
            return (
              <DirectoryPickerField
                key={fieldName}
                label={fieldDef.description || fieldName}
                value={context[fieldName]}
                onChange={(v) => onFieldChange(fieldName, v)}
              />
            )
          }

          return (
            <AutoField
              key={fieldName}
              fieldName={fieldName}
              fieldDef={fieldDef}
              value={context[fieldName]}
              onChange={(v) => onFieldChange(fieldName, v)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Completion screen with loadable files ────────────────────────────

interface WrittenFile {
  key: string
  label: string
  tag?: string
  /** Path to the file in the BIDS output directory */
  bidsPath: string
  /** Source NIfTI path (for preview loading) */
  sourcePath: string
}

function buildWrittenFileList(
  mappings: BidsSeriesMapping[],
  bidsDir: string,
  originalPaths: Record<number, string> = {}
): WrittenFile[] {
  const included = mappings.filter((m) => !m.excluded)
  const files: WrittenFile[] = []

  for (const m of included) {
    const bidsRelPath = generateBidsPath(m)
    const ext = m.niftiPath.endsWith('.nii.gz') ? '.nii.gz' : '.nii'
    const bidsPath = bidsDir ? `${bidsDir}/${bidsRelPath}${ext}` : m.niftiPath
    const origPath = originalPaths[m.index]

    if (origPath) {
      // We have original path from skull strip — always show both entries
      const strippedPath = origPath.replace(/\.nii(\.gz)?$/, '_brain.nii.gz')
      files.push({
        key: `${m.index}-stripped`,
        label: `${bidsRelPath}${ext}`,
        tag: 'skull stripped',
        bidsPath,
        sourcePath: strippedPath
      })
      files.push({
        key: `${m.index}-original`,
        label: `${bidsRelPath}${ext}`,
        tag: 'original',
        bidsPath,
        sourcePath: origPath
      })
    } else {
      files.push({
        key: `${m.index}`,
        label: `${bidsRelPath}${ext}`,
        bidsPath,
        sourcePath: m.niftiPath
      })
    }
  }

  return files
}

/** Small NiiVue preview that renders a static thumbnail and releases the GL context */
function VolumePreview({ niftiPath }: { niftiPath: string }): React.ReactElement {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const render = async (): Promise<void> => {
      // Create an offscreen canvas, render, capture, then destroy
      const canvas = document.createElement('canvas')
      canvas.width = 120
      canvas.height = 120
      canvas.style.position = 'absolute'
      canvas.style.left = '-9999px'
      document.body.appendChild(canvas)

      const nv = new Niivue({
        isResizeCanvas: false,
        show3Dcrosshair: false,
        backColor: [0, 0, 0, 1],
        crosshairWidth: 0
      })

      try {
        await nv.attachToCanvas(canvas)
        const base64: string = await electron.ipcRenderer.invoke('loadFromFile', niftiPath)
        if (cancelled || !base64) return
        const vol = await NVImage.loadFromBase64({ base64, name: niftiPath })
        if (cancelled) return
        nv.addVolume(vol)
        nv.setSliceType(SLICE_TYPE.RENDER)
        nv.updateGLVolume()
        nv.drawScene()
        // Capture as static image
        const dataUrl = canvas.toDataURL('image/png')
        if (!cancelled) setImageUrl(dataUrl)
      } catch {
        // Preview is best-effort
      } finally {
        // Release GL context immediately
        nv.volumes = []
        const gl = nv.gl
        if (gl) {
          const ext = gl.getExtension('WEBGL_lose_context')
          ext?.loseContext()
        }
        document.body.removeChild(canvas)
      }
    }
    void render()
    return () => { cancelled = true }
  }, [niftiPath])

  return imageUrl
    ? <img src={imageUrl} width={60} height={60} className="rounded flex-shrink-0" />
    : <div className="rounded bg-black flex-shrink-0" style={{ width: 60, height: 60 }} />
}

function CompletionScreen({
  context,
  outputs,
  onClose
}: {
  context: Record<string, unknown>
  outputs: Record<string, unknown> | null
  onClose: (fileToLoad?: string) => void
}): React.ReactElement {
  const mappings = (context.series_list as BidsSeriesMapping[]) || []
  const bidsDir = (outputs?.bids_dir as string) || ''
  const originalPaths = (context._originalPaths as Record<number, string>) || {}

  const writtenFiles = useMemo(
    () => buildWrittenFileList(mappings, bidsDir, originalPaths),
    [mappings, bidsDir, originalPaths]
  )

  const handleOpen = useCallback(
    async (file: WrittenFile) => {
      // Try bidsPath first (the written BIDS output), fall back to sourcePath
      // (temp conversion dir). For "original" tagged entries, always use sourcePath
      // since only the stripped version gets written to BIDS output.
      let filePath: string
      if (file.tag === 'original') {
        filePath = file.sourcePath
      } else {
        // Check if the BIDS output file exists, fall back to source
        const exists = await electron.ipcRenderer.invoke('file-exists', file.bidsPath).catch(() => false)
        filePath = exists ? file.bidsPath : file.sourcePath
      }
      // Close dialog first, then load — avoids IPC race with registerAllIpcHandlers
      onClose(filePath)
    },
    [onClose]
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-green-50 border border-green-200 rounded p-3">
        <Text size="2" color="green" weight="bold">Workflow completed successfully.</Text>
        {bidsDir && (
          <Text size="1" color="gray" as="p" className="mt-1">{bidsDir}</Text>
        )}
      </div>

      {writtenFiles.length > 0 && (
        <div className="flex flex-col gap-2">
          <Text size="2" weight="medium">Open in viewer:</Text>
          <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1.5">
            {writtenFiles.map((f) => (
              <div
                key={f.key}
                className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded hover:bg-gray-100"
              >
                <VolumePreview niftiPath={f.sourcePath} />
                <div className="flex flex-col min-w-0 flex-1">
                  <Text size="2" className="truncate">{f.label}</Text>
                  {f.tag && (
                    <Text
                      size="1"
                      color={f.tag === 'skull stripped' ? 'blue' : 'gray'}
                    >
                      {f.tag}
                    </Text>
                  )}
                </div>
                <Button
                  size="1"
                  variant="soft"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpen(f)
                  }}
                >
                  Open
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-200">
        <Button variant="solid" onClick={() => onClose()}>
          Done
        </Button>
      </div>
    </div>
  )
}

// ── Main dialog ──────────────────────────────────────────────────────

interface WorkflowDialogProps {
  open: boolean
  onClose: (fileToLoad?: string) => void
  onLoadFile?: (niftiPath: string) => Promise<void>
  workflowName: string
  inputs: Record<string, unknown>
}

export function WorkflowDialog({
  open,
  onClose,
  onLoadFile,
  workflowName,
  inputs
}: WorkflowDialogProps): React.ReactElement | null {
  const [runId, setRunId] = useState<string | null>(null)
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null)
  const [context, setContext] = useState<Record<string, unknown>>({})
  const [currentSection, setCurrentSection] = useState(0)
  const [status, setStatus] = useState<string>('idle')
  const [completedOutputs, setCompletedOutputs] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [heuristicLoading, setHeuristicLoading] = useState<Set<string>>(new Set())
  const [preparing, setPreparing] = useState(false)
  // Track the runId via ref to avoid stale closures in cleanup
  const runIdRef = useRef<string | null>(null)

  // Start the workflow run when dialog opens
  useEffect(() => {
    if (!open || !workflowName) return

    let cancelled = false

    const init = async (): Promise<void> => {
      try {
        setPreparing(true)
        setError(null)

        // 1. Create the run
        const startResult = await electron.ipcRenderer.invoke('workflow:start', {
          name: workflowName,
          inputs
        })
        if (cancelled) return

        const rid = startResult.runId as string
        setRunId(rid)
        runIdRef.current = rid
        setDefinition(startResult.definition)
        setContext(startResult.runState.context)
        setCurrentSection(0)
        setStatus('paused-for-form')

        // 2. Run auto-runnable steps (e.g., BIDS convert before form)
        const hasAutoSteps = (startResult.autoSteps as string[])?.length > 0
        if (hasAutoSteps) {
          const autoResult = await electron.ipcRenderer.invoke('workflow:run-auto-steps', { runId: rid })
          if (cancelled) return
          if (autoResult.runState?.context) {
            setContext(autoResult.runState.context)
          }
        }

        if (cancelled) return
        setPreparing(false)

        // 3. Run heuristics for the first section
        const firstSection = startResult.definition.form?.sections?.[0]
        if (firstSection) {
          await runSectionHeuristics(rid, startResult.definition, firstSection)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setPreparing(false)
        }
      }
    }
    init()

    return () => {
      cancelled = true
      if (runIdRef.current) {
        electron.ipcRenderer.invoke('workflow:cancel', { runId: runIdRef.current })
        runIdRef.current = null
      }
    }
  }, [open, workflowName])

  const runSectionHeuristics = async (
    rid: string,
    def: WorkflowDefinition,
    section: FormSectionDef
  ): Promise<void> => {
    const fields = def.context?.fields ?? {}
    for (const fieldName of section.fields) {
      const fieldDef = fields[fieldName]
      if (!fieldDef?.heuristic) continue

      setHeuristicLoading((prev) => new Set(prev).add(fieldName))
      try {
        const result = await electron.ipcRenderer.invoke('workflow:run-heuristic', {
          runId: rid,
          fieldName
        })
        if (result.context) {
          setContext(result.context)
        }
      } catch (err) {
        console.error(`Heuristic ${fieldDef.heuristic} failed:`, err)
      } finally {
        setHeuristicLoading((prev) => {
          const next = new Set(prev)
          next.delete(fieldName)
          return next
        })
      }
    }
  }

  const handleFieldChange = useCallback(
    async (fieldName: string, value: unknown) => {
      if (!runId) return
      try {
        const result = await electron.ipcRenderer.invoke('workflow:update-context', {
          runId,
          fieldName,
          value
        })
        if (result.context) {
          setContext(result.context)
        }
      } catch (err) {
        console.error('Failed to update context:', err)
      }
    },
    [runId]
  )

  const sections = definition?.form?.sections ?? []
  const isLastSection = currentSection >= sections.length - 1

  const handleNext = async (): Promise<void> => {
    if (isLastSection) {
      // For single-subject mode, apply _subject/_session to all mappings before write
      const detectedSubjects = (context.subjects as DetectedSubject[]) || []
      if (detectedSubjects.length <= 1) {
        const subjectLabel = (context._subject as string) || '01'
        const sessionLabel = (context._session as string) || ''
        const currentMappings = (context.series_list as BidsSeriesMapping[]) || []
        const needsUpdate = currentMappings.some(
          (m) => m.subject !== subjectLabel || m.session !== sessionLabel
        )
        if (needsUpdate) {
          const updatedMappings = currentMappings.map((m) => ({
            ...m,
            subject: subjectLabel,
            session: sessionLabel
          }))
          await handleFieldChange('series_list', updatedMappings)
        }
      }

      // Execute all remaining steps
      setStatus('running')
      setError(null)
      try {
        const result = await electron.ipcRenderer.invoke('workflow:execute-all', { runId })
        setStatus('completed')
        setCompletedOutputs(result.outputs ?? null)
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
      return
    }

    const nextSection = currentSection + 1
    setCurrentSection(nextSection)

    // Run heuristics for the next section
    if (runId && definition && sections[nextSection]) {
      await runSectionHeuristics(runId, definition, sections[nextSection])
    }
  }

  const handleBack = (): void => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }

  const closingRef = useRef(false)
  const handleClose = (fileToLoad?: string): void => {
    // Guard against double-close (Dialog.onOpenChange triggers handleClose again)
    if (closingRef.current) return
    closingRef.current = true
    if (runIdRef.current) {
      electron.ipcRenderer.invoke('workflow:cancel', { runId: runIdRef.current })
      runIdRef.current = null
    }
    setRunId(null)
    setDefinition(null)
    setContext({})
    setCurrentSection(0)
    setStatus('idle')
    setError(null)
    setPreparing(false)
    setCompletedOutputs(null)
    onClose(fileToLoad)
    // Reset guard after a tick so the dialog can be reopened later
    setTimeout(() => { closingRef.current = false }, 0)
  }

  // Determine if dialog needs to be wider for custom components
  const hasCustomComponent = sections.some((s) => s.component)
  const dialogWidth = hasCustomComponent ? 'w-[900px]' : 'w-[600px]'

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/40 fixed inset-0 z-40" />
        <Dialog.Content className={`fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-xl ${dialogWidth} max-h-[85vh] flex flex-col z-50`}>
          <Theme style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div className="p-6 flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between flex-shrink-0">
                <Text size="4" weight="bold">
                  {definition?.description || workflowName}
                </Text>
                <Dialog.Close asChild>
                  <button
                    className="p-1 rounded hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <Cross2Icon />
                  </button>
                </Dialog.Close>
              </div>

              {/* Step indicator */}
              {sections.length > 1 && !preparing && (
                <div className="flex gap-1 flex-shrink-0">
                  {sections.map((s, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded ${
                        i <= currentSection ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                      title={s.title}
                    />
                  ))}
                </div>
              )}

              {/* Preparing / loading state */}
              {preparing && (
                <div className="flex-1 flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <Text size="2" color="gray">
                      Preparing workflow...
                    </Text>
                  </div>
                </div>
              )}

              {/* Form content */}
              {!preparing && definition && (
                <div className="flex-1 overflow-y-auto min-h-0">
                  {sections[currentSection] && (
                    <FormSection
                      section={sections[currentSection]}
                      definition={definition}
                      context={context}
                      onFieldChange={handleFieldChange}
                      heuristicLoading={heuristicLoading}
                      onLoadFile={onLoadFile}
                    />
                  )}
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <Text size="2" color="red">{error}</Text>
                </div>
              )}

              {/* Status display */}
              {status === 'running' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <Text size="2" color="blue">Running workflow...</Text>
                </div>
              )}
              {status === 'completed' && (
                <CompletionScreen
                  context={context}
                  outputs={completedOutputs}
                  onClose={handleClose}
                />
              )}

              {/* Navigation buttons */}
              {!preparing && status !== 'completed' && (
                <div className="flex justify-between pt-2 border-t border-gray-200 flex-shrink-0">
                  <Button
                    variant="soft"
                    color="gray"
                    onClick={handleBack}
                    disabled={currentSection === 0 || status === 'running'}
                  >
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="soft" color="gray" onClick={() => handleClose()}>
                      Cancel
                    </Button>
                    <Button
                      variant="solid"
                      onClick={handleNext}
                      disabled={status === 'running'}
                    >
                      {isLastSection
                        ? (sections[currentSection]?.buttonText || 'Run')
                        : 'Next'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Theme>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
