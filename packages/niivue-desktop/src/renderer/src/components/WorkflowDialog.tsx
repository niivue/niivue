import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Text, Callout, Heading, TextField } from '@radix-ui/themes'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import type {
  BidsSeriesMapping,
  BidsValidationResult,
  FieldmapIntendedFor,
  ParticipantDemographics,
  DetectedSubject,
  SidecarAutoFixRecord
} from '../../../common/bidsTypes.js'
import { Niivue } from '@niivue/niivue'

const electron = window.electron
import { WizardShell, type WizardStep } from './Wizard/index.js'
import { FormSection } from './Wizard/FormSection.js'
import { CompletionScreen } from './Wizard/CompletionScreen.js'
import { useWizardEngine } from './Wizard/useWizardEngine.js'
import { StepClassification } from './BidsWizard/StepClassification.js'
import { StepSubjectSession } from './BidsWizard/StepSubjectSession.js'
import { StepSkullStrip } from './BidsWizard/StepSkullStrip.js'
import { StepBidsPreview } from './BidsWizard/StepBidsPreview.js'
import { BidsPrepEditor, BidsViewEditor } from './BidsWizard/BidsTreeEditor.js'
import { BidsSidecarFixForm } from './BidsWizard/BidsSidecarFixForm.js'
import { BidsSeriesFilter } from './BidsSeriesFilter.js'
import { VolumePickerField } from './Wizard/fields/VolumePickerField.js'
import type { DicomSeries } from '../../../common/dcm2niixTypes.js'

// ── Classification table adapter ─────────────────────────────────────

/** Get series indices belonging to excluded subjects */
function getExcludedSeriesIndices(subjects: DetectedSubject[]): Set<number> {
  const excluded = new Set<number>()
  for (const sub of subjects) {
    if (!sub.excluded) continue
    for (const ses of sub.sessions) {
      for (const idx of ses.seriesIndices) {
        excluded.add(idx)
      }
    }
  }
  return excluded
}

function ClassificationAdapter({
  context,
  onFieldChange
}: {
  context: Record<string, unknown>
  onFieldChange: (fieldName: string, value: unknown) => void
}): React.ReactElement {
  const rawMappings = (context.series_list as BidsSeriesMapping[]) || []
  const subjects = (context.subjects as DetectedSubject[]) || []
  const excludedIndices = getExcludedSeriesIndices(subjects)

  // Apply subject exclusions to series mappings
  const mappings = rawMappings.map((m) =>
    excludedIndices.has(m.index) ? { ...m, excluded: true } : m
  )
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
  onFieldChange,
  onLoadFile
}: CustomComponentProps): React.ReactElement {
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

  const dilation = typeof context.dilation === 'number' ? (context.dilation as number) : 3
  const handleDilationChange = useCallback(
    (d: number) => {
      onFieldChange('dilation', d)
    },
    [onFieldChange]
  )

  return (
    <StepSkullStrip
      mappings={mappings}
      onMappingsUpdate={handleMappingsUpdate}
      nv={nvInstance}
      onLoadVolume={onLoadFile}
      completed={completed}
      onCompletedChange={handleCompletedChange}
      originalPaths={originalPaths}
      onOriginalPathsChange={handleOriginalPathsChange}
      useStripped={useStripped}
      onUseStrippedChange={handleUseStrippedChange}
      dilation={dilation}
      onDilationChange={handleDilationChange}
    />
  )
}

// ── Component registry ───────────────────────────────────────────────

interface CustomComponentProps {
  context: Record<string, unknown>
  stepOutputs?: Record<string, Record<string, unknown>>
  onFieldChange: (fieldName: string, value: unknown) => void
  onLoadFile?: (niftiPath: string) => Promise<void>
  fields?: string[]
  fieldDefs?: Record<string, import('../../../common/workflowTypes.js').ContextFieldDef>
}

/**
 * Form component for the `bids-fix-sidecars` tool. Reads `bids_dir` from
 * context (populated by a preceding bids-write step), runs the auto-fix
 * pass via BidsSidecarFixForm in `autoFixOnMount` mode, and writes a
 * summary of the result back into context so downstream steps can react.
 */
function BidsSidecarFixAdapter({
  context,
  onFieldChange
}: CustomComponentProps): React.ReactElement {
  const bidsDir = (context.bids_dir as string) || ''
  // Memoize so the BidsSidecarFixForm doesn't see a new array on every render.
  const mappings = useMemo(
    () => (context.series_list as BidsSeriesMapping[]) || [],
    [context.series_list]
  )

  const handleAutoFixed = useCallback(
    (fixes: SidecarAutoFixRecord[], validation: BidsValidationResult) => {
      onFieldChange('_sidecar_fix_state', {
        fixesApplied: fixes.length,
        valid: validation.valid,
        remainingErrors: validation.errors.length,
        remainingWarnings: validation.warnings.length
      })
    },
    [onFieldChange]
  )

  const handleRevalidated = useCallback(
    (validation: BidsValidationResult) => {
      onFieldChange('_sidecar_fix_state', {
        valid: validation.valid,
        remainingErrors: validation.errors.length,
        remainingWarnings: validation.warnings.length
      })
    },
    [onFieldChange]
  )

  if (!bidsDir) {
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          No BIDS dataset directory found in the workflow context. Add a &ldquo;Write BIDS
          Dataset&rdquo; step before this one and map its output to <code>bids_dir</code>.
        </Callout.Text>
      </Callout.Root>
    )
  }

  return (
    <BidsSidecarFixForm
      datasetDir={bidsDir}
      mappings={mappings}
      autoFixOnMount
      onAutoFixed={handleAutoFixed}
      onRevalidated={handleRevalidated}
    />
  )
}

function BidsSeriesFilterAdapter({
  context,
  onFieldChange
}: CustomComponentProps): React.ReactElement {
  const dicomSeries = useMemo(
    () => (context.dicom_series as DicomSeries[]) || [],
    [context.dicom_series]
  )
  const selectedSeries = useMemo(
    () => (context.selected_series as DicomSeries[]) || [],
    [context.selected_series]
  )

  const selectedNumbers = useMemo(() => {
    const s = new Set<number>()
    for (const row of selectedSeries) {
      if (typeof row.seriesNumber === 'number') s.add(row.seriesNumber)
    }
    return s
  }, [selectedSeries])

  // Default: include every discovered series. Runs once per mount when the
  // dicom_series heuristic has populated the list but the selection is empty
  // (e.g. first visit, or the heuristic seed was lost on a context round-trip).
  const seededRef = useRef(false)
  useEffect(() => {
    if (seededRef.current) return
    if (dicomSeries.length === 0) return
    if (selectedSeries.length > 0) {
      seededRef.current = true
      return
    }
    seededRef.current = true
    onFieldChange('selected_series', dicomSeries)
  }, [dicomSeries, selectedSeries, onFieldChange])

  const handleSelectionChange = useCallback(
    (next: Set<number>) => {
      const filtered = dicomSeries.filter(
        (s) => typeof s.seriesNumber === 'number' && next.has(s.seriesNumber)
      )
      onFieldChange('selected_series', filtered)
    },
    [dicomSeries, onFieldChange]
  )

  if (dicomSeries.length === 0) {
    return (
      <Callout.Root color="gray">
        <Callout.Text>
          Scanning the DICOM folder for series… if this takes more than a moment, check that
          the selected folder contains DICOM files.
        </Callout.Text>
      </Callout.Root>
    )
  }

  return (
    <div className="h-[60vh]">
      <BidsSeriesFilter
        series={dicomSeries}
        selectedSeriesNumbers={selectedNumbers}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  )
}

const COMPONENT_REGISTRY: Record<string, React.FC<CustomComponentProps>> = {
  'bids-series-filter': BidsSeriesFilterAdapter,
  'bids-classification-table': ClassificationAdapter,
  'subject-session-editor': SubjectSessionAdapter,
  'skull-strip-editor': SkullStripAdapter,
  'bids-preview': StepBidsPreview,
  'bids-prep-editor': BidsPrepEditor,
  'bids-view-editor': BidsViewEditor,
  'bids-sidecar-fix': BidsSidecarFixAdapter,
  'volume-picker': VolumePickerField
}

// ── Main WorkflowDialog ──────────────────────────────────────────────

interface WorkflowDialogProps {
  open: boolean
  onClose: () => void
  onLoadFile?: (niftiPath: string, options?: { append?: boolean }) => Promise<void>
  onLoadFiles?: (niftiPaths: string[]) => Promise<void>
  onBidsInit?: (mappings: BidsSeriesMapping[]) => void
  onEditWorkflow?: (workflowName: string) => void
  workflowName: string
  inputs: Record<string, unknown>
}

export function WorkflowDialog({
  open,
  onClose,
  onLoadFile,
  onLoadFiles,
  onBidsInit,
  onEditWorkflow,
  workflowName,
  inputs
}: WorkflowDialogProps): React.ReactElement | null {
  const engine = useWizardEngine(open, workflowName, inputs, onClose)

  const handleLoadFile = useCallback(
    async (niftiPath: string, options?: { append?: boolean }) => {
      if (onLoadFile) await onLoadFile(niftiPath, options)
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
  // A postCompletion section (e.g. BIDS View) renders its component AFTER
  // executeAllSteps finishes — it edits already-produced output rather than
  // gathering inputs. We swap CompletionScreen for the section's component
  // and surface a "Finish" button via the wizard footer.
  const currentSectionDef = sections[engine.currentSection]
  const inPostCompletionSection = isCompleted && currentSectionDef?.postCompletion === true

  // Derive per-field errors and a humanized "why is Next disabled?" reason
  // from the engine's missingInputs so the wizard footer can surface them
  // as a tooltip and the form section can mark offending inputs.
  const fieldDefs = engine.definition?.context?.fields ?? {}
  const fieldErrors = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of engine.missingInputs) {
      if (!m.contextField || map[m.contextField]) continue
      map[m.contextField] = 'Required'
    }
    return map
  }, [engine.missingInputs])

  const disabledReason = useMemo(() => {
    if (engine.missingInputs.length === 0) return undefined
    const labels: string[] = []
    const seen = new Set<string>()
    for (const m of engine.missingInputs) {
      const key = m.contextField || m.inputName
      if (seen.has(key)) continue
      seen.add(key)
      const def = m.contextField ? fieldDefs[m.contextField] : undefined
      labels.push(def?.label || def?.description || m.description || key)
    }
    if (labels.length === 1) return `Provide ${labels[0]} to continue`
    if (labels.length <= 3) return `Provide ${labels.join(', ')} to continue`
    return `Provide ${labels.slice(0, 2).join(', ')} and ${labels.length - 2} more to continue`
  }, [engine.missingInputs, fieldDefs])

  return (
    <WizardShell
      open={open}
      onClose={engine.handleClose}
      title={engine.definition?.description || workflowName}
      steps={wizardSteps.length > 0 ? wizardSteps : [{ label: 'Loading...' }]}
      currentStep={engine.currentSection}
      onStepChange={engine.goToSection}
      onNext={engine.handleNext}
      canProceed={!isPreparing && !isRunning && engine.missingInputs.length === 0}
      disabledReason={disabledReason}
      loading={isRunning}
      lastStepLabel={sections[engine.currentSection]?.buttonText || 'Run'}
      onComplete={inPostCompletionSection ? engine.handleClose : handleComplete}
      hideFooter={isCompleted && !inPostCompletionSection}
      requireConfirmOnClose={isRunning}
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

      {/* Form content — also rendered while in a postCompletion section so
          its custom component (e.g. BIDS View) gets the just-populated
          context (bids_dir from the write step's outputMappings). */}
      {!isPreparing && engine.definition && sections[engine.currentSection] &&
        (!isCompleted || inPostCompletionSection) && (
        <FormSection
          section={sections[engine.currentSection]}
          definition={engine.definition}
          context={engine.context}
          stepOutputs={engine.stepOutputs}
          onFieldChange={engine.handleFieldChange}
          heuristicLoading={engine.heuristicLoading}
          onLoadFile={handleLoadFile}
          componentRegistry={COMPONENT_REGISTRY}
          fieldErrors={fieldErrors}
        />
      )}

      {/* Auto-generated form for missing inputs not already shown in the current section */}
      {(() => {
        const currentFields = new Set(sections[engine.currentSection]?.fields || [])
        const extraMissing = engine.missingInputs.filter((m) => !m.contextField || !currentFields.has(m.contextField))
        return extraMissing.length > 0 && !isPreparing && !isRunning && !isCompleted && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="text-[var(--yellow-9)]" />
            <Heading size="3" className="text-neutral-12">
              Required Fields
            </Heading>
          </div>
          <div className="flex flex-col gap-3">
            {extraMissing.map((m) => {
              const currentValue = m.contextField ? (engine.context[m.contextField] as string || '') : ''

              return (
                <div key={`${m.stepName}-${m.inputName}`} className="flex flex-col gap-1">
                  <Text size="2" weight="medium" className="text-neutral-11">
                    {m.description || m.inputName}
                  </Text>
                  <Text size="1" className="text-neutral-8">
                    Step: {m.stepName} / {m.inputName} ({m.type})
                  </Text>
                  {m.type === 'directory' || m.type === 'dicom-folder' ? (
                    <div className="flex items-center gap-2">
                      <TextField.Root
                        value={currentValue}
                        onChange={(e) => {
                          if (m.contextField) {
                            void engine.handleFieldChange(m.contextField, e.target.value)
                          }
                        }}
                        placeholder="Select a directory..."
                        size="2"
                        className="flex-1"
                      />
                      <button
                        className="px-3 py-1.5 rounded bg-[var(--accent-3)] text-[var(--accent-11)] hover:bg-[var(--accent-4)] transition-colors text-sm cursor-pointer"
                        onClick={async () => {
                          const dir = await electron.ipcRenderer.invoke('workflow:select-directory', { title: m.description })
                          if (dir && m.contextField) {
                            void engine.handleFieldChange(m.contextField, dir)
                          }
                        }}
                      >
                        Browse...
                      </button>
                    </div>
                  ) : (
                    <TextField.Root
                      value={currentValue}
                      onChange={(e) => {
                        if (m.contextField) {
                          void engine.handleFieldChange(m.contextField, e.target.value)
                        }
                      }}
                      placeholder={m.description}
                      size="2"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        )
      })()}

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

      {/* Completion screen — only when there is no postCompletion section
          (the postCompletion section IS the completion view for workflows
          that define one). */}
      {isCompleted && !inPostCompletionSection && (
        <CompletionScreen
          context={engine.context}
          outputs={engine.completedOutputs}
          stepOutputs={engine.completedStepOutputs}
          onClose={engine.handleClose}
          onLoadFile={handleLoadFile}
          onLoadFiles={onLoadFiles}
          onEditWorkflow={onEditWorkflow ? () => {
            engine.handleClose()
            onEditWorkflow(workflowName)
          } : undefined}
        />
      )}
    </WizardShell>
  )
}
