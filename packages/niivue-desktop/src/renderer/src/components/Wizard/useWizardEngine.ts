import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type {
  WorkflowDefinition,
  FormSectionDef,
  ToolDefinition,
  WorkflowRunState,
  WorkflowStepProgress
} from '../../../../common/workflowTypes.js'
import {
  validateUserProvidedInputs,
  type MissingInput
} from '../../../../common/workflowValidator.js'
import { readStoredRun, writeStoredRun, clearStoredRun } from './wizardRunStorage.js'

const electron = window.electron

export interface ResumeOffer {
  runId: string
  definition: WorkflowDefinition
  runState: WorkflowRunState
  currentSection: number
}

export interface WizardEngineState {
  runId: string | null
  definition: WorkflowDefinition | null
  context: Record<string, unknown>
  stepOutputs: Record<string, Record<string, unknown>>
  currentSection: number
  status: 'idle' | 'preparing' | 'form' | 'running' | 'completed' | 'error'
  completedOutputs: Record<string, unknown> | null
  completedStepOutputs: Record<string, Record<string, unknown>> | null
  error: string | null
  heuristicLoading: Set<string>
  /** Non-fatal heuristic failures keyed by the field that failed to refresh.
   *  Empty when everything is healthy; consumed by the form to surface inline
   *  errors instead of leaving the field silently empty. */
  heuristicErrors: Record<string, string>
  /** Most recent non-fatal update-context failure, or null. Surfaced as a
   *  transient banner so a single keystroke that fails doesn't blow up the
   *  whole wizard. Cleared via `dismissUpdateError`. */
  updateError: string | null
  missingInputs: MissingInput[]
  /** Latest progress event for the currently running step. Null when no
   *  step is running or the step hasn't emitted progress yet. */
  progress: WorkflowStepProgress | null
  /** When non-null, a previous run for this workflow is still alive in the
   *  main process and the user is being asked whether to resume it. The
   *  wizard renders a Resume / Start fresh prompt instead of the form. */
  resumeOffer: ResumeOffer | null
}

export interface WizardEngineActions {
  goToSection: (section: number) => void
  handleFieldChange: (fieldName: string, value: unknown) => Promise<void>
  handleNext: () => Promise<void>
  handleBack: () => void
  handleClose: () => void
  /** Close the wizard but leave the active run executing in the main
   *  process. The run id stays in localStorage so the next open offers a
   *  Resume prompt. Used by the close-during-run AlertDialog. */
  handleCloseKeepingRun: () => void
  acceptResume: () => Promise<void>
  declineResume: () => Promise<void>
  dismissUpdateError: () => void
}

export function useWizardEngine(
  open: boolean,
  workflowName: string,
  inputs: Record<string, unknown>,
  onClose: () => void
): WizardEngineState & WizardEngineActions {
  const [runId, setRunId] = useState<string | null>(null)
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null)
  const [context, setContext] = useState<Record<string, unknown>>({})
  const [stepOutputs, setStepOutputs] = useState<Record<string, Record<string, unknown>>>({})
  const [currentSection, setCurrentSection] = useState(0)
  const [status, setStatus] = useState<WizardEngineState['status']>('idle')
  const [completedOutputs, setCompletedOutputs] = useState<Record<string, unknown> | null>(null)
  const [completedStepOutputs, setCompletedStepOutputs] = useState<Record<
    string,
    Record<string, unknown>
  > | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [heuristicLoading, setHeuristicLoading] = useState<Set<string>>(new Set())
  // Non-fatal errors from heuristic / update-context calls keyed by the field
  // they failed on. Surfaced inline next to the field so users aren't left
  // wondering why "Detected series" is empty after a directory change.
  const [heuristicErrors, setHeuristicErrors] = useState<Record<string, string>>({})
  // Most recent update-context failure. Not field-scoped (the update could
  // be for any field); surfaced as a transient banner by the consumer.
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [progress, setProgress] = useState<WorkflowStepProgress | null>(null)
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [resumeOffer, setResumeOffer] = useState<ResumeOffer | null>(null)
  const runIdRef = useRef<string | null>(null)
  const closingRef = useRef(false)
  // When set, the unmount cleanup skips the workflow:cancel so the run keeps
  // executing in the main process and can be resumed on reopen. Reset on every
  // init so a previous keep-alive close doesn't leak into a fresh open.
  const keepAliveRef = useRef(false)

  // Load tools once when dialog opens
  useEffect(() => {
    if (!open) return
    electron.ipcRenderer.invoke('workflow:list-tools').then((t: ToolDefinition[]) => setTools(t))
  }, [open])

  // Subscribe to per-step progress for this wizard's run. Filtering by
  // runIdRef keeps stale events from a previous run (or another open dialog)
  // out of the current progress bar.
  useEffect(() => {
    if (!open) return
    const handler = (_evt: unknown, payload: WorkflowStepProgress): void => {
      if (!runIdRef.current || payload.runId !== runIdRef.current) return
      // Reset the bar to indeterminate between steps so a fast-finishing
      // step doesn't leave its 100% bar visible during the next slow one.
      if (payload.phase === 'done') {
        setProgress({ ...payload, current: undefined, total: undefined })
        return
      }
      setProgress(payload)
    }
    electron.ipcRenderer.on('workflow:step-progress', handler)
    return (): void => {
      electron.ipcRenderer.removeListener('workflow:step-progress', handler)
    }
  }, [open])

  // Compute missing inputs — only flag inputs whose context fields appear
  // in sections up to and including the current one.
  const formSections = definition?.form?.sections ?? []
  const missingInputs = useMemo((): MissingInput[] => {
    if (!definition || tools.length === 0) return []
    const toolsMap = new Map(tools.map((t) => [t.name, t]))

    // Collect all context field names shown in sections 0..currentSection
    const visibleFields = new Set<string>()
    for (let i = 0; i <= currentSection; i++) {
      const sec = formSections[i]
      if (sec) {
        for (const f of sec.fields) visibleFields.add(f)
      }
    }

    // Validate all steps but filter to only missing inputs whose contextField
    // is visible in the current or prior sections
    const allMissing = validateUserProvidedInputs(definition, context, inputs, toolsMap)
    return allMissing.filter((m) => m.contextField && visibleFields.has(m.contextField))
  }, [definition, context, inputs, tools, currentSection, formSections])

  // Start the workflow run when dialog opens
  useEffect(() => {
    if (!open || !workflowName) return

    let cancelled = false
    keepAliveRef.current = false

    const startFresh = async (): Promise<void> => {
      setStatus('preparing')
      setError(null)

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
      writeStoredRun({ runId: rid, workflowName, currentSection: 0 })

      // Run auto-runnable steps
      const hasAutoSteps = (startResult.autoSteps as string[])?.length > 0
      if (hasAutoSteps) {
        const autoResult = await electron.ipcRenderer.invoke('workflow:run-auto-steps', {
          runId: rid
        })
        if (cancelled) return
        if (autoResult.runState?.context) {
          setContext(autoResult.runState.context)
        }
        if (autoResult.runState?.stepOutputs) {
          setStepOutputs(autoResult.runState.stepOutputs)
        }
      }

      if (cancelled) return
      setStatus('form')

      // Run heuristics for the first section
      const firstSection = startResult.definition.form?.sections?.[0]
      if (firstSection) {
        await runSectionHeuristics(rid, startResult.definition, firstSection)
      }
    }

    const init = async (): Promise<void> => {
      try {
        setStatus('preparing')
        setError(null)

        // Look for a still-alive run from a previous wizard session. If the
        // main-process state has been GC'd (cancelled, app restart) we silently
        // fall through to a fresh start. If it's alive we surface a Resume
        // prompt and wait — startFresh runs only after the user picks one.
        const stored = readStoredRun(workflowName)
        if (stored) {
          try {
            const probe = await electron.ipcRenderer.invoke('workflow:get-state', {
              runId: stored.runId
            })
            if (cancelled) return
            if (probe?.runState && probe?.definition) {
              setResumeOffer({
                runId: stored.runId,
                runState: probe.runState as WorkflowRunState,
                definition: probe.definition as WorkflowDefinition,
                currentSection: stored.currentSection
              })
              return
            }
          } catch {
            // probe failure means the run is gone; clear and fall through
          }
          clearStoredRun()
        }

        await startFresh()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setStatus('error')
        }
      }
    }
    void init()

    return (): void => {
      cancelled = true
      if (runIdRef.current && !keepAliveRef.current) {
        void electron.ipcRenderer.invoke('workflow:cancel', { runId: runIdRef.current })
        runIdRef.current = null
      }
    }
  }, [open, workflowName])

  // Fields a section is responsible for, including any extra context fields
  // the section's formComponent reads at runtime (e.g. bids-preview reads
  // series_list even when the section only exposes output_dir).
  const sectionFieldNames = (section: FormSectionDef): Set<string> => {
    const fieldNames = new Set<string>(section.fields)
    if (section.component) {
      for (const tool of tools) {
        const blocks = Array.isArray(tool.block) ? tool.block : tool.block ? [tool.block] : []
        for (const block of blocks) {
          if (block.formComponent !== section.component) continue
          for (const f of block.exposedFields ?? []) fieldNames.add(f)
          for (const f of block.requiredContextFields ?? []) fieldNames.add(f)
        }
      }
    }
    return fieldNames
  }

  const fireHeuristic = async (rid: string, fieldName: string): Promise<void> => {
    setHeuristicLoading((prev) => new Set(prev).add(fieldName))
    setHeuristicErrors((prev) => {
      if (!(fieldName in prev)) return prev
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
    try {
      const result = await electron.ipcRenderer.invoke('workflow:run-heuristic', {
        runId: rid,
        fieldName
      })
      if (result.context) setContext(result.context)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Heuristic for ${fieldName} failed:`, err)
      setHeuristicErrors((prev) => ({ ...prev, [fieldName]: msg }))
    } finally {
      setHeuristicLoading((prev) => {
        const next = new Set(prev)
        next.delete(fieldName)
        return next
      })
    }
  }

  const runSectionHeuristics = async (
    rid: string,
    def: WorkflowDefinition,
    section: FormSectionDef
  ): Promise<void> => {
    const fields = def.context?.fields ?? {}
    for (const fieldName of sectionFieldNames(section)) {
      if (!fields[fieldName]?.heuristic) continue
      await fireHeuristic(rid, fieldName)
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
        if (result.context) setContext(result.context)

        // Refire heuristics for OTHER fields in this section. Lets a heuristic
        // depending on the changed field (e.g. list-dicom-series on dicom_dir)
        // populate without forcing the user to leave and return. Heuristics
        // preserve user edits, so re-running is idempotent.
        //
        // Honor `dependsOn` when present so we don't pay for slow heuristics
        // (e.g. list-dicom-series scans the whole DICOM directory) on every
        // unrelated keystroke or selection click. Without dependsOn we fall
        // back to the legacy broad refire.
        if (!definition) return
        const section = definition.form?.sections?.[currentSection]
        if (!section) return
        const fields = definition.context?.fields ?? {}
        for (const fname of sectionFieldNames(section)) {
          if (fname === fieldName) continue
          const def = fields[fname]
          if (!def?.heuristic) continue
          if (def.dependsOn && !def.dependsOn.includes(fieldName)) continue
          await fireHeuristic(runId, fname)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Failed to update context:', err)
        setUpdateError(msg)
      }
    },
    [runId, definition, currentSection, tools]
  )

  const dismissUpdateError = useCallback((): void => setUpdateError(null), [])

  const sections = definition?.form?.sections ?? []
  // The "engine-final" section is the last one that DOESN'T have
  // postCompletion: true. Anything after it is a post-execution view
  // (e.g. BIDS View reading bids_dir produced by the write step).
  const firstPostCompletionIdx = sections.findIndex((s) => s.postCompletion)
  const lastEngineSectionIdx =
    firstPostCompletionIdx === -1 ? sections.length - 1 : firstPostCompletionIdx - 1
  const isLastSection = currentSection >= lastEngineSectionIdx

  const handleNext = useCallback(async (): Promise<void> => {
    if (!runId) return

    setStatus('running')
    setError(null)

    if (isLastSection) {
      // Final engine step: execute all remaining workflow steps. If a
      // post-completion section exists, advance into it so the user can
      // edit the just-written output without leaving the dialog.
      setProgress(null)
      try {
        const result = await electron.ipcRenderer.invoke('workflow:execute-all', { runId })
        if (result.runState?.context) setContext(result.runState.context)
        if (result.runState?.stepOutputs) setStepOutputs(result.runState.stepOutputs)
        setStatus('completed')
        setCompletedOutputs(result.outputs ?? null)
        setCompletedStepOutputs(result.stepOutputs ?? null)
        setProgress(null)
        // The run is over — main-process activeRuns has been cleared by
        // executeAllSteps. Drop the storage entry so a future reopen doesn't
        // probe a dead runId and show a misleading Resume prompt.
        clearStoredRun()
        if (firstPostCompletionIdx > currentSection) {
          setCurrentSection(firstPostCompletionIdx)
        }
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
      return
    }

    // Run the next ready step (one at a time, not all at once)
    // This ensures dcm2niix runs after import, but classify doesn't
    // run until explicitly needed — heuristics handle context population
    setProgress(null)
    try {
      const readyResult = await electron.ipcRenderer.invoke('workflow:run-ready-steps', {
        runId,
        maxStepIndex: currentSection
      })
      if (readyResult.runState?.context) {
        setContext(readyResult.runState.context)
      }
      if (readyResult.runState?.stepOutputs) {
        setStepOutputs(readyResult.runState.stepOutputs)
      }
    } catch (err) {
      // Non-fatal — some sections are form-only with no step to run
      console.warn('run-ready-steps:', err)
    }

    setProgress(null)
    setStatus('form')
    const nextSection = currentSection + 1
    setCurrentSection(nextSection)
    writeStoredRun({ runId, workflowName, currentSection: nextSection })

    // Run heuristics for the next section — these populate context fields
    // with subject exclusion propagation, classification, etc.
    if (definition && sections[nextSection]) {
      await runSectionHeuristics(runId, definition, sections[nextSection])
    }
  }, [
    currentSection,
    isLastSection,
    runId,
    definition,
    sections,
    firstPostCompletionIdx,
    workflowName
  ])

  const handleBack = useCallback((): void => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }, [currentSection])

  const resetWizardState = useCallback((): void => {
    setRunId(null)
    setDefinition(null)
    setContext({})
    setStepOutputs({})
    setCurrentSection(0)
    setStatus('idle')
    setError(null)
    setProgress(null)
    setCompletedOutputs(null)
    setCompletedStepOutputs(null)
    setResumeOffer(null)
  }, [])

  const handleClose = useCallback((): void => {
    if (closingRef.current) return
    closingRef.current = true
    if (runIdRef.current) {
      void electron.ipcRenderer.invoke('workflow:cancel', { runId: runIdRef.current })
      runIdRef.current = null
    }
    clearStoredRun()
    resetWizardState()
    onClose()
    setTimeout(() => {
      closingRef.current = false
    }, 0)
  }, [onClose, resetWizardState])

  // Detach from the run without cancelling it. The main-process engine keeps
  // executing; the runId stays in localStorage so the next open offers a
  // Resume prompt. Used by the close-during-run AlertDialog's third option.
  const handleCloseKeepingRun = useCallback((): void => {
    if (closingRef.current) return
    closingRef.current = true
    if (runIdRef.current) {
      // Refresh the timestamp so the resume TTL starts from "now" rather than
      // the start-of-run; a long-running step shouldn't expire mid-flight.
      writeStoredRun({
        runId: runIdRef.current,
        workflowName,
        currentSection
      })
    }
    keepAliveRef.current = true
    runIdRef.current = null
    resetWizardState()
    onClose()
    setTimeout(() => {
      closingRef.current = false
    }, 0)
  }, [onClose, resetWizardState, workflowName, currentSection])

  const acceptResume = useCallback(async (): Promise<void> => {
    if (!resumeOffer) return
    setStatus('preparing')
    setError(null)
    setRunId(resumeOffer.runId)
    runIdRef.current = resumeOffer.runId
    setDefinition(resumeOffer.definition)
    setContext(resumeOffer.runState.context)
    setStepOutputs(resumeOffer.runState.stepOutputs ?? {})
    setCurrentSection(resumeOffer.currentSection)
    writeStoredRun({
      runId: resumeOffer.runId,
      workflowName,
      currentSection: resumeOffer.currentSection
    })
    setResumeOffer(null)

    // Match startFresh's post-init contract: if the resumed run is sitting at
    // a form section, re-run that section's heuristics so any context fields
    // whose heuristic depends on disk state (e.g. dicom_series scans) refresh
    // rather than carrying stale values from the snapshotted state.
    const section = resumeOffer.definition.form?.sections?.[resumeOffer.currentSection]
    setStatus('form')
    if (section) {
      await runSectionHeuristics(resumeOffer.runId, resumeOffer.definition, section)
    }
  }, [resumeOffer, workflowName])

  const declineResume = useCallback(async (): Promise<void> => {
    if (!resumeOffer) return
    try {
      await electron.ipcRenderer.invoke('workflow:cancel', { runId: resumeOffer.runId })
    } catch {
      // run may already be gone; clearing storage is the important part
    }
    clearStoredRun()
    setResumeOffer(null)
    // Now perform the deferred fresh start. Re-running the init effect would
    // require toggling `open`, so trigger the same flow inline.
    try {
      setStatus('preparing')
      setError(null)
      const startResult = await electron.ipcRenderer.invoke('workflow:start', {
        name: workflowName,
        inputs
      })
      const rid = startResult.runId as string
      setRunId(rid)
      runIdRef.current = rid
      setDefinition(startResult.definition)
      setContext(startResult.runState.context)
      setCurrentSection(0)
      writeStoredRun({ runId: rid, workflowName, currentSection: 0 })

      const hasAutoSteps = (startResult.autoSteps as string[])?.length > 0
      if (hasAutoSteps) {
        const autoResult = await electron.ipcRenderer.invoke('workflow:run-auto-steps', {
          runId: rid
        })
        if (autoResult.runState?.context) setContext(autoResult.runState.context)
        if (autoResult.runState?.stepOutputs) setStepOutputs(autoResult.runState.stepOutputs)
      }
      setStatus('form')
      const firstSection = startResult.definition.form?.sections?.[0]
      if (firstSection) {
        await runSectionHeuristics(rid, startResult.definition, firstSection)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }, [resumeOffer, workflowName, inputs])

  const goToSection = useCallback(
    async (section: number): Promise<void> => {
      const isForward = section > currentSection
      setCurrentSection(section)
      if (runId) {
        writeStoredRun({ runId, workflowName, currentSection: section })
      }
      if (isForward && runId && definition && sections[section]) {
        await runSectionHeuristics(runId, definition, sections[section])
      }
    },
    [currentSection, runId, definition, sections, workflowName]
  )

  return {
    runId,
    definition,
    context,
    stepOutputs,
    currentSection,
    status,
    completedOutputs,
    completedStepOutputs,
    error,
    heuristicLoading,
    heuristicErrors,
    updateError,
    missingInputs,
    progress,
    resumeOffer,
    goToSection,
    handleFieldChange,
    handleNext,
    handleBack,
    handleClose,
    handleCloseKeepingRun,
    acceptResume,
    declineResume,
    dismissUpdateError
  }
}
