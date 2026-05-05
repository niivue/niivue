import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { WorkflowDefinition, FormSectionDef, ToolDefinition } from '../../../../common/workflowTypes.js'
import { validateUserProvidedInputs, type MissingInput } from '../../../../common/workflowValidator.js'

const electron = window.electron

export interface WizardEngineState {
  runId: string | null
  definition: WorkflowDefinition | null
  context: Record<string, unknown>
  currentSection: number
  status: 'idle' | 'preparing' | 'form' | 'running' | 'completed' | 'error'
  completedOutputs: Record<string, unknown> | null
  error: string | null
  heuristicLoading: Set<string>
  missingInputs: MissingInput[]
}

export interface WizardEngineActions {
  goToSection: (section: number) => void
  handleFieldChange: (fieldName: string, value: unknown) => Promise<void>
  handleNext: () => Promise<void>
  handleBack: () => void
  handleClose: () => void
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
  const [currentSection, setCurrentSection] = useState(0)
  const [status, setStatus] = useState<WizardEngineState['status']>('idle')
  const [completedOutputs, setCompletedOutputs] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [heuristicLoading, setHeuristicLoading] = useState<Set<string>>(new Set())
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const runIdRef = useRef<string | null>(null)
  const closingRef = useRef(false)

  // Load tools once when dialog opens
  useEffect(() => {
    if (!open) return
    electron.ipcRenderer.invoke('workflow:list-tools').then((t: ToolDefinition[]) => setTools(t))
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

    const init = async (): Promise<void> => {
      try {
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

        // Run auto-runnable steps
        const hasAutoSteps = (startResult.autoSteps as string[])?.length > 0
        if (hasAutoSteps) {
          const autoResult = await electron.ipcRenderer.invoke('workflow:run-auto-steps', { runId: rid })
          if (cancelled) return
          if (autoResult.runState?.context) {
            setContext(autoResult.runState.context)
          }
        }

        if (cancelled) return
        setStatus('form')

        // Run heuristics for the first section
        const firstSection = startResult.definition.form?.sections?.[0]
        if (firstSection) {
          await runSectionHeuristics(rid, startResult.definition, firstSection)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setStatus('error')
        }
      }
    }
    void init()

    return () => {
      cancelled = true
      if (runIdRef.current) {
        void electron.ipcRenderer.invoke('workflow:cancel', { runId: runIdRef.current })
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

    // Fields to consider: section.fields plus any extra context fields the
    // section's formComponent requires (e.g. bids-preview reads series_list
    // even when the section only exposes output_dir).
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

    for (const fieldName of fieldNames) {
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

  const handleNext = useCallback(async (): Promise<void> => {
    if (!runId) return

    setStatus('running')
    setError(null)

    if (isLastSection) {
      // Final step: execute all remaining workflow steps
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

    // Run the next ready step (one at a time, not all at once)
    // This ensures dcm2niix runs after import, but classify doesn't
    // run until explicitly needed — heuristics handle context population
    try {
      const readyResult = await electron.ipcRenderer.invoke('workflow:run-ready-steps', { runId, maxStepIndex: currentSection })
      if (readyResult.runState?.context) {
        setContext(readyResult.runState.context)
      }
    } catch (err) {
      // Non-fatal — some sections are form-only with no step to run
      console.warn('run-ready-steps:', err)
    }

    setStatus('form')
    const nextSection = currentSection + 1
    setCurrentSection(nextSection)

    // Run heuristics for the next section — these populate context fields
    // with subject exclusion propagation, classification, etc.
    if (definition && sections[nextSection]) {
      await runSectionHeuristics(runId, definition, sections[nextSection])
    }
  }, [currentSection, isLastSection, runId, definition, sections])

  const handleBack = useCallback((): void => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }, [currentSection])

  const handleClose = useCallback((): void => {
    if (closingRef.current) return
    closingRef.current = true
    if (runIdRef.current) {
      void electron.ipcRenderer.invoke('workflow:cancel', { runId: runIdRef.current })
      runIdRef.current = null
    }
    setRunId(null)
    setDefinition(null)
    setContext({})
    setCurrentSection(0)
    setStatus('idle')
    setError(null)
    setCompletedOutputs(null)
    onClose()
    setTimeout(() => { closingRef.current = false }, 0)
  }, [onClose])

  const goToSection = useCallback(async (section: number): Promise<void> => {
    const isForward = section > currentSection
    setCurrentSection(section)
    if (isForward && runId && definition && sections[section]) {
      await runSectionHeuristics(runId, definition, sections[section])
    }
  }, [currentSection, runId, definition, sections])

  return {
    runId,
    definition,
    context,
    currentSection,
    status,
    completedOutputs,
    error,
    heuristicLoading,
    missingInputs,
    goToSection,
    handleFieldChange,
    handleNext,
    handleBack,
    handleClose
  }
}
