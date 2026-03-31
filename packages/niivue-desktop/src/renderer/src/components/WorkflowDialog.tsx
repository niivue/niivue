import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Text, Callout } from '@radix-ui/themes'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import type { ContextFieldDef } from '../../../common/workflowTypes.js'
import type {
  BidsSeriesMapping,
  FieldmapIntendedFor,
  ParticipantDemographics,
  DetectedSubject
} from '../../../common/bidsTypes.js'
import { Niivue, NVImage, SLICE_TYPE } from '@niivue/niivue'
import { WizardShell, type WizardStep } from './Wizard/index.js'
import { FormSection } from './Wizard/FormSection.js'
import { CompletionScreen } from './Wizard/CompletionScreen.js'
import { useWizardEngine } from './Wizard/useWizardEngine.js'
import { StepClassification } from './BidsWizard/StepClassification.js'
import { StepSubjectSession } from './BidsWizard/StepSubjectSession.js'
import { StepSkullStrip } from './BidsWizard/StepSkullStrip.js'
import { StepBidsPreview } from './BidsWizard/StepBidsPreview.js'

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
  const [nvInstance, setNvInstance] = useState<Niivue | null>(null)

  const savedOriginalPaths = (context._originalPaths as Record<number, string>) || {}
  const initialOriginalPaths = useMemo(() => {
    const map = new Map<number, string>()
    for (const [k, v] of Object.entries(savedOriginalPaths)) {
      map.set(Number(k), v)
    }
    return map
  }, [])

  const savedCompleted = (context._completed as number[]) || []
  const [completed, setCompleted] = useState<Set<number>>(() => new Set(savedCompleted))
  const [originalPaths, setOriginalPaths] = useState<Map<number, string>>(() => initialOriginalPaths)
  const savedUseStripped = (context._useStripped as Record<number, boolean>) || {}
  const [useStripped, setUseStripped] = useState<Map<number, boolean>>(() => {
    const map = new Map<number, boolean>()
    for (const [k, v] of Object.entries(savedUseStripped)) {
      map.set(Number(k), v)
    }
    return map
  })

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
      if (nv.gl) {
        const ext = nv.gl.getExtension('WEBGL_lose_context')
        if (ext) ext.loseContext()
      }
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
      setOriginalPaths(paths)
      const record: Record<number, string> = {}
      paths.forEach((v, k) => { record[k] = v })
      onFieldChange('_originalPaths', record)
    },
    [onFieldChange]
  )

  const handleCompletedChange = useCallback(
    (c: Set<number>) => {
      setCompleted(c)
      onFieldChange('_completed', Array.from(c))
    },
    [onFieldChange]
  )

  const handleUseStrippedChange = useCallback(
    (us: Map<number, boolean>) => {
      setUseStripped(us)
      const record: Record<number, boolean> = {}
      us.forEach((v, k) => { record[k] = v })
      onFieldChange('_useStripped', record)
    },
    [onFieldChange]
  )

  return (
    <StepSkullStrip
      mappings={mappings}
      onMappingsUpdate={handleMappingsUpdate}
      nv={nvInstance}
      completed={completed}
      onCompletedChange={handleCompletedChange}
      originalPaths={originalPaths}
      onOriginalPathsChange={handleOriginalPathsChange}
      useStripped={useStripped}
      onUseStrippedChange={handleUseStrippedChange}
    />
  )
}

// ── Subject selection adapter ──────────────────────────────────────

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
        <Text size="2" weight="bold" className="text-neutral-12">Subjects</Text>
        <Text size="1" className="text-neutral-9">
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
      <Text size="2" weight="bold" className="text-neutral-12">Select Subjects</Text>
      <Text size="1" className="text-neutral-9">
        {detectedSubjects.length} subjects detected from DICOM headers.
        Uncheck any subjects you want to exclude from the BIDS dataset.
      </Text>

      <div className="border border-neutral-6 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-neutral-3">
            <tr>
              <th className="py-2 px-3 text-left font-medium text-neutral-11 w-8">Include</th>
              <th className="py-2 px-3 text-left font-medium text-neutral-11">Patient ID</th>
              <th className="py-2 px-3 text-left font-medium text-neutral-11">Subject</th>
              <th className="py-2 px-3 text-left font-medium text-neutral-11">Sessions</th>
              <th className="py-2 px-3 text-left font-medium text-neutral-11">Age</th>
              <th className="py-2 px-3 text-left font-medium text-neutral-11">Sex</th>
              <th className="py-2 px-3 text-left font-medium text-neutral-11">Series</th>
            </tr>
          </thead>
          <tbody>
            {detectedSubjects.map((ds, si) => {
              const totalSeries = ds.sessions.reduce((sum, s) => sum + s.seriesIndices.length, 0)
              const isExcluded = !!ds.excluded
              return (
                <tr
                  key={si}
                  className={`border-t border-neutral-4${isExcluded ? ' opacity-50' : ''}`}
                >
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => toggleSubject(si)}
                      className="w-3.5 h-3.5"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Text size="1" className="block truncate max-w-[160px] text-neutral-12" title={ds.rawId}>
                      {ds.rawId}
                    </Text>
                  </td>
                  <td className="py-2 px-3">
                    <Text size="1" className="font-mono text-neutral-12">sub-{ds.label}</Text>
                  </td>
                  <td className="py-2 px-3 text-neutral-11">{ds.sessions.length}</td>
                  <td className="py-2 px-3 text-neutral-11">{ds.demographics.age || '-'}</td>
                  <td className="py-2 px-3 text-neutral-11">{ds.demographics.sex || '-'}</td>
                  <td className="py-2 px-3 text-neutral-11">{totalSeries}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Text size="1" className="text-neutral-9">
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

// ── Main WorkflowDialog ──────────────────────────────────────────────

interface WorkflowDialogProps {
  open: boolean
  onClose: () => void
  onLoadFile?: (niftiPath: string) => Promise<void>
  onBidsInit?: (mappings: BidsSeriesMapping[]) => void
  workflowName: string
  inputs: Record<string, unknown>
}

export function WorkflowDialog({
  open,
  onClose,
  onLoadFile,
  onBidsInit,
  workflowName,
  inputs
}: WorkflowDialogProps): React.ReactElement | null {
  const engine = useWizardEngine(open, workflowName, inputs, onClose)

  const handleLoadFile = useCallback(
    async (niftiPath: string) => {
      if (onLoadFile) await onLoadFile(niftiPath)
      const mappings = (engine.context.series_list as BidsSeriesMapping[]) || []
      if (onBidsInit && mappings.length > 0) onBidsInit(mappings)
    },
    [onLoadFile, onBidsInit, engine.context]
  )

  // Build wizard steps from form sections
  const sections = engine.definition?.form?.sections ?? []
  const wizardSteps: WizardStep[] = useMemo(
    () => sections.map((s) => ({ label: s.title, description: s.description })),
    [sections]
  )

  // Handle the "last section" execution with subject/session finalization
  const handleComplete = useCallback(async () => {
    // For single-subject mode, apply _subject/_session to all mappings before write
    const detectedSubjects = (engine.context.subjects as DetectedSubject[]) || []
    if (detectedSubjects.length <= 1) {
      const subjectLabel = (engine.context._subject as string) || '01'
      const sessionLabel = (engine.context._session as string) || ''
      const currentMappings = (engine.context.series_list as BidsSeriesMapping[]) || []
      const needsUpdate = currentMappings.some(
        (m) => m.subject !== subjectLabel || m.session !== sessionLabel
      )
      if (needsUpdate) {
        const updatedMappings = currentMappings.map((m) => ({
          ...m,
          subject: subjectLabel,
          session: sessionLabel
        }))
        await engine.handleFieldChange('series_list', updatedMappings)
      }
    }
    await engine.handleNext()
  }, [engine])

  const isPreparing = engine.status === 'preparing'
  const isRunning = engine.status === 'running'
  const isCompleted = engine.status === 'completed'

  return (
    <WizardShell
      open={open}
      onClose={engine.handleClose}
      title={engine.definition?.description || workflowName}
      steps={wizardSteps.length > 0 ? wizardSteps : [{ label: 'Loading...' }]}
      currentStep={engine.currentSection}
      onStepChange={engine.goToSection}
      onNext={engine.handleNext}
      canProceed={!isPreparing && !isRunning}
      loading={isRunning}
      lastStepLabel={sections[engine.currentSection]?.buttonText || 'Run'}
      onComplete={handleComplete}
      hideFooter={isCompleted}
    >
      {/* Preparing state */}
      {isPreparing && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-accent-9 border-t-transparent rounded-full mx-auto mb-3" />
            <Text size="2" className="text-neutral-9">
              Preparing workflow...
            </Text>
          </div>
        </div>
      )}

      {/* Form content */}
      {!isPreparing && engine.definition && !isCompleted && sections[engine.currentSection] && (
        <FormSection
          section={sections[engine.currentSection]}
          definition={engine.definition}
          context={engine.context}
          onFieldChange={engine.handleFieldChange}
          heuristicLoading={engine.heuristicLoading}
          onLoadFile={handleLoadFile}
          componentRegistry={COMPONENT_REGISTRY}
        />
      )}

      {/* Error display */}
      {engine.error && (
        <Callout.Root color="red" size="2" className="mt-4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{engine.error}</Callout.Text>
        </Callout.Root>
      )}

      {/* Running indicator */}
      {isRunning && (
        <Callout.Root color="blue" size="2" className="mt-4">
          <Callout.Icon>
            <div className="animate-spin w-4 h-4 border-2 border-accent-9 border-t-transparent rounded-full" />
          </Callout.Icon>
          <Callout.Text>Running workflow...</Callout.Text>
        </Callout.Root>
      )}

      {/* Completion screen */}
      {isCompleted && (
        <CompletionScreen
          context={engine.context}
          outputs={engine.completedOutputs}
          onClose={engine.handleClose}
          onLoadFile={handleLoadFile}
        />
      )}
    </WizardShell>
  )
}
