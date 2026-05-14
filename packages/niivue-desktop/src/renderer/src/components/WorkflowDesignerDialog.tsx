// ── WorkflowDesignerDialog ────────────────────────────────────────────
//
// A thin modal shell around ContextSpineDesigner. Owns the workflow draft
// state, loads tool definitions via IPC, serializes draft ↔ workflow JSON,
// and runs live validation. Block adding / removing / reordering is wired
// through to ContextSpineDesigner.
//
// This replaces the old WorkflowDesigner.tsx which was a 2,500-line file
// containing a parallel "advanced" JSON editor, tutorial, and form preview.
// Power users who want to edit JSON directly should open the .workflow.json
// file in their text editor.

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button, Text, Flex, Heading, SegmentedControl, Popover, Badge } from '@radix-ui/themes'
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ResetIcon,
  ReloadIcon
} from '@radix-ui/react-icons'
import type { ToolDefinition } from '../../../common/workflowTypes.js'
import {
  blockToStepDraft,
  blockToContextFields,
  blockToFormSection,
  repairBlockDefaults,
  getWorkflowBlocks,
  type WorkflowBlock,
  type WorkflowDraft,
  type BindingDraft,
  type StepDraft,
  type FormSectionDraft,
  type ContextFieldDraft
} from '../../../common/workflowBlocks.js'
import { validateWorkflowDraft, type ValidationResult } from '../../../common/workflowValidator.js'
import { ContextSpineDesigner } from './ContextSpineDesigner.js'
import { WorkflowDiagramView } from './WorkflowDiagramView.js'
import { BlockPalette } from './BlockPalette.js'

const electron = window.electron

// ── Props ────────────────────────────────────────────────────────────

interface WorkflowDesignerDialogProps {
  open: boolean
  onClose: () => void
  onSave?: (schema: Record<string, unknown>) => void
  /** Optional existing definition to edit (converted to a draft on open). */
  initialDefinition?: Record<string, unknown> | null
  /**
   * Label for the "Back to …" button. Defaults to "viewer"; pass "wizard"
   * when the designer was opened mid-wizard via Edit Workflow so the user
   * sees they'll return to the wizard they were running.
   */
  backTarget?: string
  /** Open the workflow template gallery — surfaced to empty-state CTAs in
   *  both designer views so a fresh author can pivot to a template. */
  onOpenGallery?: () => void
}

// ── Constants ────────────────────────────────────────────────────────

const DEFAULT_DRAFT: WorkflowDraft = {
  name: '',
  version: '1.0.0',
  description: '',
  menu: 'Processing',
  sections: [],
  contextFields: {},
  steps: [],
  workflowInputs: {},
  workflowOutputs: {}
}

// ── Draft ↔ Definition serialization ─────────────────────────────────

function definitionToDraft(parsed: Record<string, unknown>): WorkflowDraft {
  const draft: WorkflowDraft = {
    name: (parsed.name as string) || '',
    version: (parsed.version as string) || '1.0.0',
    description: (parsed.description as string) || '',
    menu: (parsed.menu as string) || 'Processing',
    sections: [],
    contextFields: {},
    steps: [],
    workflowInputs: (parsed.inputs as Record<string, { type: string; description: string }>) || {},
    workflowOutputs: (parsed.outputs as Record<string, { type: string; ref: string }>) || {}
  }

  const form = parsed.form as { sections?: Record<string, unknown>[] } | undefined
  if (form?.sections) {
    draft.sections = form.sections.map((s) => ({
      title: (s.title as string) || '',
      description: (s.description as string) || '',
      fields: (s.fields as string[]) || [],
      component: (s.component as string) || '',
      buttonText: (s.buttonText as string) || ''
    }))
  }

  const context = parsed.context as { fields?: Record<string, Record<string, unknown>> } | undefined
  if (context?.fields) {
    for (const [name, field] of Object.entries(context.fields)) {
      draft.contextFields[name] = {
        type: (field.type as string) || 'string',
        label: (field.label as string) || '',
        description: (field.description as string) || '',
        heuristic: (field.heuristic as string) || '',
        default: field.default !== undefined ? JSON.stringify(field.default) : '',
        ...(Array.isArray(field.enum) ? { enum: field.enum as unknown[] } : {}),
        ...(typeof field.optional === 'boolean' ? { optional: field.optional } : {}),
        ...(typeof field.min === 'number' ? { min: field.min } : {}),
        ...(typeof field.max === 'number' ? { max: field.max } : {})
      }
    }
  }

  const steps = parsed.steps as Record<string, Record<string, unknown>> | undefined
  if (steps) {
    for (const [name, step] of Object.entries(steps)) {
      const inputs: Record<string, BindingDraft> = {}
      if (step.inputs) {
        for (const [key, binding] of Object.entries(
          step.inputs as Record<string, Record<string, unknown>>
        )) {
          if ('ref' in binding) {
            inputs[key] = { mode: 'ref', value: binding.ref as string }
          } else if ('constant' in binding) {
            inputs[key] = { mode: 'constant', value: JSON.stringify(binding.constant) }
          }
        }
      }
      draft.steps.push({
        name,
        tool: (step.tool as string) || '',
        inputs,
        outputMappings: (step.outputMappings as Record<string, string>) || {},
        condition: (step.condition as string) || ''
      })
    }
  }

  return draft
}

function draftToSchema(draft: WorkflowDraft): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    name: draft.name,
    version: draft.version,
    description: draft.description,
    menu: draft.menu,
    inputs: draft.workflowInputs,
    outputs: draft.workflowOutputs
  }

  if (draft.sections.length > 0) {
    schema.form = {
      sections: draft.sections
        .filter((s) => s.title.trim())
        .map((s) => {
          const section: Record<string, unknown> = {
            title: s.title,
            fields: s.fields.filter((f) => f.trim())
          }
          if (s.description.trim()) section.description = s.description
          if (s.component.trim()) section.component = s.component
          if (s.buttonText.trim()) section.buttonText = s.buttonText
          return section
        })
    }
  }

  if (Object.keys(draft.contextFields).length > 0) {
    const fields: Record<string, Record<string, unknown>> = {}
    for (const [name, field] of Object.entries(draft.contextFields)) {
      const f: Record<string, unknown> = {
        type: field.type,
        description: field.description
      }
      if (field.label) f.label = field.label
      if (field.heuristic) f.heuristic = field.heuristic
      if (field.default) {
        try {
          f.default = JSON.parse(field.default)
        } catch {
          f.default = field.default
        }
      }
      if (field.enum) f.enum = field.enum
      if (field.optional !== undefined) f.optional = field.optional
      if (field.min !== undefined) f.min = field.min
      if (field.max !== undefined) f.max = field.max
      fields[name] = f
    }
    schema.context = { fields }
  }

  if (draft.steps.length > 0) {
    const steps: Record<string, Record<string, unknown>> = {}
    for (const step of draft.steps) {
      if (!step.name.trim() || !step.tool) continue
      const s: Record<string, unknown> = { tool: step.tool }

      const inputs: Record<string, Record<string, unknown>> = {}
      for (const [key, binding] of Object.entries(step.inputs)) {
        if (!binding.value.trim()) continue
        if (binding.mode === 'ref') {
          inputs[key] = { ref: binding.value }
        } else {
          try {
            inputs[key] = { constant: JSON.parse(binding.value) }
          } catch {
            inputs[key] = { constant: binding.value }
          }
        }
      }
      s.inputs = inputs

      const mappings: Record<string, string> = {}
      for (const [outKey, ctxField] of Object.entries(step.outputMappings)) {
        if (outKey.trim() && ctxField.trim()) mappings[outKey] = ctxField
      }
      if (Object.keys(mappings).length > 0) s.outputMappings = mappings
      if (step.condition.trim()) s.condition = step.condition

      steps[step.name] = s
    }
    schema.steps = steps
  }

  return schema
}

// ── Component ────────────────────────────────────────────────────────

export function WorkflowDesignerDialog({
  open,
  onClose,
  onOpenGallery,
  onSave,
  initialDefinition,
  backTarget = 'viewer'
}: WorkflowDesignerDialogProps): React.ReactElement | null {
  const [draft, setDraft] = useState<WorkflowDraft>({ ...DEFAULT_DRAFT })
  const [tools, setTools] = useState<ToolDefinition[]>([])
  // Names of tools that have an executor (declarative `exec` block or
  // code-registered). The designer marks non-runnable blocks so authors
  // see at design time which tools can actually run end-to-end.
  const [runnableTools, setRunnableTools] = useState<Set<string>>(new Set())
  const [heuristicNames, setHeuristicNames] = useState<string[]>([])
  const [validation, setValidation] = useState<ValidationResult>({ errors: [], warnings: [] })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [view, setView] = useState<'list' | 'diagram'>('list')
  const [selectedStep, setSelectedStep] = useState<number | null>(null)

  // Snapshot of the draft at last open / last successful save. We compare the
  // current draft against this to decide whether the close button should warn
  // about discarding changes. JSON-stringify is fine — the draft is plain data.
  const baselineDraftRef = useRef<string>(JSON.stringify(DEFAULT_DRAFT))
  const dirty = useMemo(() => JSON.stringify(draft) !== baselineDraftRef.current, [draft])

  // Undo/redo stacks (capped at 50 entries each) hold JSON-stringified drafts.
  // historyTick exists only to re-render when canUndo/canRedo change — the
  // stacks themselves live in refs so the wrapped setter can read them
  // synchronously inside the functional updater.
  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])
  const lastPushAtRef = useRef<number>(0)
  const [historyTick, setHistoryTick] = useState(0)
  const HISTORY_MAX = 50
  const COALESCE_MS = 600

  // Wrap setDraft so every user-driven edit also pushes the prior state onto
  // the undo stack (with rapid edits coalesced into a single entry).
  const setDraftWithHistory: React.Dispatch<React.SetStateAction<WorkflowDraft>> = useCallback(
    (updater) => {
      setDraft((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: WorkflowDraft) => WorkflowDraft)(prev)
            : updater
        const prevStr = JSON.stringify(prev)
        const nextStr = JSON.stringify(next)
        if (prevStr === nextStr) return prev
        const now = Date.now()
        const coalesce =
          now - lastPushAtRef.current < COALESCE_MS && undoStackRef.current.length > 0
        if (!coalesce) {
          const trimmed = undoStackRef.current.slice(-(HISTORY_MAX - 1))
          undoStackRef.current = [...trimmed, prevStr]
        }
        lastPushAtRef.current = now
        if (redoStackRef.current.length > 0) redoStackRef.current = []
        setHistoryTick((t) => t + 1)
        return next
      })
    },
    []
  )

  const undo = useCallback(() => {
    const stack = undoStackRef.current
    if (stack.length === 0) return
    setDraft((current) => {
      const prevStr = stack[stack.length - 1]
      undoStackRef.current = stack.slice(0, -1)
      redoStackRef.current = [...redoStackRef.current, JSON.stringify(current)]
      lastPushAtRef.current = 0
      setHistoryTick((t) => t + 1)
      return JSON.parse(prevStr) as WorkflowDraft
    })
  }, [])

  const redo = useCallback(() => {
    const stack = redoStackRef.current
    if (stack.length === 0) return
    setDraft((current) => {
      const nextStr = stack[stack.length - 1]
      redoStackRef.current = stack.slice(0, -1)
      undoStackRef.current = [...undoStackRef.current, JSON.stringify(current)]
      lastPushAtRef.current = 0
      setHistoryTick((t) => t + 1)
      return JSON.parse(nextStr) as WorkflowDraft
    })
  }, [])

  // Recompute on history changes so the buttons enable/disable correctly.
  // `historyTick` is the dependency that triggers re-evaluation; the refs
  // themselves don't notify React when their `.current` mutates.
  const canUndo = useMemo(() => undoStackRef.current.length > 0, [historyTick])
  const canRedo = useMemo(() => redoStackRef.current.length > 0, [historyTick])

  const toolsMap = useMemo(() => new Map(tools.map((t) => [t.name, t])), [tools])

  // Map step name → first error / warning message, used to badge nodes and
  // surface the offending message inline on the diagram. Built once per
  // validation result so the diagram doesn't substring-match step names
  // (which produced false positives when one name was a prefix of another,
  // e.g. `convert` matching `convert_t1`).
  const stepErrorByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of validation.errors) {
      if (e.stepName && !map.has(e.stepName)) map.set(e.stepName, e.message)
    }
    return map
  }, [validation.errors])

  const stepWarnByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const w of validation.warnings) {
      if (w.stepName && !map.has(w.stepName)) map.set(w.stepName, w.message)
    }
    return map
  }, [validation.warnings])

  const errorSteps = useMemo(() => {
    const set = new Set<number>()
    draft.steps.forEach((step, i) => {
      if (stepErrorByName.has(step.name)) set.add(i)
    })
    return set
  }, [draft.steps, stepErrorByName])

  // Non-fatal warnings suppressed when the same step already has a fatal error.
  const warnSteps = useMemo(() => {
    const set = new Set<number>()
    draft.steps.forEach((step, i) => {
      if (errorSteps.has(i)) return
      if (stepWarnByName.has(step.name)) set.add(i)
    })
    return set
  }, [draft.steps, stepWarnByName, errorSteps])

  // Per-step error/warning messages keyed by step index, for inline display
  // on the diagram nodes (PR1 #6).
  const stepIssueByIndex = useMemo(() => {
    const map = new Map<number, { kind: 'error' | 'warning'; message: string }>()
    draft.steps.forEach((step, i) => {
      const err = stepErrorByName.get(step.name)
      if (err) {
        map.set(i, { kind: 'error', message: err })
        return
      }
      const warn = stepWarnByName.get(step.name)
      if (warn) map.set(i, { kind: 'warning', message: warn })
    })
    return map
  }, [draft.steps, stepErrorByName, stepWarnByName])

  // Reset draft / load tools when dialog opens
  useEffect(() => {
    if (!open) {
      setDraft({ ...DEFAULT_DRAFT })
      setSaveError(null)
      setSavedAt(null)
      baselineDraftRef.current = JSON.stringify(DEFAULT_DRAFT)
      undoStackRef.current = []
      redoStackRef.current = []
      lastPushAtRef.current = 0
      setHistoryTick((t) => t + 1)
      return
    }

    electron.ipcRenderer
      .invoke('workflow:list-tools')
      .then((t: ToolDefinition[]) => setTools(t))
      .catch((err) => console.error('[WorkflowDesigner] workflow:list-tools failed:', err))
    electron.ipcRenderer
      .invoke('workflow:list-runnable-tools')
      .then((names: string[]) => setRunnableTools(new Set(names)))
      .catch((err) => {
        console.error('[WorkflowDesigner] workflow:list-runnable-tools failed:', err)
        setRunnableTools(new Set())
      })
    electron.ipcRenderer
      .invoke('workflow:list-heuristics')
      .then((names: string[]) => setHeuristicNames(names))
      .catch((err) => {
        console.error('[WorkflowDesigner] workflow:list-heuristics failed:', err)
        setHeuristicNames([])
      })

    const initialDraft = initialDefinition
      ? definitionToDraft(initialDefinition)
      : { ...DEFAULT_DRAFT }
    setDraft(initialDraft)
    baselineDraftRef.current = JSON.stringify(initialDraft)
    undoStackRef.current = []
    redoStackRef.current = []
    lastPushAtRef.current = 0
    setHistoryTick((t) => t + 1)
  }, [open, initialDefinition])

  // Once tools are loaded, repair any missing block-default bindings on the
  // current draft (e.g. a hidden `config: { ref: "context" }` that was added
  // to the block after this draft was authored). Only fills empty bindings.
  useEffect(() => {
    if (tools.length === 0) return
    if (draft.steps.length === 0) return
    setDraft((prev) => repairBlockDefaults(prev, toolsMap))
  }, [tools.length, toolsMap, draft.steps.length])

  // Live validation — debounced on draft changes.
  // Skip while tools are still loading so we don't flash "unknown tool"
  // errors for a few hundred ms on every open.
  useEffect(() => {
    if (tools.length === 0) return
    const timer = setTimeout(() => {
      setValidation(validateWorkflowDraft(draft, toolsMap, { runnableTools }))
    }, 300)
    return (): void => clearTimeout(timer)
  }, [draft, toolsMap, tools.length, runnableTools])

  // ── Block CRUD ──────────────────────────────────────────────────────

  const handleAddBlock = useCallback(
    (block: WorkflowBlock): void => {
      const wfInputs = Object.fromEntries(
        Object.entries(draft.workflowInputs).map(([k, v]) => [k, { type: v.type }])
      )
      const stepDraft = blockToStepDraft(block, draft.steps.length, draft.steps, toolsMap, wfInputs)

      const toolDef = toolsMap.get(block.tool)
      const newContextFields: Record<string, ContextFieldDraft> = toolDef
        ? blockToContextFields(block, toolDef)
        : {}
      // Headless blocks (no exposed fields and no form component) don't add
      // anything to the wizard form. Skip the section so the user doesn't see
      // a blank step.
      const isHeadless = block.exposedFields.length === 0 && !block.formComponent
      const formSection: FormSectionDraft | null = isHeadless ? null : blockToFormSection(block)

      setDraftWithHistory((prev) => {
        const mergedFields = { ...prev.contextFields }
        for (const [name, field] of Object.entries(newContextFields)) {
          if (!(name in mergedFields)) mergedFields[name] = field
        }

        // For exposed fields that weren't auto-wired to a step output, fall
        // back to binding against the matching context field (user form).
        for (const fieldName of block.exposedFields) {
          const existing = stepDraft.inputs[fieldName]
          if (existing && !existing.value) {
            stepDraft.inputs[fieldName] = { mode: 'ref', value: `context.${fieldName}` }
          }
        }

        return {
          ...prev,
          contextFields: mergedFields,
          sections: formSection ? [...prev.sections, formSection] : prev.sections,
          steps: [...prev.steps, stepDraft]
        }
      })
    },
    [draft, toolsMap, setDraftWithHistory]
  )

  // Look up a palette block by its id and append it as a new step. Used by the
  // diagram view's drag-and-drop handler — the canvas only ships the id across
  // the dataTransfer boundary, so the dialog (which owns the blocks list) does
  // the resolution.
  const handleAddBlockById = useCallback(
    (blockId: string): void => {
      const block = getWorkflowBlocks(toolsMap).find((b) => b.id === blockId)
      if (!block) return
      handleAddBlock(block)
    },
    [toolsMap, handleAddBlock]
  )

  const handleRemoveStep = useCallback(
    (index: number): void => {
      setDraftWithHistory((prev) => ({
        ...prev,
        steps: prev.steps.filter((_, i) => i !== index),
        sections: prev.sections.filter((_, i) => i !== index)
      }))
    },
    [setDraftWithHistory]
  )

  const handleMoveStep = useCallback(
    (index: number, direction: -1 | 1): void => {
      const target = index + direction
      setDraftWithHistory((prev) => {
        const steps = [...prev.steps]
        const sections = [...prev.sections]
        if (target < 0 || target >= steps.length) return prev
        ;[steps[index], steps[target]] = [steps[target], steps[index]]
        if (sections[index] && sections[target]) {
          ;[sections[index], sections[target]] = [sections[target], sections[index]]
        }
        return { ...prev, steps, sections }
      })
    },
    [setDraftWithHistory]
  )

  // ── Save ────────────────────────────────────────────────────────────

  const handleSave = useCallback((): void => {
    setSaveError(null)
    if (!draft.name.trim()) {
      setSaveError("Can't save — workflow needs a name. Add one in the details panel above.")
      return
    }
    if (validation.errors.length > 0) {
      const n = validation.errors.length
      setSaveError(
        `Can't save — ${n} issue${n === 1 ? '' : 's'} in the steps marked red. Open the error panel in the header to review.`
      )
      return
    }
    onSave?.(draftToSchema(draft))
    // Mark the current draft as the new baseline so the dirty indicator
    // clears and the close-confirmation won't trigger on a saved draft.
    baselineDraftRef.current = JSON.stringify(draft)
    setSavedAt(Date.now())
  }, [draft, validation, onSave])

  // Auto-clear the save toast after a few seconds.
  useEffect(() => {
    if (savedAt === null) return
    const t = setTimeout(() => setSavedAt(null), 3000)
    return (): void => clearTimeout(t)
  }, [savedAt])

  // Intercepts every close path (X button, ESC, backdrop). Warns before
  // discarding unsaved changes; on confirm, proceeds with onClose().
  const requestClose = useCallback((): void => {
    if (
      dirty &&
      !window.confirm('You have unsaved changes. Discard them and close the designer?')
    ) {
      return
    }
    onClose()
  }, [dirty, onClose])

  // Global ⌘/Ctrl-Z and ⌘/Ctrl-Shift-Z keybindings, plus Escape to close
  // (routed through requestClose so the dirty-changes guard still runs).
  // We skip when the focus target is an editable element so we don't
  // fight a native text-input undo or block Escape inside form fields.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const inEditable =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (e.key === 'Escape') {
        if (inEditable) return
        e.preventDefault()
        requestClose()
        return
      }
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key !== 'z' && e.key !== 'Z') return
      if (inEditable) return
      e.preventDefault()
      if (e.shiftKey) {
        redo()
      } else {
        undo()
      }
    }
    window.addEventListener('keydown', handler)
    return (): void => window.removeEventListener('keydown', handler)
  }, [open, undo, redo, requestClose])

  if (!open) return null

  return (
    <div
      className="flex flex-col h-full w-full bg-surface"
      role="region"
      aria-label="Workflow Designer"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-5 shrink-0 bg-panel">
        <Flex gap="3" align="center">
          <Button
            variant="ghost"
            color="gray"
            size="2"
            onClick={requestClose}
            aria-label={`Back to ${backTarget}`}
          >
            <ArrowLeftIcon /> Back to {backTarget}
          </Button>
          <div className="w-px h-6 bg-neutral-5" aria-hidden />
          <Flex gap="1" align="center">
            <Heading size="4" weight="bold" className="text-neutral-12">
              Workflow Designer
            </Heading>
            {dirty && (
              <Text
                size="3"
                weight="bold"
                color="amber"
                title="Unsaved changes"
                aria-label="Unsaved changes"
              >
                •
              </Text>
            )}
          </Flex>
          <SegmentedControl.Root
            size="1"
            value={view}
            onValueChange={(v) => setView(v as 'list' | 'diagram')}
          >
            <SegmentedControl.Item value="list">List</SegmentedControl.Item>
            <SegmentedControl.Item value="diagram">Diagram</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>
        <Flex gap="2" align="center">
          {saveError && (
            <Text size="1" color="red">
              {saveError}
            </Text>
          )}
          {savedAt !== null && !saveError && !dirty && (
            <Text size="1" color="green" role="status" aria-live="polite">
              Saved.
            </Text>
          )}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <Popover.Root>
              <Popover.Trigger>
                <Button
                  size="1"
                  variant="soft"
                  color={validation.errors.length > 0 ? 'red' : 'amber'}
                >
                  <ExclamationTriangleIcon />
                  {validation.errors.length > 0
                    ? `${validation.errors.length} error${validation.errors.length !== 1 ? 's' : ''}`
                    : `${validation.warnings.length} warning${validation.warnings.length !== 1 ? 's' : ''}`}
                </Button>
              </Popover.Trigger>
              <Popover.Content size="1" maxWidth="480px">
                <Flex direction="column" gap="2">
                  {validation.errors.length > 0 && (
                    <Flex direction="column" gap="1">
                      <Text size="1" weight="bold" color="red">
                        Errors
                      </Text>
                      {validation.errors.map((e, i) => (
                        <Flex key={`e-${i}`} gap="2" align="start">
                          {e.stepName && (
                            <Badge size="1" color="red" variant="soft">
                              {e.stepName}
                            </Badge>
                          )}
                          <Text size="1">{e.message}</Text>
                        </Flex>
                      ))}
                    </Flex>
                  )}
                  {validation.warnings.length > 0 && (
                    <Flex direction="column" gap="1">
                      <Text size="1" weight="bold" color="amber">
                        Warnings
                      </Text>
                      {validation.warnings.map((w, i) => (
                        <Flex key={`w-${i}`} gap="2" align="start">
                          {w.stepName && (
                            <Badge size="1" color="amber" variant="soft">
                              {w.stepName}
                            </Badge>
                          )}
                          <Text size="1">{w.message}</Text>
                        </Flex>
                      ))}
                    </Flex>
                  )}
                </Flex>
              </Popover.Content>
            </Popover.Root>
          )}
          <Button
            variant="ghost"
            color="gray"
            size="2"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (⌘Z)"
          >
            <ResetIcon />
          </Button>
          <Button
            variant="ghost"
            color="gray"
            size="2"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (⌘⇧Z)"
          >
            <ReloadIcon />
          </Button>
          <Button variant="soft" size="2" onClick={handleSave}>
            Save workflow
          </Button>
        </Flex>
      </header>

      {/* Body — list and diagram views share the same bottom palette dock so
          toggling between views doesn't shift the layout. The dock is owned
          here (not by either child) so its position and height stay constant
          across the view switch. */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex">
          {view === 'list' ? (
            <ContextSpineDesigner
              draft={draft}
              setDraft={setDraftWithHistory}
              tools={toolsMap}
              validation={validation}
              runnableTools={runnableTools}
              heuristicNames={heuristicNames}
              onRemoveStep={handleRemoveStep}
              onMoveStep={handleMoveStep}
              onSave={handleSave}
              onOpenGallery={onOpenGallery}
            />
          ) : (
            <WorkflowDiagramView
              draft={draft}
              setDraft={setDraftWithHistory}
              tools={toolsMap}
              selectedStep={selectedStep}
              onSelectStep={setSelectedStep}
              onRemoveStep={handleRemoveStep}
              onMoveStep={handleMoveStep}
              errorSteps={errorSteps}
              warnSteps={warnSteps}
              stepIssueByIndex={stepIssueByIndex}
              onOpenGallery={onOpenGallery}
              onAddBlockById={handleAddBlockById}
              onSwitchToListView={(): void => setView('list')}
              runnableTools={runnableTools}
            />
          )}
        </div>
        <div className="border-t border-neutral-5 bg-[var(--gray-2)] px-3 py-2 max-h-72 overflow-y-auto shrink-0">
          <BlockPalette
            onAddBlock={handleAddBlock}
            tools={toolsMap}
            runnableTools={runnableTools}
            lastStepTool={
              draft.steps.length > 0 ? draft.steps[draft.steps.length - 1].tool : undefined
            }
          />
        </div>
      </div>
    </div>
  )
}

// Silence unused-variable lint warnings for StepDraft re-export
// (kept to maintain import symmetry with other designer modules)
export type { StepDraft }
